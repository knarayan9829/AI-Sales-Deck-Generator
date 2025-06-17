// server/routes/decks.js

const express   = require("express");
const path      = require("path");
const fs        = require("fs");
const pdfParse  = require("pdf-parse");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const File      = require("../models/File");
const Deck      = require("../models/Deck");
const openai    = require("../utils/openai-wrapper");
const localModel = require("../utils/ai-service-client");
const dataExtractor = require("../utils/data-extractor");

const router = express.Router();

// Ensure /decks directory exists
const decksDir = path.join(__dirname, "../decks");
if (!fs.existsSync(decksDir)) {
  fs.mkdirSync(decksDir, { recursive: true });
}

// ─── Utility: slugify brand name into URL-friendly string ─────────────────
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Utility: extract text from a File document (PDF/TXT/MD) ───────────────
async function extractTextFromFile(fileDoc) {
  const onDisk = decodeURIComponent(fileDoc.url.replace("/uploads/", ""));
  const diskPath = path.join(__dirname, "../uploads", onDisk);
  const ext = path.extname(diskPath).toLowerCase();

  if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(diskPath);
    const parsed = await pdfParse(dataBuffer);
    return parsed.text; // Entire PDF as one big string
  } else if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(diskPath, "utf-8");
  } else {
    // Other file types: no text
    return "";
  }
}

// ─── Utility: break a long string into ~2,000-character chunks ──────────────
function chunkString(str, chunkSize = 2000) {
  const chunks = [];
  let i = 0;
  while (i < str.length) {
    chunks.push(str.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return chunks;
}

// ─── Utility: Merge individual chunk-summaries into a master summary ───────
async function mergeSummaries(summaries) {
  // "summaries" is an array of short strings. Merge into one "master summary."
  const prompt = `
You have been given a list of brief summaries about a single brand's documents.
Your job is to combine these into one cohesive, concise master summary (approx. 200-300 words).
Here are the chunk summaries, in order:

${summaries.map((s, i) => `Chunk ${i + 1}:\n${s}`).join("\n\n")}

Please return just the combined summary (no bullet lists, no JSON).
  `.trim();

  const merged = await openai.generateText(prompt);
  return merged.trim();
}

// ─── Utility: ask ChatGPT to summarize one chunk of text ────────────────────
async function summarizeChunk(chunkText) {
  const prompt = `
You are an AI assistant helping to summarize a document. Please read the text below
and produce a concise paragraph (around 100–150 words) capturing its main points:

"""${chunkText}"""
  `.trim();

  const summary = await openai.generateText(prompt);
  return summary.trim();
}

// ─── Utility: ask ChatGPT for comprehensive competitor analysis ─────────────
async function getCompetitorAnalysis(combinedText, brandName) {
  console.log("🏆 ========= COMPETITOR ANALYSIS PHASE =========");
  console.log(`🔍 Analyzing competitors for: ${brandName}`);
  console.log(`📄 Document text length: ${combinedText.length} characters`);
  
  // Use full document text instead of summaries for comprehensive analysis
  const prompt = `
You are a competitive intelligence analyst. Analyze the complete document content below to identify competitors and provide competitive positioning analysis for ${brandName}.

DOCUMENT CONTENT:
${combinedText}

TASK: Provide a comprehensive competitor analysis including:
1. Identify all direct and indirect competitors mentioned or implied
2. Analyze competitive strengths and weaknesses
3. Market positioning comparison
4. Competitive advantages of ${brandName}
5. Market threats and opportunities
6. Competitive metrics and benchmarks (if available)

Return your analysis in the following JSON format:
{
  "competitors": [
    {
      "name": "Competitor Name",
      "type": "direct|indirect",
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1", "weakness2"],
      "marketPosition": "description of their market position",
      "comparisonMetrics": {
        "marketShare": "percentage or description",
        "revenue": "amount or description", 
        "customers": "number or description"
      }
    }
  ],
  "brandPositioning": {
    "competitiveAdvantages": ["advantage1", "advantage2"],
    "marketPosition": "description of brand's position",
    "differentiators": ["differentiator1", "differentiator2"],
    "competitiveThreats": ["threat1", "threat2"],
    "marketOpportunities": ["opportunity1", "opportunity2"]
  },
  "marketLandscape": {
    "industrySize": "market size if mentioned",
    "growthRate": "growth rate if mentioned",
    "keyTrends": ["trend1", "trend2"],
    "competitiveIntensity": "high|medium|low"
  },
  "recommendations": [
    "Strategic recommendation 1",
    "Strategic recommendation 2",
    "Strategic recommendation 3"
  ]
}

Only return valid JSON. Base analysis strictly on information provided in the documents.
  `.trim();

  try {
    console.log("📤 Sending competitor analysis prompt to OpenAI...");
    const responseRaw = await openai.generateText(prompt);
    console.log("📥 Received competitor analysis response");
    
    // Remove any code fences if ChatGPT responded with triple backticks
    const cleaned = responseRaw
      .replace(/```json\s*/g, "")
      .replace(/```/g, "")
      .trim();

    const competitorAnalysis = JSON.parse(cleaned);
    
    console.log("✅ Competitor analysis parsed successfully");
    console.log(`🏆 Competitors identified: ${competitorAnalysis.competitors?.length || 0}`);
    console.log(`🎯 Competitive advantages: ${competitorAnalysis.brandPositioning?.competitiveAdvantages?.length || 0}`);
    console.log("===============================================");
    
    return competitorAnalysis;
  } catch (err) {
    console.error("❌ Failed to parse competitor analysis JSON:", err);
    console.error("Response:", responseRaw?.substring(0, 500));
    
    // Return fallback analysis structure
    return {
      competitors: [],
      brandPositioning: {
        competitiveAdvantages: ["Innovative solutions", "Strong market presence"],
        marketPosition: "Well-positioned in the market based on available data",
        differentiators: ["Unique value proposition", "Customer-focused approach"],
        competitiveThreats: ["Market competition", "Industry changes"],
        marketOpportunities: ["Market expansion", "Technology advancement"]
      },
      marketLandscape: {
        industrySize: "Information not available in documents",
        growthRate: "Information not available in documents", 
        keyTrends: ["Digital transformation", "Market evolution"],
        competitiveIntensity: "medium"
      },
      recommendations: [
        "Leverage identified competitive advantages",
        "Monitor competitor activities closely",
        "Focus on differentiation strategies"
      ]
    };
  }
}

// ─── Utility: Convert hex color to "rgba(r,g,b,alpha)" ────────────────────
function hexToRgba(hex, alpha = 1) {
  const cleaned = hex.replace(/^#/, "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Utility: Determine contrasting text color for a given hex ──────────────
function getContrastingTextColor(hex) {
  const cleaned = hex.replace(/^#/, "");
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;
  const srgb = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const L = 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  return L > 0.5 ? "#000000" : "#ffffff";
}

// ─── Utility: Convert hex to HSL { h, s, l } ───────────────────────────────
function hexToHsl(hex) {
  const cleaned = hex.replace(/^#/, "");
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// ─── Utility: Convert HSL + alpha back to CSS rgba() ────────────────────────
function hslToRgba(h, s, l, alpha = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

// ─── Revised renderChart: generate a small palette from primaryColor ───────
async function renderChart(instr, outputPath, primaryColorHex) {
  const width = 800;
  const height = 400;
  const chart = new ChartJSNodeCanvas({ width, height });

  // 1) Convert primary hex into HSL
  const { h, s, l } = hexToHsl(primaryColorHex);

  // 2) Determine how many distinct colors we need
  const count = Array.isArray(instr.values) ? instr.values.length : 1;
  const backgroundColors = [];
  const borderColors = [];

  // If it's a pie chart, give each slice its own hue shift
  // Otherwise (bar/line) vary lightness for each bar/point
  if (instr.type === "pie") {
    // Spread hues around 360 degrees (keeping saturation/lightness roughly same)
    for (let i = 0; i < count; i++) {
      const hueShift = (h + (i * 360) / count) % 360;
      backgroundColors.push(hslToRgba(hueShift, s, l - 10, 0.6));
      borderColors.push(hslToRgba(hueShift, s, l, 1));
    }
  } else {
    // For bar/line: keep same hue/sat, but vary lightness downwards
    // e.g., if l=50, and count=4, make shades: 60, 55, 50, 45 (clamped)
    const maxLight = Math.min(l + 10, 90);
    const minLight = Math.max(l - 20, 10);
    const step = count > 1 ? (maxLight - minLight) / (count - 1) : 0;

    for (let i = 0; i < count; i++) {
      const currL = Math.round(maxLight - step * i);
      backgroundColors.push(hslToRgba(h, s, currL - 5, 0.6));
      borderColors.push(hslToRgba(h, s, currL, 1));
    }
  }

  // 3) Build Chart.js configuration
  const configuration = {
    type: instr.type,
    data: {
      labels: instr.labels,
      datasets: [
        {
          label: instr.title,
          data: instr.values,
          fill: instr.type === "line" ? false : true,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: instr.title,
          font: { size: 18 },
        },
        legend: {
          display: instr.type === "pie", // show legend for pie charts
        },
      },
      scales: instr.type === "pie" ? {} : {
        x: { display: true, title: { display: true } },
        y: { display: true, title: { display: true } },
      },
    },
  };

  // 4) Render and write PNG
  const imageBuffer = await chart.renderToBuffer(configuration);
  fs.writeFileSync(outputPath, imageBuffer);
}

// ─── Utility: ask ChatGPT for a long description ────────────────────────────
async function getLongDescription(brandName, shortDesc, combinedText) {
  const chunks = chunkString(combinedText, 2000);
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const sum = await summarizeChunk(chunks[i]);
    chunkSummaries.push(sum);
  }
  const masterSummary = await mergeSummaries(chunkSummaries);

  const prompt = `
Create a concise brand overview for ${brandName}. Write a professional 1-2 paragraph summary that highlights what the company does, key strengths, and market position. 

Brand: ${brandName}
Context: ${shortDesc}
Summary: ${masterSummary}

Be direct and engaging. Do NOT include any formatting markers, labels, or prefixes like "Long Description:" or "**". Start directly with the content.
  `.trim();

  let response = (await openai.generateText(prompt)).trim();
  
  // Clean up any unwanted formatting markers
  response = response.replace(/^\*\*[^*]+\*\*:?\s*/i, '');
  response = response.replace(/^[^:]+:\s*/i, '');
  response = response.replace(/^\*+\s*/gm, '');
  
  return response;
}

// ─── Utility: ask ChatGPT for two extra sections ────────────────────────────
async function getExtraSections(combinedText) {
  const chunks = chunkString(combinedText, 2000);
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const sum = await summarizeChunk(chunks[i]);
    chunkSummaries.push(sum);
  }
  const masterSummary = await mergeSummaries(chunkSummaries);

  const prompt = `
You are an AI assistant creating a sales deck. Given the concise summary of documents below, identify two additional sections (beyond description, videos, figures, documents) that would best highlight the brand's strengths or insights. For each section, output exactly one JSON object with:

{
  "heading": "<Section Heading>",
  "content": "<Paragraph of ~100–150 words>"
}

Return an array of exactly two such objects in valid JSON. No extra commentary.

Concise Summary of All Documents:
${masterSummary}
  `.trim();

  const response = await openai.generateText(prompt);
  const cleaned = response.replace(/```json\s*/g, "").replace(/```/g, "").trim();

  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr) && arr.length >= 2) {
      return arr.slice(0, 2);
    }
  } catch (err) {
    console.error("Failed to parse extra sections JSON:", err, "\nCleaned response:", cleaned);
  }
  return [
    { heading: "Additional Insight 1", content: "No additional content available." },
    { heading: "Additional Insight 2", content: "No additional content available." },
  ];
}

// ─── POST /api/decks ─────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      brandName,
      shortDescription,
      primaryColor,
      secondaryColor,
      logoFileId,
      videoFileIds = [],
      documentFileIds = [],
      hasSensitiveFiles = false, // Frontend optimization hint
    } = req.body;

    // 1) Fetch and validate logo
    const logoDoc = await File.findById(logoFileId);
    if (!logoDoc) {
      return res.status(400).json({ error: "Invalid logoFileId." });
    }

    // 2) Separate sensitive and non-sensitive documents, process accordingly
    let combinedText = "";
    let sensitiveAnalysisResults = [];
    let localPlotData = [];
    
    // Optimization: If frontend indicates no sensitive files, skip the expensive checks
    if (!hasSensitiveFiles && documentFileIds.length > 0) {
      console.log("🚀 Fast path: No sensitive files detected, using OpenAI only");
      // Fast path: process all documents with OpenAI
      for (const docId of documentFileIds) {
        const fileDoc = await File.findById(docId);
        if (!fileDoc) continue;
        const txt = await extractTextFromFile(fileDoc);
        combinedText += "\n\n" + txt;
      }
    } else {
      // Standard path: check each document for sensitivity
      console.log("🔍 Standard path: Checking documents for sensitivity");
      for (const docId of documentFileIds) {
        const fileDoc = await File.findById(docId);
        if (!fileDoc) continue;
        
        const txt = await extractTextFromFile(fileDoc);
        
        if (fileDoc.sensitive) {
          // Process sensitive documents locally without OpenAI API
          console.log(`🔒 Processing sensitive document: ${fileDoc.name}`);
          const localAnalysis = await localModel.processSensitiveDocument(txt);
          sensitiveAnalysisResults.push({
            fileName: fileDoc.name,
            analysis: localAnalysis
          });
          localPlotData.push(...localAnalysis.plotData);
          
          // Add sanitized summary to combined text for overall context
          combinedText += "\n\n[SENSITIVE DOCUMENT SUMMARY]: " + localAnalysis.summary;
        } else {
          // Non-sensitive documents can be processed normally with OpenAI
          combinedText += "\n\n" + txt;
        }
      }
    }

    // 3) Extract real data tables and generate chart configurations
    let chartConfigs = [];
    let chartStructure = null; // Declare at higher scope
    let extractedDataSummary = { tables: [], keyMetrics: [], timeSeriesData: [] };
    
    // Add local plot data from sensitive documents (if any)
    if (localPlotData.length > 0) {
      console.log(`📊 Adding ${localPlotData.length} charts from local AI processing`);
      chartConfigs.push(...localPlotData);
    }
    
    // Extract real data from documents instead of generating fake charts
    if (combinedText.trim().length > 0) {
      console.log("\n📈 ========= DATA EXTRACTION PHASE =========");
      console.log(`📄 Combined text length: ${combinedText.length} characters`);
      console.log(`🔍 Text preview: ${combinedText.substring(0, 300)}...`);
      console.log("===============================================");
      
      try {
        const extractedData = await dataExtractor.extractDataTables(combinedText, brandName);
        extractedDataSummary = extractedData;
        
        console.log("\n📊 ========= DATA EXTRACTION RESULTS =========");
        console.log(`✅ Tables found: ${extractedData.tables.length}`);
        console.log(`✅ Metrics found: ${extractedData.keyMetrics.length}`);
        console.log(`✅ Time series found: ${extractedData.timeSeriesData.length}`);
        
        if (extractedData.tables.length > 0) {
          console.log("📋 Table details:");
          extractedData.tables.forEach((table, i) => {
            console.log(`  ${i + 1}. ${table.title} (${table.headers.length} cols, ${table.rows.length} rows)`);
          });
        }
        
        if (extractedData.keyMetrics.length > 0) {
          console.log("📊 Metrics details:");
          extractedData.keyMetrics.forEach((metric, i) => {
            console.log(`  ${i + 1}. ${metric.name}: ${metric.value}${metric.unit || ''}`);
          });
        }
        
        // Generate chart configurations for React frontend
        console.log("\n🎨 ========= CHART GENERATION PHASE =========");
        chartStructure = await dataExtractor.generateChartConfigs(extractedData, primaryColor, brandName);
        
        // Extract charts from the structured result
        const allCharts = [
          ...(chartStructure.topCharts || []),
          ...(chartStructure.additionalCharts || [])
        ];
        chartConfigs.push(...allCharts);
        
        console.log(`📊 Chart configurations generated: ${allCharts.length}`);
        console.log(`📊 Top priority charts: ${chartStructure.topCharts?.length || 0}`);
        console.log(`📊 Additional charts: ${chartStructure.additionalCharts?.length || 0}`);
        allCharts.forEach((chart, i) => {
          console.log(`  ${i + 1}. ${chart.title} (${chart.type})`);
        });
        console.log("===============================================\n");
        
      } catch (error) {
        console.error("\n❌ ========= DATA EXTRACTION ERROR =========");
        console.error("Error details:", error);
        console.error("Stack trace:", error.stack);
        console.error("==========================================\n");
      }
    } else {
      console.log("\n⚠️ ========= NO TEXT TO PROCESS =========");
      console.log("Combined text is empty - no documents to analyze");
      console.log("=======================================\n");
    }
    
    console.log(`⏱️ Total chart configurations: ${chartConfigs.length} charts ready for React frontend`);

    // 4) Get competitor analysis using full document text
    let competitorAnalysis = null;
    if (combinedText.trim().length > 0) {
      console.log("\n🏆 ========= COMPETITOR ANALYSIS PHASE =========");
      try {
        competitorAnalysis = await getCompetitorAnalysis(combinedText, brandName);
        console.log(`✅ Competitor analysis completed successfully`);
        console.log(`🏆 Competitors identified: ${competitorAnalysis.competitors?.length || 0}`);
        console.log(`🎯 Competitive advantages: ${competitorAnalysis.brandPositioning?.competitiveAdvantages?.length || 0}`);
      } catch (error) {
        console.error("❌ Error in competitor analysis:", error);
        competitorAnalysis = null;
      }
      console.log("===============================================\n");
    }

    // 5) No more server-side chart rendering - send chart configs to React frontend
    console.log("📦 Preparing chart configurations for React frontend...");

    // Create slug for file naming (still needed for HTML file)
    const deckSlug = slugify(brandName);

    // 6) Get long description (also chunk+summarize internally)
    const longDesc = await getLongDescription(brandName, shortDescription, combinedText);

    // 7) Get two extra sections (also chunk+summarize internally)
    const extraSecs = await getExtraSections(combinedText);

    // 7) Build two-column HTML layout (sidebar on the right, main content on the left)
    const defaultTextColor = getContrastingTextColor(primaryColor);
    const logoSrc = `../uploads/${decodeURIComponent(logoDoc.url.replace("/uploads/", ""))}`;

    // LEFT column HTML (content sections)
    let leftHtml = "";

    // Section 1: Brand Overview
    leftHtml += `
      <section style="margin-bottom: 2rem;">
        <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">Brand Overview</h2>
        <p>${longDesc}</p>
      </section>
    `;

    // Section 2: Brand Videos
    if (videoFileIds.length > 0) {
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">Brand Videos</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
      `;
      for (const vidId of videoFileIds) {
        const vidDoc = await File.findById(vidId);
        if (!vidDoc) continue;
        const vidSrc = `../uploads/${decodeURIComponent(vidDoc.url.replace("/uploads/", ""))}`;
        leftHtml += `
            <video width="320" height="240" controls style="border:1px solid #ddd; border-radius:4px;">
              <source src="${vidSrc}" type="${vidDoc.mimeType}" />
              Your browser does not support the video tag.
            </video>
        `;
      }
      leftHtml += `
          </div>
        </section>
      `;
    }

    // Section 3: Data Visualizations (Interactive Charts with Chart.js)
    const chartsToDisplay = chartConfigs.slice(0, 5) || [];
    const additionalCharts = chartConfigs.slice(5) || [];
    const hasMoreCharts = additionalCharts.length > 0;
    
    if (chartsToDisplay.length > 0) {
      console.log(`📊 Generating modern HTML charts section with ${chartsToDisplay.length} priority charts`);
      leftHtml += `
        <section style="margin-bottom: 3rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="color: ${primaryColor}; margin: 0; font-size: 1.75rem; font-weight: 600;">Data Analytics Dashboard</h2>
            <span style="background: ${primaryColor}; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500;">
              ${chartsToDisplay.length} Priority Insights
            </span>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      `;

      // Generate interactive Chart.js visualizations
      let chartIndex = 0;
      for (const chart of chartsToDisplay) {
        const chartId = `chart_${chartIndex}`;
        console.log(`📈 Rendering interactive chart: ${chart.title} (${chart.type})`);
        
        // Get chart type badge info - simplified to bar and pie only
        const chartBadges = {
          'bar': { color: '#6366F1', text: 'Comparison' },
          'pie': { color: '#8B5CF6', text: 'Distribution' },
          'metrics': { color: '#F59E0B', text: 'KPI Dashboard' }
        };
        const badge = chartBadges[chart.type] || { color: '#6B7280', text: 'Analysis' };
        
        leftHtml += `
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative;">
            <!-- Chart Type Badge -->
            <div style="position: absolute; top: 1rem; right: 1rem; background: ${badge.color}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">
              ${badge.text}
            </div>
            
            <!-- Chart Title -->
            <h3 style="color: ${primaryColor}; margin: 0 0 1rem 0; font-size: 1.25rem; font-weight: 600; padding-right: 6rem;">
              ${chart.title}
            </h3>
            
            <!-- Chart Container -->
            <div style="height: ${chart.type === 'metrics' ? 'auto' : '400px'}; min-height: ${chart.type === 'metrics' ? '300px' : '400px'}; margin-bottom: 1rem;">
              ${chart.type === 'metrics' ? `
                <div style="
                  display: grid; 
                  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                  gap: 1.5rem; 
                  padding: 1rem;
                  align-items: stretch;
                ">
                  ${chart.data.slice(0, 6).map((metric, index) => {
                    // Format the unit display with clearer descriptions
                    let unitDisplay = '';
                    if (metric.unit) {
                      const unit = metric.unit.toLowerCase();
                      if (unit.includes('%') || unit.includes('percent')) {
                        unitDisplay = 'Percentage (%)';
                      } else if (unit.includes('million') && unit.includes('usd')) {
                        unitDisplay = 'Millions USD ($M)';
                      } else if (unit.includes('billion') && unit.includes('usd')) {
                        unitDisplay = 'Billions USD ($B)';  
                      } else if (unit.includes('million')) {
                        unitDisplay = 'Millions (M)';
                      } else if (unit.includes('billion')) {
                        unitDisplay = 'Billions (B)';
                      } else if (unit === '$' || unit.includes('usd')) {
                        unitDisplay = 'US Dollars ($)';
                      } else if (unit.includes('thousand')) {
                        unitDisplay = 'Thousands (K)';
                      } else if (unit.includes('growth') || unit.includes('change')) {
                        unitDisplay = 'Growth Rate (%)';
                      } else {
                        // Capitalize and clean up the unit
                        unitDisplay = metric.unit.charAt(0).toUpperCase() + metric.unit.slice(1);
                      }
                    }
                    
                    // Color scheme for different metrics
                    const colors = [
                      { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                      { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
                      { bg: '#dcfce7', border: '#10b981', text: '#065f46' },
                      { bg: '#f3e8ff', border: '#8b5cf6', text: '#5b21b6' },
                      { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
                      { bg: '#f0f9ff', border: '#0ea5e9', text: '#0c4a6e' }
                    ];
                    const colorScheme = colors[index % colors.length];
                    
                    return `
                    <div style="
                      background: linear-gradient(135deg, ${colorScheme.bg} 0%, white 100%);
                      padding: 1.5rem;
                      border-radius: 12px;
                      text-align: center;
                      border: 2px solid ${colorScheme.border};
                      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                      min-height: auto;
                      height: auto;
                      display: flex;
                      flex-direction: column;
                      justify-content: space-between;
                      position: relative;
                      overflow: visible;
                      word-wrap: break-word;
                      box-sizing: border-box;
                    ">
                      <!-- Decorative icon based on metric type -->
                      <div style="
                        position: absolute;
                        top: 0.75rem;
                        right: 0.75rem;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: ${colorScheme.border};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 0.65rem;
                        font-weight: bold;
                        z-index: 1;
                      ">
                        ${metric.name.toLowerCase().includes('revenue') ? '$' : 
                          metric.name.toLowerCase().includes('growth') ? '↗' :
                          metric.name.toLowerCase().includes('volume') ? '📊' :
                          metric.name.toLowerCase().includes('income') ? '💰' : '📈'}
                      </div>
                      
                      <!-- Main value -->
                      <div style="
                        font-size: 2rem;
                        font-weight: 800;
                        color: ${primaryColor};
                        margin-bottom: 0.75rem;
                        margin-top: 0.5rem;
                        line-height: 1.1;
                        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        word-break: break-word;
                      ">
                        ${metric.value}${metric.unit}
                      </div>
                      
                      <!-- Metric name -->
                      <div style="
                        font-size: 0.85rem;
                        color: ${colorScheme.text};
                        font-weight: 600;
                        margin-bottom: 0.75rem;
                        line-height: 1.3;
                        word-wrap: break-word;
                        hyphens: auto;
                        padding: 0 0.25rem;
                      ">
                        ${metric.name}
                      </div>
                      
                      <!-- Unit display -->
                      ${unitDisplay ? `
                        <div style="
                          background: rgba(255,255,255,0.9);
                          color: ${colorScheme.text};
                          font-size: 0.7rem;
                          font-weight: 500;
                          padding: 0.3rem 0.6rem;
                          border-radius: 15px;
                          margin: 0 auto 0.5rem auto;
                          border: 1px solid ${colorScheme.border}40;
                          display: inline-block;
                          max-width: 90%;
                          text-align: center;
                        ">
                          ${unitDisplay}
                        </div>
                      ` : ''}
                      
                      <!-- Trend indicator -->
                      ${metric.trend ? `
                        <div style="
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          font-size: 0.75rem;
                          font-weight: 600;
                          color: ${metric.trend === 'up' ? '#059669' : metric.trend === 'down' ? '#dc2626' : '#6b7280'};
                          background: ${metric.trend === 'up' ? '#d1fae5' : metric.trend === 'down' ? '#fee2e2' : '#f3f4f6'};
                          padding: 0.4rem 0.8rem;
                          border-radius: 15px;
                          margin-top: auto;
                          max-width: 100%;
                          box-sizing: border-box;
                        ">
                          <span style="margin-right: 0.25rem; font-size: 0.9rem;">
                            ${metric.trend === 'up' ? '📈' : metric.trend === 'down' ? '📉' : '➡️'}
                          </span>
                          ${metric.trend.charAt(0).toUpperCase() + metric.trend.slice(1)} Trend
                        </div>
                      ` : ''}
                    </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <canvas id="${chartId}" style="max-height: 100%; max-width: 100%;"></canvas>
              `}
            </div>
            
            <!-- Chart Metadata -->
            ${chart.metadata && chart.metadata.unit ? `
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
                <span style="background: #dcfce7; color: #16a34a; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 500;">
                  📊 ${formatUnitForDisplay(chart.metadata.unit)}
                </span>
              </div>
            ` : ''}
          </div>
        `;
        
        // Store chart data for JavaScript rendering
        chartIndex++;
      }

      leftHtml += `
          </div>
          

          
          <div style="margin-top: 2rem; padding: 1rem; background: linear-gradient(to right, #f0f9ff, #e0f2fe); border-radius: 8px; border-left: 4px solid ${primaryColor};">
            <p style="margin: 0; font-size: 0.875rem; color: #0369a1;">
              <strong>Interactive Analytics:</strong> These charts are powered by Chart.js and provide interactive tooltips and data exploration. 
              For the complete analytics experience with advanced filtering and drill-down capabilities, visit the React dashboard.
            </p>
          </div>
        </section>
      `;
    } else {
      console.log('⚠️ No charts generated - extractedData may be empty');
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; font-size: 1.75rem; font-weight: 600;">Data Analytics Dashboard</h2>
          <div style="padding: 3rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; text-align: center; border: 2px dashed #cbd5e1; margin-top: 1.5rem;">
            <div style="width: 80px; height: 80px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 2rem;">
              📊
            </div>
            <h3 style="color: #475569; margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 600;">
              No Data Visualizations Available
            </h3>
            <p style="color: #64748b; margin: 0; font-size: 0.875rem; max-width: 400px; margin: 0 auto;">
              No extractable data found in uploaded documents. Try uploading documents with tables, metrics, or numerical data for automatic chart generation.
            </p>
          </div>
        </section>
      `;
    }

    // Section 4: Brand Documents
    if (documentFileIds.length > 0) {
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">Brand Documents</h2>
          <ul style="list-style: disc; padding-left: 1.5rem;">
      `;
      for (const docId of documentFileIds) {
        const docFile = await File.findById(docId);
        if (!docFile) continue;
        const docHref = `../uploads/${decodeURIComponent(docFile.url.replace("/uploads/", ""))}`;
        leftHtml += `
            <li>
              <a href="${docHref}" style="color: ${primaryColor}; text-decoration: none;" download>
                ${docFile.name}
              </a>
            </li>
        `;
      }
      leftHtml += `
          </ul>
        </section>
      `;
    }

    // Section 5: Processing Summary
    const processingInfo = {
      totalDocs: documentFileIds.length,
      sensitiveDocs: sensitiveAnalysisResults.length,
      regularDocs: documentFileIds.length - sensitiveAnalysisResults.length,
      fastPath: !hasSensitiveFiles && documentFileIds.length > 0
    };

    if (processingInfo.totalDocs > 0) {
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">
            ${processingInfo.sensitiveDocs > 0 ? '🔒 Hybrid AI Processing' : '🌐 AI Processing'}
          </h2>
          <div style="background-color: ${processingInfo.sensitiveDocs > 0 ? '#f0f8ff' : '#f8fff0'}; padding: 1rem; border-radius: 6px; border-left: 4px solid ${primaryColor};">
      `;

      if (processingInfo.fastPath) {
        leftHtml += `
            <p style="margin: 0 0 1rem 0; font-weight: bold;">
              ⚡ Fast Processing: ${processingInfo.totalDocs} document(s) processed via OpenAI API
            </p>
            <small style="color: #666;">Optimized processing path - no sensitive documents detected</small>
        `;
      } else if (processingInfo.sensitiveDocs > 0) {
        leftHtml += `
            <p style="margin: 0 0 1rem 0; font-weight: bold;">
              🔒 ${processingInfo.sensitiveDocs} sensitive document(s) processed locally
              <br>🌐 ${processingInfo.regularDocs} document(s) processed via OpenAI API
            </p>
        `;
        
        for (const result of sensitiveAnalysisResults) {
          const insights = localModel.generateLocalInsights(result.analysis);
          leftHtml += `
              <div style="margin-bottom: 1rem; padding: 0.5rem; background-color: white; border-radius: 4px;">
                <strong>${result.fileName}</strong><br/>
                <small style="color: #666;">Processed locally with Llama-3.1-8B (no external API access)</small><br/>
                <p style="margin: 0.5rem 0 0 0;">${insights}</p>
              </div>
          `;
        }
      } else {
        leftHtml += `
            <p style="margin: 0 0 1rem 0; font-weight: bold;">
              🌐 ${processingInfo.totalDocs} document(s) processed via OpenAI API
            </p>
            <small style="color: #666;">All documents processed using cloud AI for optimal speed</small>
        `;
      }
      
      leftHtml += `
          </div>
        </section>
      `;
    }

    // Section 6: Competitor Analysis
    if (competitorAnalysis && (competitorAnalysis.competitors.length > 0 || competitorAnalysis.brandPositioning)) {
      leftHtml += `
        <section style="margin-bottom: 3rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; font-size: 1.75rem; font-weight: 600;">Competitive Intelligence Analysis</h2>
      `;

      // Brand Positioning
      if (competitorAnalysis.brandPositioning) {
        const bp = competitorAnalysis.brandPositioning;
        leftHtml += `
          <div style="background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08); padding: 2rem; border-radius: 12px; margin: 1.5rem 0; border-left: 4px solid ${primaryColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <h3 style="color: ${primaryColor}; margin-top: 0; font-size: 1.3rem; font-weight: 600;">${brandName} Market Position</h3>
            <p style="margin-bottom: 1.5rem; color: #374151; line-height: 1.6;"><strong>Strategic Position:</strong> ${bp.marketPosition || 'Market position analysis based on available data'}</p>
        `;
        
        if (bp.competitiveAdvantages && bp.competitiveAdvantages.length > 0) {
          leftHtml += `
            <div style="margin-bottom: 1.5rem;">
              <h4 style="color: ${primaryColor}; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;">Competitive Advantages</h4>
              <ul style="margin: 0; padding-left: 1.5rem; color: #374151;">
                ${bp.competitiveAdvantages.map(adv => `<li style="margin-bottom: 0.5rem;">${adv}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        if (bp.differentiators && bp.differentiators.length > 0) {
          leftHtml += `
            <div style="margin-bottom: 1rem;">
              <h4 style="color: ${primaryColor}; font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem;">Key Differentiators</h4>
              <ul style="margin: 0; padding-left: 1.5rem; color: #374151;">
                ${bp.differentiators.map(diff => `<li style="margin-bottom: 0.5rem;">${diff}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        leftHtml += `</div>`;
      }

      // Competitors List
      if (competitorAnalysis.competitors && competitorAnalysis.competitors.length > 0) {
        leftHtml += `
          <div style="margin-bottom: 2rem;">
            <h3 style="color: ${primaryColor}; font-size: 1.3rem; font-weight: 600; margin-bottom: 1rem;">Competitive Landscape</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
        `;

        for (const competitor of competitorAnalysis.competitors.slice(0, 6)) {
          const typeColor = competitor.type === 'direct' ? '#dc3545' : '#6f42c1';
          leftHtml += `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h4 style="margin: 0; color: ${primaryColor}; font-size: 1.1rem; font-weight: 600;">${competitor.name}</h4>
                <span style="background: ${typeColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500;">
                  ${competitor.type.toUpperCase()}
                </span>
              </div>
              <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #6b7280; line-height: 1.5;">${competitor.marketPosition || 'Market position analysis'}</p>
          `;

          if (competitor.strengths && competitor.strengths.length > 0) {
            leftHtml += `
              <div style="margin-bottom: 1rem;">
                <h5 style="font-size: 0.85rem; color: #059669; font-weight: 600; margin-bottom: 0.5rem;">Strengths</h5>
                <ul style="font-size: 0.8rem; margin: 0; padding-left: 1rem; color: #374151;">
                  ${competitor.strengths.slice(0, 3).map(s => `<li style="margin-bottom: 0.25rem;">${s}</li>`).join('')}
                </ul>
              </div>
            `;
          }

          if (competitor.weaknesses && competitor.weaknesses.length > 0) {
            leftHtml += `
              <div style="margin-bottom: 0.5rem;">
                <h5 style="font-size: 0.85rem; color: #dc2626; font-weight: 600; margin-bottom: 0.5rem;">Challenges</h5>
                <ul style="font-size: 0.8rem; margin: 0; padding-left: 1rem; color: #374151;">
                  ${competitor.weaknesses.slice(0, 3).map(w => `<li style="margin-bottom: 0.25rem;">${w}</li>`).join('')}
                </ul>
              </div>
            `;
          }

          leftHtml += `</div>`;
        }

        leftHtml += `</div></div>`;
      }

      // Market Landscape & Recommendations
      if (competitorAnalysis.marketLandscape || (competitorAnalysis.recommendations && competitorAnalysis.recommendations.length > 0)) {
        leftHtml += `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        `;

        if (competitorAnalysis.marketLandscape) {
          const ml = competitorAnalysis.marketLandscape;
          leftHtml += `
            <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h4 style="color: ${primaryColor}; margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600;">Market Landscape</h4>
              ${ml.industrySize ? `<div style="margin-bottom: 0.75rem;"><span style="font-weight: 600; color: #374151;">Industry Size:</span> <span style="color: #6b7280;">${ml.industrySize}</span></div>` : ''}
              ${ml.growthRate ? `<div style="margin-bottom: 0.75rem;"><span style="font-weight: 600; color: #374151;">Growth Rate:</span> <span style="color: #6b7280;">${ml.growthRate}</span></div>` : ''}
              ${ml.competitiveIntensity ? `<div style="margin-bottom: 0.75rem;"><span style="font-weight: 600; color: #374151;">Competition Level:</span> <span style="color: #6b7280; text-transform: capitalize;">${ml.competitiveIntensity}</span></div>` : ''}
              ${ml.keyTrends && ml.keyTrends.length > 0 ? `
                <div style="margin-top: 1rem;">
                  <h5 style="font-weight: 600; color: #374151; margin-bottom: 0.5rem; font-size: 0.9rem;">Key Market Trends</h5>
                  <ul style="font-size: 0.85rem; margin: 0; padding-left: 1rem; color: #6b7280;">
                    ${ml.keyTrends.slice(0, 3).map(t => `<li style="margin-bottom: 0.25rem;">${t}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `;
        }

        if (competitorAnalysis.recommendations && competitorAnalysis.recommendations.length > 0) {
          leftHtml += `
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 1.5rem; border-radius: 8px; border: 1px solid #bfdbfe;">
              <h4 style="color: ${primaryColor}; margin: 0 0 1rem 0; font-size: 1.1rem; font-weight: 600;">Current Focus & Exploration</h4>
              <ul style="font-size: 0.9rem; margin: 0; padding-left: 0; list-style: none; color: #374151;">
                ${competitorAnalysis.recommendations.slice(0, 4).map((rec, index) => `
                  <li style="margin-bottom: 0.75rem; display: flex; align-items: start;">
                    <span style="background: ${primaryColor}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; margin-right: 0.75rem; flex-shrink: 0;">${index + 1}</span>
                    <span style="line-height: 1.5;">${rec}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }

        leftHtml += `</div>`;
      }

      leftHtml += `</section>`;
    }

    // Section 7 & 8: Extra ChatGPT-generated sections
    for (const sec of extraSecs) {
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">${sec.heading}</h2>
          <p>${sec.content}</p>
        </section>
      `;
    }

    // RIGHT column HTML (sidebar)
    const rightHtml = `
      <div style="
        background-color: ${primaryColor};
        color: ${defaultTextColor};
        flex: 1;
        min-width: 280px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        box-sizing: border-box;
      ">
        <div style="font-size: 1rem; margin-bottom: 1rem; color: ${secondaryColor};">
          Powered by Decker.ai
        </div>
        <div style="
          background-color: #ffffff;
          padding: 40px;
          border-radius: 8px;
          margin-bottom: 1rem;
        ">
          <img
            src="${logoSrc}"
            alt="Logo for ${brandName}"
            style="max-width: 100%; height: auto;"
          />
        </div>
        <h2 style="margin: 0.5rem 0; font-size: 1.5rem; color: ${defaultTextColor};">
          ${brandName}
        </h2>
        <p style="font-size: 1rem; line-height: 1.4; color: ${secondaryColor};">
          ${shortDescription}
        </p>
      </div>
    `;

    // Prepare Chart.js data for JavaScript rendering
    const chartJsData = chartsToDisplay.map((chart, index) => ({
      id: `chart_${index}`,
      type: chart.type === 'area' ? 'line' : chart.type, // Chart.js doesn't have 'area' type directly
      data: chart.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: false }, // We handle title in HTML
          legend: { 
            display: chart.type !== 'metrics',
            position: 'bottom',
            labels: { padding: 20, usePointStyle: true }
          }
        },
        scales: chart.type === 'pie' ? {} : {
          y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
          x: { grid: { color: '#e5e7eb' } }
        },
        elements: {
          point: { radius: 4, hoverRadius: 6 },
          line: { 
            tension: 0.1,
            fill: chart.type === 'area'
          }
        }
      }
    }));

    // Function to format units for clear display
    function formatUnitForDisplay(unit) {
      if (!unit) return '';
      
      // Clean up common confusing unit descriptions
      let cleanUnit = unit.toLowerCase();
      
      if (cleanUnit.includes('million') && cleanUnit.includes('usd')) {
        return 'Values in Millions USD';
      }
      if (cleanUnit.includes('billion') && cleanUnit.includes('usd')) {
        return 'Values in Billions USD';
      }
      if (cleanUnit.includes('usd') && cleanUnit.includes('million')) {
        return 'Values in Millions USD';
      }
      if (cleanUnit.includes('percent') || cleanUnit.includes('%')) {
        return 'Values as Percentages (%)';
      }
      if (cleanUnit.includes('million') && !cleanUnit.includes('usd')) {
        return 'Values in Millions';
      }
      if (cleanUnit.includes('billion') && !cleanUnit.includes('usd')) {
        return 'Values in Billions';
      }
      if (cleanUnit.includes('thousand')) {
        return 'Values in Thousands';
      }
      if (cleanUnit.includes('change') && cleanUnit.includes('percent')) {
        return 'Percentage Change (%)';
      }
      if (cleanUnit.includes('numeric') || cleanUnit.includes('number')) {
        return 'Numerical Values';
      }
      if (cleanUnit.includes('count') || cleanUnit.includes('units')) {
        return 'Unit Count';
      }
      
      // For mixed units like "In millions except percentages"
      if (cleanUnit.includes('except') || cleanUnit.includes('mixed')) {
        return 'Mixed Units (See Legend)';
      }
      
      // Default: capitalize first letter and return as is if it's short and clear
      if (unit.length < 15) {
        return unit.charAt(0).toUpperCase() + unit.slice(1);
      }
      
      return 'Various Units';
    }

    // FULL HTML: put left + right side by side
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Sales Deck – ${brandName}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <style>
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
          }
          .container {
            display: flex;
            flex-wrap: wrap;
            min-height: 100vh;
          }
          .main-content {
            flex: 3;
            padding: 2rem;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            overflow-y: auto;
          }
          .sidebar {
            background: ${primaryColor};
            color: ${defaultTextColor};
            flex: 1;
            min-width: 280px;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
          }
          @media (max-width: 768px) {
            .container { flex-direction: column; }
            .main-content, .sidebar { flex: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="main-content">
            ${leftHtml}
          </div>
          <div class="sidebar">
            <div style="font-size: 1rem; margin-bottom: 1rem; color: ${secondaryColor};">
              Powered by Decker.ai
            </div>
            <div style="
              background-color: #ffffff;
              padding: 40px;
              border-radius: 8px;
              margin-bottom: 1rem;
            ">
              <img
                src="${logoSrc}"
                alt="Logo for ${brandName}"
                style="max-width: 100%; height: auto;"
              />
            </div>
            <h2 style="margin: 0.5rem 0; font-size: 1.5rem; color: ${defaultTextColor};">
              ${brandName}
            </h2>
            <p style="font-size: 1rem; line-height: 1.4; color: ${secondaryColor};">
              ${shortDescription}
            </p>
          </div>
        </div>
        
        <script>
          // Chart.js initialization
          document.addEventListener('DOMContentLoaded', function() {
            const chartData = ${JSON.stringify(chartJsData)};
            
            chartData.forEach(chartConfig => {
              const ctx = document.getElementById(chartConfig.id);
              if (!ctx) return;
              
              try {
                // Handle different chart types
                if (chartConfig.type === 'metrics') {
                  // Metrics are handled by HTML, skip Chart.js rendering
                  return;
                }
                
                new Chart(ctx, {
                  type: chartConfig.type,
                  data: chartConfig.data,
                  options: chartConfig.options
                });
              } catch (error) {
                console.error('Error rendering chart:', chartConfig.id, error);
                ctx.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">Chart rendering failed</div>';
              }
            });
          });
          

        </script>
      </body>
      </html>
    `;

    // 8) Write HTML file to disk with random number prefix to prevent overwriting
    const randomNumber = Math.floor(Math.random() * 900000) + 100000; // Generate 6-digit random number
    const deckFileName = `${randomNumber}-${deckSlug}.html`;
    const deckFilePath = path.join(decksDir, deckFileName);
    fs.writeFileSync(deckFilePath, fullHtml, "utf-8");

    // 9) Save Deck record in MongoDB with chart configurations and competitor analysis
    const newDeck = new Deck({
      brandName,
      shortDescription,
      longDescription: longDesc,
      primaryColor,
      secondaryColor,
      logoUrl: logoDoc.url,
      relevantFileIds: documentFileIds,
      videoFileIds,
      documentFileIds,
      deckUrl: `/decks/${deckFileName}`,
      chartConfigs, // Store chart configurations for React frontend
      extractedData: extractedDataSummary, // Store raw extracted data
      competitorAnalysis, // Store competitor analysis results
      createdAt: new Date(),
    });
    await newDeck.save();

    return res.status(201).json({ 
      deck: newDeck,
      chartConfigs, // Send chart configs to frontend (now as array)
      chartStructure, // Send the structured chart data as well
      extractedData: extractedDataSummary, // Send raw data for tables
      competitorAnalysis, // Send competitor analysis to frontend
      processingInfo: {
        totalDocs: documentFileIds.length,
        sensitiveDocs: sensitiveAnalysisResults.length,
        regularDocs: documentFileIds.length - sensitiveAnalysisResults.length,
        fastPath: !hasSensitiveFiles && documentFileIds.length > 0,
        chartsGenerated: chartConfigs.length,
        topChartsGenerated: chartStructure?.topCharts?.length || 0,
        additionalChartsGenerated: chartStructure?.additionalCharts?.length || 0,
        competitorsIdentified: competitorAnalysis?.competitors?.length || 0,
        competitiveAdvantages: competitorAnalysis?.brandPositioning?.competitiveAdvantages?.length || 0,
        useFullDocumentText: true // Flag to indicate we're using full text instead of summaries
      }
    });
  } catch (err) {
    console.error("Error creating deck:", err);
    return res.status(500).json({ error: "Server error creating sales deck." });
  }
});

// ─── GET /api/decks ───────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const allDecks = await Deck.find().sort({ createdAt: -1 });
    const decks = allDecks.map((d) => ({
      _id: d._id,
      brandName: d.brandName,
      deckUrl: d.deckUrl,
      createdAt: d.createdAt,
    }));
    return res.json({ decks });
  } catch (err) {
    console.error("Error listing decks:", err);
    return res.status(500).json({ error: "Server error listing decks." });
  }
});

module.exports = router;
