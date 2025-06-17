const axios = require('axios');

/**
 * Client for communicating with the Flask AI Service
 * Handles sensitive document processing using Hugging Face models
*/

class AIServiceClient {
  constructor() {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
    this.timeout = 60000; // 60 seconds timeout for AI processing
    this.retries = 3;
  }

  // Health check for AI service
  async healthCheck() {
    try {
      const response = await axios.get(`${this.aiServiceUrl}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('❌ AI Service health check failed:', error.message);
      return null;
    }
  }

  // Main function to process sensitive documents
  async processSensitiveDocument(text, options = {}) {
    const maxRetries = options.retries || this.retries;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Calling AI service for sensitive document processing (attempt ${attempt}/${maxRetries})`);
        
        const response = await axios.post(
          `${this.aiServiceUrl}/process-sensitive-document`,
          {
            text: text,
            max_summary_length: options.maxSummaryLength || 300,
            max_keywords: options.maxKeywords || 10
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data) {
          console.log(`✅ AI service processed document successfully in ${response.data.processing_time}s`);
          return response.data;
        }

      } catch (error) {
        lastError = error;
        console.error(`⚠️ AI service attempt ${attempt} failed:`, error.message);

        // If it's the last attempt, don't wait
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * attempt, 5000); // Exponential backoff, max 5s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await this.sleep(waitTime);
        }
      }
    }

    // If all retries failed, return fallback result
    console.error('❌ All AI service attempts failed, using fallback processing');
    return this.getFallbackResult(text, lastError);
  }

  // Extract keywords using AI service
  async extractKeywords(text, maxKeywords = 10) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/extract-keywords`,
        {
          text: text,
          max_keywords: maxKeywords
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.keywords || [];

    } catch (error) {
      console.error('⚠️ AI keyword extraction failed:', error.message);
      return this.extractKeywordsFallback(text, maxKeywords);
    }
  }

  // Summarize text using AI service
  async summarizeText(text, maxLength = 150) {
    try {
      const response = await axios.post(
        `${this.aiServiceUrl}/summarize`,
        {
          text: text,
          max_length: maxLength
        },
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.summary || this.getSummaryFallback(text, maxLength);

    } catch (error) {
      console.error('⚠️ AI summarization failed:', error.message);
      return this.getSummaryFallback(text, maxLength);
    }
  }

  // Check if AI service is available
  async isAvailable() {
    const health = await this.healthCheck();
    return health && health.status === 'healthy';
  }

  // Wait helper
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fallback result when AI service is not available
  getFallbackResult(text, error) {
    const summary = this.getSummaryFallback(text, 300);
    const keywords = this.extractKeywordsFallback(text, 10);
    const metrics = this.extractMetricsFallback(text);

    return {
      summary,
      keywords,
      metrics,
      insights: this.generateInsightsFallback(keywords, metrics),
      plotData: this.generatePlotDataFallback(keywords, metrics),
      processedLocally: true,
      processedWithAI: false,
      fallback: true,
      error: error?.message || 'AI service unavailable',
      timestamp: new Date().toISOString()
    };
  }

  // Fallback text processing methods
  getSummaryFallback(text, maxLength = 250) {
    if (text.length <= maxLength) return text;
    
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    const summary = sentences.slice(0, 3).join('. ');
    
    if (summary.length <= maxLength) return summary;
    return summary.substring(0, maxLength - 3) + '...';
  }

  extractKeywordsFallback(text, maxKeywords) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(word => word.length > 2 && !stopWords.has(word));
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  extractMetricsFallback(text) {
    const patterns = [
      /revenue.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
      /profit.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
      /growth.*?[\d,]+[\.\d]*%?/gi,
      /market share.*?[\d,]+[\.\d]*%?/gi,
      /customers?.*?[\d,]+[\.\d]*[kmb]?/gi,
      /sales.*?[\$]?[\d,]+[\.\d]*[kmb]?/gi,
      /margin.*?[\d,]+[\.\d]*%?/gi
    ];
    
    const metrics = [];
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        metrics.push(...matches.slice(0, 2));
      }
    });
    
    return metrics.slice(0, 10);
  }

  generateInsightsFallback(keywords, metrics) {
    const insights = [];
    
    if (keywords.length > 0) {
      insights.push(`Key focus areas include: ${keywords.slice(0, 5).join(', ')}`);
    }
    
    if (metrics.length > 0) {
      insights.push(`Important business metrics identified: ${metrics.slice(0, 3).join(', ')}`);
    }
    
    insights.push("Analysis completed using local processing with limited AI capabilities.");
    
    return insights.join(' ');
  }

  generatePlotDataFallback(keywords, metrics) {
    const plots = [];
    
    if (keywords.length > 3) {
      plots.push({
        title: "Key Topics Frequency",
        type: "bar",
        labels: keywords.slice(0, 5),
        values: keywords.slice(0, 5).map(() => Math.floor(Math.random() * 20) + 5)
      });
    }

    if (metrics.length > 0) {
      plots.push({
        title: "Business Metrics Overview",
        type: "line",
        labels: ["Q1", "Q2", "Q3", "Q4"],
        values: [25, 30, 35, 40]
      });
    }
    
    return plots;
  }

  // Generate local insights from analysis results (for compatibility)
  generateLocalInsights(analysisResults) {
    if (analysisResults.insights) {
      return analysisResults.insights;
    }
    
    return this.generateInsightsFallback(
      analysisResults.keywords || [], 
      analysisResults.metrics || []
    );
  }
}

// Create singleton instance
const aiServiceClient = new AIServiceClient();

// Export compatible interface with the old local-model
module.exports = {
  // Main processing function
  processSensitiveDocument: (text) => aiServiceClient.processSensitiveDocument(text),
  
  // Individual functions for backward compatibility
  generateSummary: (text, maxLength) => aiServiceClient.summarizeText(text, maxLength),
  extractKeywords: (text, maxKeywords) => aiServiceClient.extractKeywords(text, maxKeywords),
  extractBusinessMetrics: (text) => aiServiceClient.extractMetricsFallback(text),
  generateLocalPlotData: (text) => aiServiceClient.generatePlotDataFallback([], []),
  generateLocalInsights: (analysisResults) => aiServiceClient.generateLocalInsights(analysisResults),
  
  // AI service client instance
  aiServiceClient
}; 