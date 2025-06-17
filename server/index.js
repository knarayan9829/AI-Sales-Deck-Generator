require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");
const path      = require("path");

// Import your upload routes
const uploadRoutes = require("./routes/upload");
// Import the new decks router
const deckRoutes   = require("./routes/decks");

const app = express();

// ==== MONGOOSE SETUP ====
mongoose.set("strictQuery", false);
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("⚠️  MONGO_URI is not defined in .env");
  process.exit(1);
}
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅  Connected to MongoDB"))
  .catch((err) => {
    console.error("❌  MongoDB connection error:", err);
    process.exit(1);
  });

// ==== MIDDLEWARE ====
app.use(cors());
app.use(express.json());

// Serve files from "server/uploads" at the /uploads endpoint:
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve generated decks (HTML) at /decks:
app.use("/decks", express.static(path.join(__dirname, "decks")));

// Mount your upload router at /api/upload
app.use("/api/upload", uploadRoutes);
// Mount the decks router at /api/decks
app.use("/api/decks", deckRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
