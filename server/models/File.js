// server/models/File.js
const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    sensitive: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    collection: "filemanger"    // ← force Mongoose to use that exact collection name
  }
);

module.exports = mongoose.model("File", FileSchema);
