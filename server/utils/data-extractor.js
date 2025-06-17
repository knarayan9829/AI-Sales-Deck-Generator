const openai = require('./openai-wrapper');

/**
 * Multi-Agent Data Extraction System with Real-time Logging
 * Enhanced logging for debugging and monitoring agent responses
 */

// Multi-Agent Data Extraction System
class DataExtractionAgent {
  constructor() {
    this.openai = openai;
    this.sessionId = Date.now().toString();
  }

  // Enhanced logging function
  log(agentName, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`\n🤖 [${agentName}] ${timestamp}`);
    console.log(`📝 ${message}`);
    if (data) {
      console.log(`📊 Data:`, JSON.stringify(data, null, 2));
    }
    console.log(`─────────────────────────────────────────`);
  }

  // Main extraction function with improved multi-agent processing
  async extractDataTables(text, brandName) {
    console.log('\n🚀 ========= MULTI-AGENT DATA EXTRACTION STARTING =========');
    console.log(`📄 Document length: ${text.length} characters`);
    console.log(`🏢 Brand: ${brandName}`);
    console.log(`🔢 Session ID: ${this.sessionId}`);
    
    if (!text || text.trim().length < 50) {
      this.log('SYSTEM', '⚠️ Text too short for meaningful extraction');
      return { tables: [], keyMetrics: [], timeSeriesData: [] };
    }

    try {
      this.log('COORDINATOR', '🎯 Starting parallel agent processing...');

      // Agent 1: Structure Analysis Agent
      this.log('AGENT-1', '🔍 Starting Structure Analysis...');
      const structuredData = await this.structureAnalysisAgent(text, brandName);
      this.log('AGENT-1', `✅ Structure Analysis complete`, {
        tablesFound: structuredData.tables?.length || 0,
        tableDetails: structuredData.tables?.map(t => ({
          title: t.title,
          headers: t.headers,
          rowCount: t.rows?.length || 0
        }))
      });
      
      // Agent 2: Metrics Extraction Agent
      this.log('AGENT-2', '📊 Starting Metrics Extraction...');
      const metricsData = await this.metricsExtractionAgent(text, brandName);
      this.log('AGENT-2', `✅ Metrics Extraction complete`, {
        metricsFound: metricsData.keyMetrics?.length || 0,
        metrics: metricsData.keyMetrics?.map(m => ({
          name: m.name,
          value: m.value,
          unit: m.unit
        }))
      });
      
      // Agent 3: Time Series Analysis Agent
      this.log('AGENT-3', '📈 Starting Time Series Analysis...');
      const timeSeriesData = await this.timeSeriesAnalysisAgent(text, brandName);
      this.log('AGENT-3', `✅ Time Series Analysis complete`, {
        seriesFound: timeSeriesData.timeSeriesData?.length || 0,
        series: timeSeriesData.timeSeriesData?.map(s => ({
          title: s.title,
          dataPoints: s.dataPoints?.length || 0
        }))
      });
      
      // Agent 4: Data Validation and Cleaning Agent
      this.log('AGENT-4', '🔍 Starting Data Validation...');
      const validatedData = await this.dataValidationAgent({
        tables: structuredData.tables || [],
        keyMetrics: metricsData.keyMetrics || [],
        timeSeriesData: timeSeriesData.timeSeriesData || []
      });
      this.log('AGENT-4', `✅ Data Validation complete`, {
        finalTables: validatedData.tables?.length || 0,
        finalMetrics: validatedData.keyMetrics?.length || 0,
        finalTimeSeries: validatedData.timeSeriesData?.length || 0
      });

      console.log('\n🎉 ========= EXTRACTION SUMMARY =========');
      console.log(`✅ Tables extracted: ${validatedData.tables.length}`);
      console.log(`✅ Metrics extracted: ${validatedData.keyMetrics.length}`);
      console.log(`✅ Time series extracted: ${validatedData.timeSeriesData.length}`);
      console.log(`🏁 Session ${this.sessionId} completed successfully`);
      console.log('=====================================\n');
      
      return validatedData;
    } catch (error) {
      this.log('ERROR', `❌ Multi-agent extraction failed: ${error.message}`);
      console.error('Full error:', error);
      return { tables: [], keyMetrics: [], timeSeriesData: [] };
    }
  }

  // Agent 1: Structure Analysis Agent - Focus on tables and structured data
  async structureAnalysisAgent(text, brandName) {
    const prompt = `You are a Structure Analysis Agent specializing in extracting tabular data from business documents.

COMPLETE DOCUMENT TEXT (using full content instead of summaries):
${text}

TASK: Extract ALL tables, structured data, and organized information from the COMPLETE document. Look for:
- Financial tables (revenue, costs, profits)
- Performance metrics tables
- Comparison tables (year-over-year, regions, products)
- Survey results or statistical data
- Any data with headers and rows
- Competitive comparison data and benchmarks
- Market analysis tables and industry data
- Customer segmentation or analysis tables

REQUIREMENTS:
- Only extract data that actually exists in the document
- Preserve exact numbers and percentages
- Include proper headers
- Filter out incomplete or malformed data
- Extract competitor information when available
- Process the complete document text for comprehensive data extraction

Return JSON format:
{
  "tables": [
    {
      "title": "Descriptive title based on content",
      "headers": ["Column1", "Column2", "Column3"],
      "rows": [
        ["Data1", "Data2", "Data3"],
        ["Data4", "Data5", "Data6"]
      ],
      "metadata": {
        "source": "Document section",
        "period": "Time period if applicable",
        "unit": "Currency or measurement unit"
      }
    }
  ]
}

Only include tables with at least 2 rows of data and 2 columns. Ensure all numbers are accurately extracted.`;

    try {
      this.log('AGENT-1', '📤 Sending prompt to OpenAI...');
      const response = await this.openai.generateText(prompt);
      this.log('AGENT-1', '📥 Raw OpenAI response received', { 
        responseLength: response.length,
        preview: response.substring(0, 200) + '...'
      });
      
      const cleaned = this.cleanJsonResponse(response);
      this.log('AGENT-1', '🧹 JSON response cleaned', { 
        cleanedLength: cleaned.length,
        preview: cleaned.substring(0, 200) + '...'
      });
      
      const data = JSON.parse(cleaned);
      this.log('AGENT-1', '✅ JSON parsed successfully', data);
      
      return {
        tables: Array.isArray(data.tables) ? 
          data.tables.filter(t => t.rows && t.rows.length >= 2 && t.headers && t.headers.length >= 2) : 
          []
      };
    } catch (error) {
      this.log('AGENT-1', `❌ Structure Analysis error: ${error.message}`);
      return { tables: [] };
    }
  }

  // Agent 2: Metrics Extraction Agent - Focus on KPIs and individual metrics
  async metricsExtractionAgent(text, brandName) {
    const prompt = `You are a Metrics Extraction Agent specializing in identifying key performance indicators and business metrics.

COMPLETE DOCUMENT TEXT (using full content instead of summaries):
${text}

TASK: Extract ALL quantifiable business metrics, KPIs, and performance indicators from the COMPLETE document. Look for:
- Revenue, profit, sales figures
- Growth rates, percentages
- Customer metrics (satisfaction, retention, acquisition)
- Market share, rankings
- Operational metrics (efficiency, productivity)
- Financial ratios
- Competitive metrics and benchmarks
- Industry performance indicators
- Market position metrics

REQUIREMENTS:
- Extract exact values with their units
- Identify trend direction when mentioned
- Include context for each metric
- Only extract metrics that actually exist in the document
- Include competitive comparison metrics when available
- Process the complete document text for comprehensive metric extraction

Return JSON format:
{
  "keyMetrics": [
    {
      "name": "Metric name",
      "value": "Numeric value only",
      "unit": "$ or % or units",
      "trend": "up/down/stable",
      "context": "Additional context or time period",
      "category": "financial/operational/customer/market/competitive"
    }
  ]
}

Extract 5-20 meaningful metrics. Ensure values are numbers or percentages.`;

    try {
      this.log('AGENT-2', '📤 Sending prompt to OpenAI...');
      const response = await this.openai.generateText(prompt);
      this.log('AGENT-2', '📥 Raw OpenAI response received', { 
        responseLength: response.length,
        preview: response.substring(0, 200) + '...'
      });
      
      const cleaned = this.cleanJsonResponse(response);
      this.log('AGENT-2', '🧹 JSON response cleaned');
      
      const data = JSON.parse(cleaned);
      this.log('AGENT-2', '✅ JSON parsed successfully', data);
      
      return {
        keyMetrics: Array.isArray(data.keyMetrics) ? 
          data.keyMetrics.filter(m => m.value && m.value !== 'N/A' && m.name) : 
          []
      };
    } catch (error) {
      this.log('AGENT-2', `❌ Metrics Extraction error: ${error.message}`);
      return { keyMetrics: [] };
    }
  }

  // Agent 3: Time Series Analysis Agent - Focus on trends over time
  async timeSeriesAnalysisAgent(text, brandName) {
    const prompt = `You are a Time Series Analysis Agent specializing in extracting time-based data and trends.

COMPLETE DOCUMENT TEXT (using full content instead of summaries):
${text}

TASK: Extract ALL time-based data series and trends from the COMPLETE document. Look for:
- Annual/quarterly/monthly data points
- Historical performance data
- Forecasts and projections
- Year-over-year comparisons
- Seasonal trends
- Competitive performance over time
- Market trend data
- Industry growth patterns

REQUIREMENTS:
- Each series must have at least 3 data points
- Include proper time periods
- Extract actual values, not estimates
- Focus on measurable trends
- Include competitive time series data when available
- Process the complete document text for comprehensive trend analysis

Return JSON format:
{
  "timeSeriesData": [
    {
      "title": "Series name",
      "dataPoints": [
        {"period": "2021", "value": "100"},
        {"period": "2022", "value": "120"},
        {"period": "2023", "value": "150"}
      ],
      "unit": "$ or % or units",
      "category": "revenue/growth/performance/competitive/market"
    }
  ]
}

Only include series with clear time progression and actual data points.`;

    try {
      this.log('AGENT-3', '📤 Sending prompt to OpenAI...');
      const response = await this.openai.generateText(prompt);
      this.log('AGENT-3', '📥 Raw OpenAI response received', { 
        responseLength: response.length,
        preview: response.substring(0, 200) + '...'
      });
      
      const cleaned = this.cleanJsonResponse(response);
      this.log('AGENT-3', '🧹 JSON response cleaned');
      
      const data = JSON.parse(cleaned);
      this.log('AGENT-3', '✅ JSON parsed successfully', data);
      
      return {
        timeSeriesData: Array.isArray(data.timeSeriesData) ? 
          data.timeSeriesData.filter(ts => ts.dataPoints && ts.dataPoints.length >= 3) : 
          []
      };
    } catch (error) {
      this.log('AGENT-3', `❌ Time Series Analysis error: ${error.message}`);
      return { timeSeriesData: [] };
    }
  }

  // Agent 4: Data Validation and Cleaning Agent
  async dataValidationAgent(rawData) {
    this.log('AGENT-4', '🔍 Starting data validation process...');
    
    const validated = {
      tables: [],
      keyMetrics: [],
      timeSeriesData: []
    };

    // Validate and clean tables
    if (rawData.tables) {
      this.log('AGENT-4', `📊 Validating ${rawData.tables.length} tables...`);
      validated.tables = rawData.tables.filter(table => {
        const isValid = table.headers && 
               table.rows && 
               table.headers.length >= 2 && 
               table.rows.length >= 2 &&
               table.title &&
               table.rows.every(row => row.length === table.headers.length);
        
        if (!isValid) {
          this.log('AGENT-4', `❌ Invalid table rejected: ${table.title}`);
        }
        return isValid;
      }).map(table => ({
        ...table,
        title: table.title.trim(),
        headers: table.headers.map(h => h.trim()),
        rows: table.rows.map(row => row.map(cell => String(cell).trim()))
      }));
      
      this.log('AGENT-4', `✅ Tables validation complete: ${validated.tables.length} valid tables`);
    }

    // Validate and clean metrics
    if (rawData.keyMetrics) {
      this.log('AGENT-4', `📈 Validating ${rawData.keyMetrics.length} metrics...`);
      validated.keyMetrics = rawData.keyMetrics.filter(metric => {
        const hasValidValue = metric.value && 
                            metric.value !== 'N/A' && 
                            metric.value !== 'TBD' &&
                            metric.value.toString().trim().length > 0;
        const hasValidName = metric.name && metric.name.trim().length > 0;
        const isValid = hasValidValue && hasValidName;
        
        if (!isValid) {
          this.log('AGENT-4', `❌ Invalid metric rejected: ${metric.name} = ${metric.value}`);
        }
        return isValid;
      }).map(metric => ({
        ...metric,
        name: metric.name.trim(),
        value: metric.value.toString().trim(),
        unit: metric.unit ? metric.unit.trim() : '',
        trend: metric.trend && ['up', 'down', 'stable'].includes(metric.trend) ? metric.trend : null
      }));
      
      this.log('AGENT-4', `✅ Metrics validation complete: ${validated.keyMetrics.length} valid metrics`);
    }

    // Validate and clean time series
    if (rawData.timeSeriesData) {
      this.log('AGENT-4', `📅 Validating ${rawData.timeSeriesData.length} time series...`);
      validated.timeSeriesData = rawData.timeSeriesData.filter(series => {
        const isValid = series.dataPoints && 
               series.dataPoints.length >= 3 &&
               series.title &&
               series.dataPoints.every(dp => dp.period && dp.value);
        
        if (!isValid) {
          this.log('AGENT-4', `❌ Invalid time series rejected: ${series.title}`);
        }
        return isValid;
      }).map(series => ({
        ...series,
        title: series.title.trim(),
        dataPoints: series.dataPoints.map(dp => ({
          period: dp.period.toString().trim(),
          value: dp.value.toString().trim()
        }))
      }));
      
      this.log('AGENT-4', `✅ Time series validation complete: ${validated.timeSeriesData.length} valid series`);
    }

    this.log('AGENT-4', '🎯 Final validation summary', {
      validTables: validated.tables.length,
      validMetrics: validated.keyMetrics.length,
      validTimeSeries: validated.timeSeriesData.length,
      totalDataPoints: validated.tables.length + validated.keyMetrics.length + validated.timeSeriesData.length
    });
    
    return validated;
  }

  // Utility: Clean JSON response from AI
  cleanJsonResponse(response) {
    let cleaned = response.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    
    // Remove any text before the first {
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace > 0) {
      cleaned = cleaned.substring(firstBrace);
    }
    
    // Remove any text after the last }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > 0) {
      cleaned = cleaned.substring(0, lastBrace + 1);
    }
    
    return cleaned;
  }
}

// Enhanced chart configuration generation with proper chart variety and ranking
async function generateChartConfigs(extractedData, primaryColor, brandName) {
  const charts = [];

  // Generate charts from tables with enhanced intelligence
  extractedData.tables.forEach((table, index) => {
    if (table.rows.length === 0) return;

    const chartType = determineOptimalChartType(table);
    const chartData = convertTableToChartData(table, chartType);
    
    if (chartData) {
      const importance = calculateChartImportance(table, chartType, extractedData);
      charts.push({
        id: `table-chart-${index}`,
        type: chartType,
        title: table.title,
        data: chartData,
        options: generateChartOptions(chartType, table.title, primaryColor),
        importance: importance,
        metadata: {
          ...table.metadata,
          source: 'Document table data',
          extractedBy: 'Multi-agent system',
          chartCategory: getChartCategory(chartType, table),
          dataQuality: assessDataQuality(table)
        }
      });
    }
  });

  // Generate metrics visualization with variety
  if (extractedData.keyMetrics.length > 0) {
    // Include both numeric and non-numeric metrics for KPI display
    const allMetrics = extractedData.keyMetrics;
    
    if (allMetrics.length > 0) {
      // Create different metric visualizations
      const metricCharts = await generateMetricVisualizations(allMetrics, primaryColor, brandName);
      charts.push(...metricCharts);
    }
  }

  // Generate time series charts with enhanced types
  extractedData.timeSeriesData.forEach((series, index) => {
    if (series.dataPoints.length < 2) return;

    const validDataPoints = series.dataPoints.filter(dp => {
      const numericValue = parseFloat(dp.value.replace(/[^0-9.-]/g, ''));
      return !isNaN(numericValue);
    });

    if (validDataPoints.length >= 2) {
      const timeChartType = determineTimeSeriesChartType(series, validDataPoints);
      const importance = calculateTimeSeriesImportance(series, validDataPoints);
      
      charts.push({
        id: `timeseries-${index}`,
        type: timeChartType,
        title: series.title,
        data: {
          labels: validDataPoints.map(dp => dp.period),
          datasets: [{
            label: series.title,
            data: validDataPoints.map(dp => parseFloat(dp.value.replace(/[^0-9.-]/g, ''))),
            borderColor: primaryColor,
            backgroundColor: timeChartType === 'line' ? `${primaryColor}20` : primaryColor,
            tension: 0.1,
            fill: timeChartType === 'area'
          }]
        },
        options: generateChartOptions(timeChartType, series.title, primaryColor),
        importance: importance,
        metadata: {
          unit: series.unit,
          category: series.category,
          dataPoints: validDataPoints.length,
          chartCategory: 'Time Series Analysis'
        }
      });
    }
  });

  // Generate comparison and correlation charts if applicable
  const comparisonCharts = generateComparisonCharts(extractedData, primaryColor);
  charts.push(...comparisonCharts);

  // Rank charts by importance and return structured result
  return rankAndStructureCharts(charts);
}

// Calculate chart importance based on multiple factors
function calculateChartImportance(table, chartType, extractedData) {
  let importance = 0;
  
  // Financial data gets higher importance
  if (table.title.toLowerCase().includes('revenue') || 
      table.title.toLowerCase().includes('profit') ||
      table.title.toLowerCase().includes('financial')) {
    importance += 40;
  }
  
  // Competitive data gets high importance
  if (table.title.toLowerCase().includes('competitor') ||
      table.title.toLowerCase().includes('market share') ||
      table.title.toLowerCase().includes('comparison')) {
    importance += 35;
  }
  
  // Performance metrics get medium-high importance
  if (table.title.toLowerCase().includes('performance') ||
      table.title.toLowerCase().includes('growth') ||
      table.title.toLowerCase().includes('metrics')) {
    importance += 30;
  }
  
  // Data richness factor
  const dataPoints = table.rows.length * table.headers.length;
  importance += Math.min(dataPoints * 2, 20);
  
  // Chart type effectiveness - simplified
  const chartTypeBonus = {
    'pie': 20,      // Great for parts of whole and distributions
    'bar': 15       // Good general purpose comparisons
  };
  importance += chartTypeBonus[chartType] || 15;
  
  return Math.min(importance, 100);
}

// Simplified chart type determination - only bar and pie charts
function determineOptimalChartType(table) {
  if (!table.rows || table.rows.length === 0) return 'bar';
  
  const firstRow = table.rows[0];
  const numColumns = firstRow.length;
  const numRows = table.rows.length;
  
  // Check for numeric data
  const hasNumericData = table.rows.some(row => 
    row.some(cell => {
      const numericValue = parseFloat(String(cell).replace(/[^0-9.-]/g, ''));
      return !isNaN(numericValue) && numericValue > 0;
    })
  );

  if (!hasNumericData) return 'bar';

  // Parts of a whole analysis - use pie charts for small datasets
  if (numColumns === 2 && numRows >= 2 && numRows <= 8) {
    const values = table.rows.map(row => parseFloat(String(row[1]).replace(/[^0-9.-]/g, '')));
    const total = values.reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);
    
    // Check if values represent percentages or parts of whole
    if (total > 95 && total < 105) return 'pie';
    
    // Use pie charts for percentages
    if (values.every(val => val >= 0 && val <= 100)) return 'pie';
    
    // Also use pie charts for market share, distribution, breakdown data
    if (table.title.toLowerCase().includes('share') ||
        table.title.toLowerCase().includes('distribution') ||
        table.title.toLowerCase().includes('breakdown') ||
        table.title.toLowerCase().includes('composition') ||
        table.title.toLowerCase().includes('segment')) {
      return 'pie';
    }
  }

  // Regional/categorical comparison - prefer pie for small datasets
  if (numColumns === 2 && numRows >= 2) {
    if (table.headers[0].toLowerCase().includes('region') ||
        table.headers[0].toLowerCase().includes('country') ||
        table.headers[0].toLowerCase().includes('category') ||
        table.headers[0].toLowerCase().includes('department')) {
      return numRows <= 6 ? 'pie' : 'bar';
    }
  }

  // Default to bar for all other comparisons
  return 'bar';
}

// Generate multiple metric visualizations
async function generateMetricVisualizations(metrics, primaryColor, brandName) {
  const charts = [];
  
  // Enhance metrics with web data if we have fewer than 4 KPIs
  let enhancedMetrics = [...metrics];
  if (metrics.length < 4) {
    try {
      const additionalKPIs = await getAdditionalKPIsFromWeb(brandName, metrics);
      enhancedMetrics = [...metrics, ...additionalKPIs];
    } catch (error) {
      console.log("Note: Could not fetch additional KPIs from web:", error.message);
    }
  }
  
  // KPI Dashboard (top metrics)
  const topMetrics = enhancedMetrics.slice(0, 6);
  if (topMetrics.length > 0) {
    charts.push({
      id: 'kpi-dashboard',
      type: 'metrics',
      title: 'Key Performance Indicators',
      data: topMetrics.map(m => ({
        name: m.name,
        value: isNaN(parseFloat(m.value.replace(/[^0-9.-]/g, ''))) ? m.value : parseFloat(m.value.replace(/[^0-9.-]/g, '')),
        unit: m.unit || '',
        trend: m.trend,
        context: m.context || '',
        category: m.category || 'general'
      })),
      options: { primaryColor },
      importance: 85,
      metadata: { chartCategory: 'KPI Dashboard', dataQuality: 'high' }
    });
  }

  // Category-based pie chart if we have categorical metrics
  const categorizedMetrics = groupMetricsByCategory(metrics);
  if (Object.keys(categorizedMetrics).length > 1) {
    const categoryData = Object.entries(categorizedMetrics).map(([category, categoryMetrics]) => ({
      category,
      value: categoryMetrics.reduce((sum, m) => sum + parseFloat(m.value.replace(/[^0-9.-]/g, '') || 0), 0),
      count: categoryMetrics.length
    }));

    charts.push({
      id: 'metrics-by-category',
      type: 'pie',
      title: 'Metrics Distribution by Category',
      data: {
        labels: categoryData.map(d => d.category),
        datasets: [{
          data: categoryData.map(d => d.count),
          backgroundColor: generateColorPalette(categoryData.length)
        }]
      },
      options: generateChartOptions('pie', 'Metrics Distribution by Category', primaryColor),
      importance: 60,
      metadata: { chartCategory: 'Category Analysis', dataQuality: 'medium' }
    });
  }

  return charts;
}

// Get additional KPIs from web search
async function getAdditionalKPIsFromWeb(brandName, existingMetrics) {
  // This is a placeholder for web search functionality
  // In a real implementation, you would use web search APIs or financial data APIs
  const webKPIs = [];
  
  // Common financial KPIs that might be found for public companies
  const commonKPIs = [
    { name: 'Market Cap', value: 'N/A', unit: '', category: 'financial', trend: null },
    { name: 'Annual Revenue', value: 'N/A', unit: '', category: 'financial', trend: null },
    { name: 'Employee Count', value: 'N/A', unit: '', category: 'operational', trend: null },
    { name: 'Market Share', value: 'N/A', unit: '%', category: 'competitive', trend: null }
  ];
  
  // Filter out KPIs that already exist
  const existingNames = existingMetrics.map(m => m.name.toLowerCase());
  const newKPIs = commonKPIs.filter(kpi => 
    !existingNames.some(existing => 
      existing.includes(kpi.name.toLowerCase()) || 
      kpi.name.toLowerCase().includes(existing)
    )
  );
  
  return newKPIs.slice(0, 3); // Return up to 3 additional KPIs
}

// Generate comparison and correlation charts
function generateComparisonCharts(extractedData, primaryColor) {
  const charts = [];
  
  // Multi-table comparison if we have similar tables
  const similarTables = findSimilarTables(extractedData.tables);
  similarTables.forEach((tableGroup, index) => {
    if (tableGroup.length >= 2) {
      const comparisonChart = createTableComparisonChart(tableGroup, primaryColor, index);
      if (comparisonChart) {
        charts.push(comparisonChart);
      }
    }
  });

  return charts;
}

// Determine time series chart type - simplified to only bar charts
function determineTimeSeriesChartType(series, dataPoints) {
  // Always use bar charts for time series data
  return 'bar';
}

// Helper functions
function groupMetricsByCategory(metrics) {
  return metrics.reduce((groups, metric) => {
    const category = metric.category || 'general';
    if (!groups[category]) groups[category] = [];
    groups[category].push(metric);
    return groups;
  }, {});
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function calculateTimeSeriesImportance(series, dataPoints) {
  let importance = 40; // Base importance
  
  // More data points = higher importance
  importance += Math.min(dataPoints.length * 3, 30);
  
  // Financial/revenue time series get boost
  if (series.title.toLowerCase().includes('revenue') ||
      series.title.toLowerCase().includes('profit') ||
      series.title.toLowerCase().includes('growth')) {
    importance += 25;
  }
  
  return Math.min(importance, 100);
}

function assessDataQuality(table) {
  const totalCells = table.rows.length * table.headers.length;
  const numericCells = table.rows.flat().filter(cell => 
    !isNaN(parseFloat(String(cell).replace(/[^0-9.-]/g, '')))
  ).length;
  
  const numericRatio = numericCells / totalCells;
  
  if (numericRatio > 0.8) return 'high';
  if (numericRatio > 0.5) return 'medium';
  return 'low';
}

function getChartCategory(chartType, table) {
  if (table.title.toLowerCase().includes('financial')) return 'Financial Analysis';
  if (table.title.toLowerCase().includes('competitor')) return 'Competitive Analysis';
  if (table.title.toLowerCase().includes('performance')) return 'Performance Metrics';
  if (chartType === 'pie') return 'Distribution Analysis';
  if (chartType === 'bar') return 'Comparison Analysis';
  return 'General Analysis';
}

// Rank and structure charts with top 5 priority
function rankAndStructureCharts(charts) {
  // Sort by importance (descending)
  const rankedCharts = charts.sort((a, b) => (b.importance || 0) - (a.importance || 0));
  
  // Structure the result
  return {
    topCharts: rankedCharts.slice(0, 5), // Top 5 most important
    additionalCharts: rankedCharts.slice(5), // Rest for "View More"
    totalCharts: rankedCharts.length,
    hasMore: rankedCharts.length > 5,
    chartsByCategory: groupChartsByCategory(rankedCharts)
  };
}

function groupChartsByCategory(charts) {
  return charts.reduce((groups, chart) => {
    const category = chart.metadata?.chartCategory || 'General Analysis';
    if (!groups[category]) groups[category] = [];
    groups[category].push(chart);
    return groups;
  }, {});
}

// Helper functions for table comparison and similarity detection
function findSimilarTables(tables) {
  // Implementation for finding tables with similar structure
  const groups = [];
  const used = new Set();
  
  tables.forEach((table, index) => {
    if (used.has(index)) return;
    
    const similarGroup = [table];
    used.add(index);
    
    tables.forEach((otherTable, otherIndex) => {
      if (otherIndex === index || used.has(otherIndex)) return;
      
      if (areTablesSimilar(table, otherTable)) {
        similarGroup.push(otherTable);
        used.add(otherIndex);
      }
    });
    
    if (similarGroup.length >= 2) {
      groups.push(similarGroup);
    }
  });
  
  return groups;
}

function areTablesSimilar(table1, table2) {
  // Simple similarity check based on column count and header similarity
  if (table1.headers.length !== table2.headers.length) return false;
  
  const similarHeaders = table1.headers.filter(h1 => 
    table2.headers.some(h2 => 
      h1.toLowerCase().includes(h2.toLowerCase()) || 
      h2.toLowerCase().includes(h1.toLowerCase())
    )
  );
  
  return similarHeaders.length >= table1.headers.length * 0.6;
}

function createTableComparisonChart(tableGroup, primaryColor, index) {
  // Create a comparison chart from multiple similar tables
  // This is a simplified implementation - can be enhanced based on specific needs
  const firstTable = tableGroup[0];
  
  return {
    id: `comparison-chart-${index}`,
    type: 'bar',
    title: `Comparison Analysis: ${firstTable.title}`,
    data: {
      labels: firstTable.rows.map(row => row[0]),
      datasets: tableGroup.map((table, tableIndex) => ({
        label: `Dataset ${tableIndex + 1}`,
        data: table.rows.map(row => parseFloat(row[1]) || 0),
        backgroundColor: generateColorPalette(1, tableIndex)[0]
      }))
    },
    options: generateChartOptions('bar', `Comparison Analysis: ${firstTable.title}`, primaryColor),
    importance: 70,
    metadata: {
      chartCategory: 'Comparative Analysis',
      dataQuality: 'high',
      source: 'Multi-table comparison'
    }
  };
}

// ─── Generate chart options for different chart types ──────────────────────
function generateChartOptions(chartType, title, primaryColor) {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: 'bold', color: '#1f2937' }
      },
      legend: {
        display: chartType !== 'gauge' && chartType !== 'metrics',
        position: 'bottom',
        labels: { color: '#374151', padding: 20 }
      }
    }
  };

  switch (chartType) {
    case 'line':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          },
          x: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          }
        },
        elements: {
          point: { radius: 4, hoverRadius: 8, borderWidth: 2 },
          line: { borderWidth: 3 }
        }
      };

    case 'area':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          },
          x: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          }
        },
        elements: {
          point: { radius: 3, hoverRadius: 6 },
          line: { borderWidth: 2 }
        },
        fill: true
      };

    case 'bar':
      return {
        ...baseOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#6b7280' }
          }
        },
        elements: {
          bar: { borderRadius: 4, borderSkipped: false }
        }
      };

    case 'pie':
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      };

    case 'scatter':
      return {
        ...baseOptions,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          },
          y: {
            grid: { color: '#e5e7eb' },
            ticks: { color: '#6b7280' }
          }
        },
        elements: {
          point: { radius: 6, hoverRadius: 10, borderWidth: 2 }
        }
      };

    case 'heatmap':
      return {
        ...baseOptions,
        scales: {
          x: {
            type: 'category',
            grid: { display: false },
            ticks: { color: '#6b7280' }
          },
          y: {
            type: 'category',
            grid: { display: false },
            ticks: { color: '#6b7280' }
          }
        },
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff'
          }
        }
      };

    case 'metrics':
      return {
        ...baseOptions,
        layout: { padding: 20 },
        plugins: {
          ...baseOptions.plugins,
          legend: { display: false }
        }
      };

    default:
      return baseOptions;
  }
}

// ─── Convert table data to chart.js format with enhanced types ──────────────
function convertTableToChartData(table, chartType) {
  if (!table.rows || table.rows.length === 0) return null;

  const numColumns = table.headers.length;
  
  // Handle different chart types
  switch (chartType) {
    case 'scatter':
      if (numColumns >= 3) {
        return {
          datasets: [{
            label: table.title,
            data: table.rows.map(row => ({
              x: parseFloat(row[1]) || 0,
              y: parseFloat(row[2]) || 0,
              label: row[0]
            })),
            backgroundColor: generateColorPalette(1)[0]
          }]
        };
      }
      break;

    case 'heatmap':
      // Transform data for heatmap
      const heatmapData = [];
      table.rows.forEach((row, rowIndex) => {
        for (let colIndex = 1; colIndex < row.length; colIndex++) {
          heatmapData.push({
            x: table.headers[colIndex],
            y: row[0],
            v: parseFloat(row[colIndex]) || 0
          });
        }
      });
      return {
        datasets: [{
          label: table.title,
          data: heatmapData,
          backgroundColor: function(context) {
            const value = context.parsed.v;
            const max = Math.max(...heatmapData.map(d => d.v));
            const opacity = value / max;
            return `rgba(59, 130, 246, ${opacity})`;
          }
        }]
      };

    case 'pie':
    case 'bar':
    case 'line':
    case 'area':
    default:
      if (numColumns === 2) {
        // Simple label-value pairs
        return {
          labels: table.rows.map(row => row[0]),
          datasets: [{
            label: table.headers[1],
            data: table.rows.map(row => parseFloat(row[1]) || 0),
            backgroundColor: chartType === 'pie' ? 
              generateColorPalette(table.rows.length) : 
              generateColorPalette(1)[0],
            borderColor: chartType === 'pie' ? 
              generateColorPalette(table.rows.length) : 
              generateColorPalette(1)[0],
            borderWidth: chartType === 'pie' ? 2 : 3
          }]
        };
      } else if (numColumns > 2) {
        // Multiple series
        const labels = table.rows.map(row => row[0]);
        const datasets = [];
        
        for (let i = 1; i < numColumns; i++) {
          datasets.push({
            label: table.headers[i],
            data: table.rows.map(row => parseFloat(row[i]) || 0),
            backgroundColor: generateColorPalette(1, i)[0],
            borderColor: generateColorPalette(1, i)[0],
            borderWidth: 3,
            fill: chartType === 'area'
          });
        }
        
        return { labels, datasets };
      }
  }

  return null;
}

// ─── Generate color palette ─────────────────────────────────────────────────
function generateColorPalette(count, seed = 0) {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
    '#14B8A6', '#F97316', '#8B5CF6', '#06B6D4', '#EF4444'
  ];
  
  const palette = [];
  for (let i = 0; i < count; i++) {
    palette.push(colors[(i + seed) % colors.length]);
  }
  return palette;
}

// Create singleton instance of the multi-agent system
const dataExtractor = new DataExtractionAgent();

module.exports = {
  extractDataTables: (text, brandName) => dataExtractor.extractDataTables(text, brandName),
  generateChartConfigs,
  DataExtractionAgent
}; 