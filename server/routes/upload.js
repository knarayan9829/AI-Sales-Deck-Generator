const express   = require("express");
const multer    = require("multer");
const fs        = require("fs");
const path      = require("path");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "server/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// POST /api/upload
router.post("/", upload.array("files"), (req, res) => {
  const uploaded = req.files.map((file) => file.filename);
  res.json({ message: "Files uploaded", files: uploaded });
});

// GET /api/upload
router.get("/", (req, res) => {
  const uploadDir = path.join(__dirname, "../uploads");

  fs.readdir(uploadDir, (err, filenames) => {
    if (err) {
      console.error("Error reading upload directory:", err);
      return res.status(500).json({ error: "Unable to list uploaded files." });
    }

    const files = filenames.map((name) => ({
      name,
      url: `/uploads/${encodeURIComponent(name)}`,
    }));
    res.json({ files });
  });
});

module.exports = router;