// server/routes/decks.js
const express   = require("express");
const path      = require("path");
const fs        = require("fs");
const csvParser = require("csv-parser");            // for basic CSV reading
const { ChartJSNodeCanvas } = require("chartjs-node-canvas"); 
const File      = require("../models/File");
const Deck      = require("../models/Deck");
const openai    = require("../utils/openai-wrapper"); // assume you have a ChatGPT wrapper here

const router = express.Router();

// Directory where we will write generated deck HTML
const decksDir = path.join(__dirname, "../decks");
if (!fs.existsSync(decksDir)) {
  fs.mkdirSync(decksDir, { recursive: true });
}

// ------------------------------
// Helper: generate a “slug” from brand name
// ------------------------------
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ------------------------------
// Helper: read a CSV and produce a simple plot image (PNG buffer)
// You can replace this with any plotting logic you prefer.
// ------------------------------
async function generatePlotFromCSV(filePath, outputImagePath) {
  return new Promise((resolve, reject) => {
    // 1) Read CSV into an array of { header1: value1, header2: value2, … }
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        try {
          if (rows.length === 0) {
            return reject(new Error("CSV is empty"));
          }

          // 2) Pick the first two numeric columns (for demonstration)
          const headers = Object.keys(rows[0]);
          const numericHeaders = headers.filter((h) =>
            !isNaN(parseFloat(rows[0][h]))
          );
          if (numericHeaders.length < 2) {
            return reject(
              new Error("Need at least two numeric columns to plot")
            );
          }
          const xKey = numericHeaders[0];
          const yKey = numericHeaders[1];

          const labels = rows.map((r) => r[xKey]);
          const dataPoints = rows.map((r) => parseFloat(r[yKey]));

          // 3) Use ChartJSNodeCanvas to make a simple line chart
          const width = 800; // px
          const height = 400; // px
          const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

          const configuration = {
            type: "line",
            data: {
              labels,
              datasets: [
                {
                  label: `${yKey} vs ${xKey}`,
                  data: dataPoints,
                  fill: false,
                  borderColor: "rgba(75, 192, 192, 1)",
                  tension: 0.1,
                },
              ],
            },
            options: {
              scales: {
                x: { display: true, title: { display: true, text: xKey } },
                y: { display: true, title: { display: true, text: yKey } },
              },
            },
          };

          const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
          // Write the PNG to disk
          fs.writeFileSync(outputImagePath, buffer);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

// ------------------------------
// POST /api/decks
// Create a new sales deck based on the submitted form.
// ------------------------------
router.post("/", async (req, res) => {
  try {
    const {
      brandName,
      shortDescription,
      primaryColor,
      secondaryColor,
      logoFileId,
      relevantFileIds = [],
      videoFileIds = [],
      documentFileIds = [],
    } = req.body;

    // 1) Fetch the “logo” File document to get its URL on disk
    const logoDoc = await File.findById(logoFileId);
    if (!logoDoc) {
      return res.status(400).json({ error: "Invalid logoFileId." });
    }
    const logoDiskPath = path.join(
      __dirname,
      "../uploads",
      decodeURIComponent(logoDoc.url.replace("/uploads/", ""))
    );

    // 2) Generate plots for every “relevantFileId” that is a CSV
    //    We will write each plot to /decks/plots/<slug>-<idx>.png
    const deckSlug = slugify(brandName);
    const plotOutputDir = path.join(decksDir, "plots");
    if (!fs.existsSync(plotOutputDir)) {
      fs.mkdirSync(plotOutputDir, { recursive: true });
    }

    const plotFilenames = [];
    for (let i = 0; i < relevantFileIds.length; i++) {
      const fileId = relevantFileIds[i];
      const fileDoc = await File.findById(fileId);
      if (!fileDoc) continue;

      const diskFilename = decodeURIComponent(fileDoc.url.replace("/uploads/", ""));
      const diskPath = path.join(__dirname, "../uploads", diskFilename);

      // Only attempt plotting if it ends in “.csv”
      if (diskPath.toLowerCase().endsWith(".csv")) {
        const outPng = `${deckSlug}-plot-${i + 1}.png`;
        const outputImagePath = path.join(plotOutputDir, outPng);
        await generatePlotFromCSV(diskPath, outputImagePath);
        plotFilenames.push(`/decks/plots/${outPng}`);
      }
    }

    // 3) Gather all “brand document” contents (plain-text) to pass into ChatGPT
    let aggregatedText = "";
    for (const fileId of documentFileIds) {
      const fileDoc = await File.findById(fileId);
      if (!fileDoc) continue;

      const diskFilename = decodeURIComponent(fileDoc.url.replace("/uploads/", ""));
      const diskPath = path.join(__dirname, "../uploads", diskFilename);

      // Only handle .txt or .md for simplicity (you can extend for PDF, DOCX, etc.)
      if (diskPath.toLowerCase().endsWith(".txt") || diskPath.toLowerCase().endsWith(".md")) {
        const content = fs.readFileSync(diskPath, "utf-8");
        aggregatedText += "\n\n" + content;
      }
      // If you need to parse PDFs or Word docs, plug in your own parser here.
    }

    // 4) Call ChatGPT wrapper to produce a “longDescription”
    //    (your openai-wrapper should return a string)
    const chatPrompt = `
You are a sales deck generator. Using the following brand name, short description, and the combined text of the brand’s documents, write a cohesive, detailed, long description of the brand. 

Brand Name: ${brandName}
Short Description: ${shortDescription}

Combined Documents Text:
${aggregatedText}

Please produce a single well-structured long description, around 200–300 words.
    `.trim();

    const longDescription = await openai.generateText(chatPrompt);

    // 5) Build the HTML for this sales deck
    //    We’ll create a basic HTML page under /decks/<slug>.html
    const deckFilename = `${deckSlug}.html`;
    const deckFilePath = path.join(decksDir, deckFilename);

    let htmlSections = "";

    // 5a) Section 1: Logo + shortDescription
    htmlSections += `
      <section style="padding: 2rem; background-color: ${primaryColor}; color: white;">
        <div style="display: flex; align-items: center;">
          <img src="../uploads/${decodeURIComponent(logoDoc.url.replace("/uploads/", ""))}" 
               alt="Logo for ${brandName}" 
               style="max-height: 100px; margin-right: 1rem;" />
          <div>
            <h1 style="margin: 0;">${brandName}</h1>
            <p style="margin: 0.5rem 0;">${shortDescription}</p>
          </div>
        </div>
      </section>
    `;

    // 5b) Section 2: Embedded Videos
    if (videoFileIds.length > 0) {
      htmlSections += `
        <section style="padding: 2rem; background-color: ${secondaryColor}; color: #333;">
          <h2>Brand Videos</h2>
          <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
      `;
      for (const fileId of videoFileIds) {
        const videoDoc = await File.findById(fileId);
        if (!videoDoc) continue;
        // Assume these are MP4 or similar; display via <video>
        const videoRelPath = `../uploads/${decodeURIComponent(videoDoc.url.replace("/uploads/", ""))}`;
        htmlSections += `
            <video width="320" height="240" controls>
              <source src="${videoRelPath}" type="${videoDoc.mimeType}" />
              Your browser does not support the video tag.
            </video>
        `;
      }
      htmlSections += `
          </div>
        </section>
      `;
    }

    // 5c) Section 3: Plots
    if (plotFilenames.length > 0) {
      htmlSections += `
        <section style="padding: 2rem; background-color: #f9f9f9; color: #333;">
          <h2>Data-Driven Plots</h2>
          <div style="display: flex; flex-direction: column; gap: 2rem;">
      `;
      for (const plotUrl of plotFilenames) {
        htmlSections += `<img src="${plotUrl}" alt="Plot for ${brandName}" style="max-width: 100%; height: auto;" />`;
      }
      htmlSections += `
          </div>
        </section>
      `;
    }

    // 5d) Section 4: Long Description (from ChatGPT)
    htmlSections += `
      <section style="padding: 2rem; background-color: white; color: #333;">
        <h2>About ${brandName}</h2>
        <p>${longDescription}</p>
      </section>
    `;

    // 5e) Section 5: Brand Documents as Downloadable Links
    if (documentFileIds.length > 0) {
      htmlSections += `
        <section style="padding: 2rem; background-color: ${secondaryColor}; color: #333;">
          <h2>Brand Documents</h2>
          <ul>
      `;
      for (const fileId of documentFileIds) {
        const docFile = await File.findById(fileId);
        if (!docFile) continue;
        const docRelPath = `../uploads/${decodeURIComponent(docFile.url.replace("/uploads/", ""))}`;
        htmlSections += `
            <li>
              <a href="${docRelPath}" style="color: #0066cc; text-decoration: underline;" download>
                ${docFile.name}
              </a>
            </li>
        `;
      }
      htmlSections += `
          </ul>
        </section>
      `;
    }

    // 6) Write the final HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sales Deck - ${brandName}</title>
      </head>
      <body style="margin: 0; font-family: Arial, sans-serif;">
        ${htmlSections}
      </body>
      </html>
    `;

    fs.writeFileSync(deckFilePath, fullHtml, "utf-8");

    // 7) Persist a Deck document in MongoDB
    const newDeck = new Deck({
      brandName,
      shortDescription,
      longDescription,
      primaryColor,
      secondaryColor,
      logoUrl: logoDoc.url, // stored in /uploads
      relevantFileIds,
      videoFileIds,
      documentFileIds,
      deckUrl: `/decks/${deckFilename}`, 
    });
    await newDeck.save();

    // 8) Return the new deck info
    return res.status(201).json({ deck: newDeck });
  } catch (err) {
    console.error("Error in POST /api/decks:", err);
    return res.status(500).json({ error: "Server error creating sales deck." });
  }
});

// ------------------------------
// GET /api/decks
// List all saved decks
// ------------------------------
router.get("/", async (req, res) => {
  try {
    const allDecks = await Deck.find().sort({ createdAt: -1 });
    // Return minimal info
    const decks = allDecks.map((d) => ({
      _id: d._id,
      brandName: d.brandName,
      deckUrl: d.deckUrl,
      createdAt: d.createdAt,
    }));
    return res.json({ decks });
  } catch (err) {
    console.error("Error in GET /api/decks:", err);
    return res.status(500).json({ error: "Server error listing decks." });
  }
});

module.exports = router;
