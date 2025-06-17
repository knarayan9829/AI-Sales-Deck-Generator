// server/models/Deck.js
const mongoose = require("mongoose");

const DeckSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true },
    shortDescription: { type: String, required: true },
    longDescription: { type: String, required: true },
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    logoUrl: { type: String, required: true },
    relevantFileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    videoFileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    documentFileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    deckUrl: { type: String, required: true }, // e.g. "/decks/brand-slug.html"
    chartConfigs: [{ 
      type: mongoose.Schema.Types.Mixed,
      default: []
    }], // Chart configurations for React frontend
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: { tables: [], keyMetrics: [], timeSeriesData: [] }
    }, // Raw extracted data tables and metrics
    competitorAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }, // Competitor analysis results
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false
  }
);

// Force collection name if you want (optional):
// { collection: "decks" }

module.exports = mongoose.model("Deck", DeckSchema);
