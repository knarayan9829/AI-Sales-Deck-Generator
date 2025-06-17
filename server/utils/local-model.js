const path = require("path");
const fs = require("fs");

/**
 * Local text processing functions for sensitive documents
 * These functions provide basic text analysis without using external APIs
 */

// Simple keyword extraction using frequency analysis
function extractKeywords(text, maxKeywords = 10) {
  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'whose', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can'
  ]);

  // Clean and tokenize text
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Count word frequencies
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

// Simple sentence extraction for summarization
function extractImportantSentences(text, maxSentences = 3) {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length <= maxSentences) {
    return sentences;
  }

  // Score sentences based on keyword density
  const keywords = extractKeywords(text, 20);
  const keywordSet = new Set(keywords);

  const scoredSentences = sentences.map(sentence => {
    const words = sentence.toLowerCase().split(/\s+/);
    const keywordCount = words.filter(word => keywordSet.has(word)).length;
    const score = keywordCount / words.length;
    return { sentence, score };
  });

  return scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map(item => item.sentence);
}

// Generate a basic summary from text
function generateSummary(text, maxLength = 250) {
  if (text.length <= maxLength) {
    return text;
  }

  const importantSentences = extractImportantSentences(text, 3);
  const summary = importantSentences.join('. ');
  
  if (summary.length <= maxLength) {
    return summary;
  }

  // Truncate if still too long
  return summary.substring(0, maxLength - 3) + '...';
}

// Extract key business metrics and data points
function extractBusinessMetrics(text) {
  const metrics = [];
  
  // Common patterns for business metrics
  const patterns = [
    /revenue.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
    /profit.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
    /growth.*?[\d,]+[\.\d]*%?/gi,
    /market share.*?[\d,]+[\.\d]*%?/gi,
    /customers?.*?[\d,]+[\.\d]*[kmb]?/gi,
    /users?.*?[\d,]+[\.\d]*[kmb]?/gi,
    /sales.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
    /[\d,]+[\.\d]*%\s*(?:increase|decrease|growth|decline)/gi,
  ];

  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      metrics.push(...matches.slice(0, 3)); // Limit to 3 matches per pattern
    }
  });

  return metrics.slice(0, 10); // Return max 10 metrics
}

// Generate plot data based on local analysis
function generateLocalPlotData(text) {
  const keywords = extractKeywords(text, 8);
  const metrics = extractBusinessMetrics(text);
  
  const plots = [];

  // Keyword frequency plot
  if (keywords.length > 3) {
    const wordCount = {};
    const words = text.toLowerCase().split(/\s+/);
    keywords.forEach(keyword => {
      wordCount[keyword] = words.filter(word => word.includes(keyword)).length;
    });

    plots.push({
      title: "Key Topics Frequency",
      type: "bar",
      labels: keywords.slice(0, 5),
      values: keywords.slice(0, 5).map(k => wordCount[k] || 1)
    });
  }

  // Business metrics plot (if numbers found)
  const numbers = text.match(/\d+/g);
  if (numbers && numbers.length > 3) {
    const numericValues = numbers
      .map(n => parseInt(n))
      .filter(n => n > 0 && n < 1000000)
      .slice(0, 5);
    
    if (numericValues.length > 2) {
      plots.push({
        title: "Key Metrics Overview",
        type: "line",
        labels: numericValues.map((_, i) => `Metric ${i + 1}`),
        values: numericValues
      });
    }
  }

  return plots;
}

// Main function to process sensitive documents locally
async function processSensitiveDocument(text) {
  try {
    const summary = generateSummary(text, 300);
    const keywords = extractKeywords(text, 10);
    const metrics = extractBusinessMetrics(text);
    const plotData = generateLocalPlotData(text);

    return {
      summary,
      keywords,
      metrics,
      plotData,
      processedLocally: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error processing sensitive document locally:", error);
    return {
      summary: "Document processed locally with limited analysis due to security constraints.",
      keywords: [],
      metrics: [],
      plotData: [],
      processedLocally: true,
      error: error.message
    };
  }
}

// Generate business insights from local analysis
function generateLocalInsights(analysisResults) {
  const insights = [];
  
  if (analysisResults.keywords.length > 0) {
    insights.push(`Key focus areas include: ${analysisResults.keywords.slice(0, 5).join(', ')}`);
  }
  
  if (analysisResults.metrics.length > 0) {
    insights.push(`Important business metrics identified: ${analysisResults.metrics.slice(0, 3).join(', ')}`);
  }
  
  insights.push("Analysis completed using secure local processing to protect sensitive information.");
  
  return insights.join(' ');
}

module.exports = {
  processSensitiveDocument,
  generateSummary,
  extractKeywords,
  extractBusinessMetrics,
  generateLocalPlotData,
  generateLocalInsights
}; 