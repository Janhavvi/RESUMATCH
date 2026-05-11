import express from "express";
import multer from "multer";
import { parseResume } from "../services/parser.js";
import { runJobMatch, runResumeAnalysis } from "../services/ai.js";
import db from "../lib/db.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path: filePath, mimetype, originalname } = req.file;
    const text = await parseResume(filePath, mimetype, originalname);

    // Local default user (seeded in db init).
    const defaultUser = db.prepare("SELECT id FROM users WHERE id = 1").get();
    const userId = defaultUser?.id || 1;

    const stmt = db.prepare("INSERT INTO resumes (user_id, filename, content) VALUES (?, ?, ?)");
    const result = stmt.run(userId, originalname, text);

    res.json({
      id: result.lastInsertRowid,
      filename: originalname,
      text: text,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process resume" });
  }
});

router.get("/all", (req, res) => {
  const resumes = db.prepare("SELECT * FROM resumes WHERE user_id = 1 ORDER BY created_at DESC").all();
  res.json(resumes);
});

router.post("/update-analysis", (req, res) => {
    const { id, analysis, ats_score } = req.body;
    const stmt = db.prepare("UPDATE resumes SET analysis = ?, ats_score = ? WHERE id = ?");
    stmt.run(JSON.stringify(analysis), ats_score, id);
    res.json({ success: true });
});

router.post("/analyze", async (req, res) => {
  try {
    const { id, text } = req.body || {};
    let resumeId = id;
    let resumeText = text;

    if (!resumeText && resumeId) {
      const row = db.prepare("SELECT id, content FROM resumes WHERE id = ?").get(resumeId);
      if (!row) return res.status(404).json({ error: "Resume not found" });
      resumeText = row.content;
      resumeId = row.id;
    }

    if (!resumeText) {
      const latest = db.prepare("SELECT id, content FROM resumes WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1").get();
      if (!latest) return res.status(400).json({ error: "No resume content available" });
      resumeText = latest.content;
      resumeId = latest.id;
    }

    const analysis = await runResumeAnalysis(resumeText);
    db.prepare("UPDATE resumes SET analysis = ?, ats_score = ? WHERE id = ?").run(
      JSON.stringify(analysis),
      analysis.atsScore ?? null,
      resumeId
    );

    res.json({ id: resumeId, analysis });
  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({ error: "Failed to analyze resume" });
  }
});

router.post("/job-match", async (req, res) => {
  try {
    const { jobDescription, resumeText } = req.body || {};
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: "Job description is required" });
    }

    let text = resumeText;
    if (!text) {
      const latest = db.prepare("SELECT content FROM resumes WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1").get();
      if (!latest) return res.status(400).json({ error: "Please upload a resume first." });
      text = latest.content;
    }

    const match = await runJobMatch(text, jobDescription);
    res.json(match);
  } catch (error) {
    console.error("Job match error:", error);
    res.status(500).json({ error: "Failed to run job match" });
  }
});

export default router;
