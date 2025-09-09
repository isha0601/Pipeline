import "dotenv/config";
import express from "express";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import cors from "cors";
import { processAndIndex, listHistory, semanticSearch } from "./pipeline.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // allow your frontend
    credentials: true,
  })
);
const upload = multer({ dest: "uploads/" });

app.use(express.json());

// Health
app.get("/health", (_, res) => res.json({ ok: true }));

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const userId = req.body.user_id || null;

    const doc = await processAndIndex({
      tmpPath: req.file.path,
      fileName: req.file.originalname,
      mime: req.file.mimetype,
      sizeBytes: req.file.size,
      userId,
    });

    // cleanup temp file
    await fs.unlink(req.file.path).catch(() => {});
    res.json({ document: doc });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// History
app.get("/history", async (req, res) => {
  try {
    const userId = req.query.user_id || null;
    const items = await listHistory({ userId });
    res.json({ documents: items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search
app.get("/search", async (req, res) => {
  try {
    const { q, topK, documentId } = req.query;
    if (!q) return res.status(400).json({ error: "Missing ?q=" });
    const results = await semanticSearch({
      query: q,
      topK: topK ? Number(topK) : 5,
      documentId: documentId || null,
    });
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening http://localhost:${port}`));
