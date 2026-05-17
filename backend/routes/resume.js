import express from "express";
import multer from "multer";
import { parseResume } from "../services/parser.js";
import { runJobMatch, runResumeAnalysis, runResumeAssistant, generateProfessionalSummary, improveWorkDescription, generateAchievements, improveProjectDescription } from "../services/ai.js";
import { generateResumePDF } from "../services/pdf.js";
import { uploadToBlob } from "../services/blob.js";
import db from "../lib/db.js";

const router = express.Router();
const uploadsDir = process.env.UPLOAD_DIR || "uploads/";
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || (process.env.NODE_ENV === "production" ? 10 : 50));

// Multer configuration. Render can accept larger uploads than serverless hosts.
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { path: filePath, mimetype, originalname } = req.file;
    
    // Parse resume content from file
    const text = await parseResume(filePath, mimetype, originalname);

    // Local default user (seeded in db init)
    const defaultUser = db.prepare("SELECT id FROM users WHERE id = 1").get();
    const userId = defaultUser?.id || 1;

    // Generate unique filename for blob storage
    const timestamp = Date.now();
    const blobFilename = `resumes/${userId}/${timestamp}-${originalname}`;

    // Upload to Vercel Blob (if configured) or keep local file
    let blobData = null;
    try {
      const fs = await import("fs/promises");
      const fileBuffer = await fs.readFile(filePath);
      blobData = await uploadToBlob(fileBuffer, blobFilename, mimetype);
    } catch (blobError) {
      console.warn("Failed to upload to blob storage, using local fallback:", blobError.message);
      // Continue with local storage as fallback
      blobData = {
        url: filePath,
        size: req.file.size,
      };
    }

    // Store resume metadata in database
    const stmt = db.prepare("INSERT INTO resumes (user_id, filename, content, blob_url) VALUES (?, ?, ?, ?)");
    const result = stmt.run(userId, originalname, text, blobData?.url || null);

    res.json({
      id: result.lastInsertRowid,
      filename: originalname,
      text: text,
      blobUrl: blobData?.url || null,
    });
  } catch (error) {
    console.error("Upload error:", error);
    
    // Return appropriate error based on error type
    if (error.message.includes("File too large") || error.message.includes("fileSize")) {
      return res.status(413).json({ error: `File is too large. Maximum size is ${maxUploadMb}MB for this deployment.` });
    }
    if (error.message.includes("Invalid file type")) {
      return res.status(400).json({ error: error.message });
    }
    
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

/**
 * Generate PDF from resume data - only includes filled fields
 */
router.post("/generate-pdf", async (req, res) => {
  try {
    const { resumeData } = req.body;
    if (!resumeData) {
      return res.status(400).json({ error: "Resume data is required" });
    }

    const pdfBuffer = await generateResumePDF(resumeData);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=resume.pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

/**
 * Generate professional summary using AI
 */
router.post("/ai/generate-summary", async (req, res) => {
  try {
    const { name, role, skills, experience, variationSeed, currentSummary } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const summary = await generateProfessionalSummary(
      name || "",
      role,
      skills || "",
      experience || "",
      variationSeed,
      currentSummary || ""
    );
    
    if (!summary) {
      return res.status(500).json({ error: "Failed to generate summary - no content returned" });
    }
    
    res.json({ summary });
  } catch (error) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate summary" });
  }
});

/**
 * Improve work experience description using AI
 */
router.post("/ai/improve-work-description", async (req, res) => {
  try {
    const { role, company, responsibilities } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const improved = await improveWorkDescription(role, company || "", responsibilities || "");
    res.json({ improved });
  } catch (error) {
    console.error("Work description improvement error:", error);
    res.status(500).json({ error: "Failed to improve description" });
  }
});

/**
 * Generate achievement suggestions using AI
 */
router.post("/ai/generate-achievements", async (req, res) => {
  try {
    const { role, skills, industry } = req.body;
    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    const achievements = await generateAchievements(role, skills || "", industry || "");
    res.json({ achievements });
  } catch (error) {
    console.error("Achievements generation error:", error);
    res.status(500).json({ error: "Failed to generate achievements" });
  }
});

/**
 * Improve project description using AI
 */
router.post("/ai/improve-project", async (req, res) => {
  try {
    const { projectName, technologies, details } = req.body;
    if (!projectName) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const improved = await improveProjectDescription(projectName, technologies || "", details || "");
    res.json({ improved });
  } catch (error) {
    console.error("Project improvement error:", error);
    res.status(500).json({ error: "Failed to improve project description" });
  }
});

/**
 * Conversational resume assistant with ATS analysis and section-level guidance
 */
router.post("/ai/assistant", async (req, res) => {
  try {
    const { question, resumeData, section } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const result = await runResumeAssistant(question, resumeData || {}, section || "overall");
    res.json(result);
  } catch (error) {
    console.error("Resume assistant error:", error);
    res.status(500).json({ error: "Failed to run resume assistant" });
  }
});

/**
 * Test Nvidia API connectivity (for debugging)
 */
router.get("/ai/test", async (req, res) => {
  try {
    const apiKey = process.env.NVIDIA_API_KEY;
    const model = process.env.NVIDIA_MODEL;
    
    if (!apiKey) {
      return res.json({
        status: "error",
        message: "NVIDIA_API_KEY not configured",
        configured: false
      });
    }

    // Test a simple API call
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "nvidia/llama-2-70b-chat",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant. Respond with a single sentence."
          },
          {
            role: "user",
            content: "Say 'Nvidia AI is working!'",
          },
        ],
        temperature: 0.5,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.json({
        status: "error",
        message: `Nvidia API returned ${response.status}`,
        details: errorData,
        configured: true
      });
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "No response";
    
    res.json({
      status: "success",
      configured: true,
      model: model || "nvidia/llama-2-70b-chat",
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Nvidia API test error:", error);
    res.json({
      status: "error",
      message: error.message,
      configured: !!process.env.NVIDIA_API_KEY
    });
  }
});

export default router;
