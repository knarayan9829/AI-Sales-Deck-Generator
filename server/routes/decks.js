// server/routes/decks.js

const express   = require("express");
const path      = require("path");
const fs        = require("fs");
const pdfParse  = require("pdf-parse");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const File      = require("../models/File");
const Deck      = require("../models/Deck");
const openai    = require("../utils/openai-wrapper");

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
  // “summaries” is an array of short strings. Merge into one “master summary.”
  const prompt = `
You have been given a list of brief summaries about a single brand’s documents.
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

// ─── Utility: ask ChatGPT for JSON-formatted plot instructions ─────────────
async function getPlotInstructions(combinedText, primaryColor) {
  // 1) Chop combinedText into 2k-char chunks
  const chunks = chunkString(combinedText, 2000);

  // 2) Summarize each chunk in series
  const chunkSummaries = [];
  for (let i = 0; i < chunks.length; i++) {
    const sum = await summarizeChunk(chunks[i]);
    chunkSummaries.push(sum);
  }

  // 3) Merge chunk summaries into one “master summary”
  const masterSummary = await mergeSummaries(chunkSummaries);

  // 4) Ask GPT to produce plot instructions from the master summary
  const prompt = `
You are an AI assistant that analyzes a brand’s summary of documents and suggests data visualizations.
Given the concise summary of all documents below, output a JSON array where each element is a single plot specification:

[
  {
    "title": "<Plot Title>",
    "type": "<chart type (e.g. bar, line, pie)>",
    "labels": ["label1", "label2", ...],
    "values": [number1, number2, ...]
  },
  ...
]

Only return valid JSON—no commentary or explanation.  
Here is the combined summary of all documents:

"""${masterSummary}"""
  `.trim();

  const responseRaw = await openai.generateText(prompt);

  // Remove any code fences if ChatGPT responded with triple backticks
  const cleaned = responseRaw
    .replace(/```json\s*/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(
      "Failed to parse Plot JSON from ChatGPT after chunking:",
      err,
      "\nCleaned response:",
      cleaned
    );
    return [];
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
You are a sales deck generator. Using the following inputs—brand name, short description, and a concise summary of all documents—compose a cohesive, detailed long description for the brand (approximately 200–300 words).

Brand Name: ${brandName}
Short Description: ${shortDesc}

Concise Summary of All Documents:
${masterSummary}
  `.trim();

  return (await openai.generateText(prompt)).trim();
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
You are an AI assistant creating a sales deck. Given the concise summary of documents below, identify two additional sections (beyond description, videos, figures, documents) that would best highlight the brand’s strengths or insights. For each section, output exactly one JSON object with:

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
    } = req.body;

    // 1) Fetch and validate logo
    const logoDoc = await File.findById(logoFileId);
    if (!logoDoc) {
      return res.status(400).json({ error: "Invalid logoFileId." });
    }

    // 2) Build combinedText by concatenating raw text from PDFs/TXT/MD
    let combinedText = "";
    for (const docId of documentFileIds) {
      const fileDoc = await File.findById(docId);
      if (!fileDoc) continue;
      const txt = await extractTextFromFile(fileDoc);
      combinedText += "\n\n" + txt;
    }

    // 3) Ask ChatGPT for plot instructions (via chunk+summarize)
    const plotInsts = await getPlotInstructions(combinedText, primaryColor);
    console.log("⏱️ getPlotInstructions returned:", plotInsts);

    // 4) Render each plot to disk under /decks/plots
    const deckSlug = slugify(brandName);
    const plotDir = path.join(decksDir, "plots");
    if (!fs.existsSync(plotDir)) {
      fs.mkdirSync(plotDir, { recursive: true });
    }

    const plotUrls = [];
    for (let i = 0; i < plotInsts.length; i++) {
      const inst = plotInsts[i];
      const filename = `${deckSlug}-plot-${i + 1}.png`;
      const outPath = path.join(plotDir, filename);
      try {
        console.log(`→ rendering plot #${i + 1} to`, outPath, "with instr:", inst);
        await renderChart(inst, outPath, primaryColor);
        plotUrls.push(`/decks/plots/${filename}`);
        console.log("✔️ wrote plot file:", filename);
      } catch (err) {
        console.error("Error rendering chart:", err);
      }
    }

    // 5) Get long description (also chunk+summarize internally)
    const longDesc = await getLongDescription(brandName, shortDescription, combinedText);

    // 6) Get two extra sections (also chunk+summarize internally)
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

    // Section 3: Relevant Figures (Plots)
    if (plotUrls.length > 0) {
      leftHtml += `
        <section style="margin-bottom: 2rem;">
          <h2 style="color: ${primaryColor}; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem;">Relevant Figures</h2>
          <div style="display: flex; flex-direction: column; gap: 2rem;">
      `;
      for (const pu of plotUrls) {
        leftHtml += `
            <img src="${pu}" alt="Plot for ${brandName}" style="max-width:100%; border:1px solid #ddd; border-radius:4px;" />
        `;
      }
      leftHtml += `
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

    // Section 5 & 6: Extra ChatGPT-generated sections
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

    // FULL HTML: put left + right side by side
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Sales Deck – ${brandName}</title>
      </head>
      <body style="margin: 0; font-family: Arial, sans-serif;">
        <div style="display: flex; flex-wrap: wrap; min-height: 100vh;">
          <div style="flex: 3; padding: 2rem; background-color: #f5f5f5; overflow-y: auto;">
            ${leftHtml}
          </div>
          ${rightHtml}
        </div>
      </body>
      </html>
    `;

    // 8) Write HTML file to disk
    const deckFileName = `${deckSlug}.html`;
    const deckFilePath = path.join(decksDir, deckFileName);
    fs.writeFileSync(deckFilePath, fullHtml, "utf-8");

    // 9) Save Deck record in MongoDB
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
      createdAt: new Date(),
    });
    await newDeck.save();

    return res.status(201).json({ deck: newDeck });
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
