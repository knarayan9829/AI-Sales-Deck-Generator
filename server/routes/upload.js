// server/routes/upload.js
const express = require("express");
const multer  = require("multer");
const path   = require("path");
const fs     = require("fs");
const File   = require("../models/File");

const router = express.Router();

// Ensure the uploads directory exists:
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}-${sanitized}`);
  },
});

const upload = multer({ storage });

// ====== POST /api/upload ======
router.post("/", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files were uploaded." });
    }

    // Get sensitive flags from request body (should be array of booleans)
    const sensitiveFlags = req.body.sensitive ? JSON.parse(req.body.sensitive) : [];

    const fileDocs = await Promise.all(
      req.files.map((f, index) => {
        const isSensitive = sensitiveFlags[index] || false;
        const newFile = new File({
          name: f.originalname,
          url: `/uploads/${encodeURIComponent(f.filename)}`,
          size: f.size,
          mimeType: f.mimetype,
          sensitive: isSensitive,
        });
        return newFile.save();
      })
    );

    return res.status(201).json({ files: fileDocs });
  } catch (err) {
    console.error("Error in POST /api/upload:", err);
    return res.status(500).json({ error: "Server error while uploading files." });
  }
});

// ====== GET /api/upload ======
router.get("/", async (req, res) => {
  try {
    const allFiles = await File.find().sort({ uploadDate: -1 });
    const files = allFiles.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      url: doc.url,
      size: doc.size,
      mimeType: doc.mimeType,
      uploadDate: doc.uploadDate,
      sensitive: doc.sensitive,
    }));
    return res.json({ files });
  } catch (err) {
    console.error("Error in GET /api/upload:", err);
    return res.status(500).json({ error: "Server error while listing files." });
  }
});

// ====== DELETE /api/upload/:id ======
// Deletes a file document and its disk file.
router.delete("/:id", async (req, res) => {
  const fileId = req.params.id;
  try {
    // 1) Find the document
    const doc = await File.findById(fileId);
    if (!doc) {
      return res.status(404).json({ error: "File not found." });
    }

    // 2) Unlink the file from disk
    const filenameOnDisk = doc.url.replace("/uploads/", ""); 
    //  doc.url is "/uploads/1234567890-filename.ext"
    const filePath = path.join(uploadDir, filenameOnDisk);

    fs.unlink(filePath, (err) => {
      if (err && err.code !== "ENOENT") {
        console.error("Error unlinking file:", err);
        // We won’t abort the deletion of the DB doc unless unlink fails catastrophically
      }
    });

    // 3) Delete the MongoDB document
    await File.findByIdAndDelete(fileId);

    return res.json({ message: "File deleted successfully." });
  } catch (err) {
    console.error("Error in DELETE /api/upload/:id:", err);
    return res.status(500).json({ error: "Server error while deleting file." });
  }
});

module.exports = router;
