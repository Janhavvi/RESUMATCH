import express from "express";
import { InterviewSession, Resume } from "../lib/models.js";
import { isMongoDBAvailable } from "../lib/db-adapter.js";
import db from "../lib/db.js";
import PDFDocument from "pdfkit";
import { generateInterviewQuestions, evaluateInterviewAnswer, generateFreshDetailedInterviewQuestions } from "../services/ai.js";

const router = express.Router();
const INTERVIEW_GENERATION_TIMEOUT_MS = 25000;

function localUserId(req) {
  return req.user?.id || (isMongoDBAvailable() ? "000000000000000000000001" : 1);
}

function normalizeSession(session) {
  if (!session) return null;
  if (session.toObject) {
    const obj = session.toObject();
    return {
      id: obj._id?.toString(),
      ...obj,
      questions: obj.questions || [],
      status: obj.status || (obj.completedAt ? "Completed" : "Incomplete"),
    };
  }
  const questions = JSON.parse(session.questions_json || "[]");
  return {
    id: String(session.id),
    userId: session.user_id,
    resumeName: session.resume_name,
    resumeText: session.resume_text,
    questions,
    overallScore: session.overall_score,
    status: session.status || "Incomplete",
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

function scoreSession(questions = []) {
  const scores = questions.map((q) => Number(q.score)).filter((score) => Number.isFinite(score));
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}

function isCompleted(questions = []) {
  return questions.length > 0 && questions.every((q) => String(q.userAnswer || "").trim());
}

function fallbackInterviewQuestions(resumeText = "") {
  const lower = String(resumeText).toLowerCase();
  const skill = ["react", "node", "python", "java", "sql", "mongodb", "express", "api", "machine learning"].find((item) => lower.includes(item)) || "your strongest technical skill";
  const projectSignal = lower.includes("project") ? "one of your resume projects" : "your most relevant academic or practical work";
  return [
    {
      question: `Walk me through ${projectSignal}. What problem did you solve, and what was your exact contribution?`,
      sampleAnswer: "Explain the problem, your ownership, the technical choices you made, and the measurable result or learning outcome.",
      category: "project-based",
      difficulty: "medium",
      grounding: "Fallback generated from resume text",
    },
    {
      question: `How have you used ${skill} in a practical task, and what tradeoff did you consider while implementing it?`,
      sampleAnswer: "Connect the skill to a concrete implementation, explain one tradeoff, and mention how you tested or validated the result.",
      category: "technical",
      difficulty: "medium",
      grounding: "Fallback generated from resume text",
    },
    {
      question: "Tell me about a time you worked with a team under pressure. How did you communicate and keep the work moving?",
      sampleAnswer: "Use STAR: situation, task, action, result. Emphasize communication, ownership, and the outcome.",
      category: "behavioral",
      difficulty: "easy",
      grounding: "Fallback generated from resume text",
    },
    {
      question: "What is one gap in your current profile for this role, and what are you doing to close it?",
      sampleAnswer: "Name one realistic gap, describe your learning plan, and show proof through practice, projects, or certifications.",
      category: "HR",
      difficulty: "medium",
      grounding: "Fallback generated from resume text",
    },
    {
      question: "If this role required you to learn a new tool in one week, how would you structure your learning and still deliver useful output?",
      sampleAnswer: "Break the week into setup, fundamentals, guided practice, a small deliverable, feedback, and refinement.",
      category: "problem-solving",
      difficulty: "medium",
      grounding: "Fallback generated from resume text",
    },
  ];
}

function normalizeGeneratedQuestion(item = {}, index = 0, resumeText = "") {
  const fallback = fallbackInterviewQuestions(resumeText)[index] || fallbackInterviewQuestions(resumeText)[0];
  const question = String(item.question || fallback.question || "").trim();
  const sampleAnswer = item.sampleAnswer || item.answer || fallback.sampleAnswer || "";
  const category = item.category || item.type || fallback.category || "Interview";
  const difficulty = item.difficulty || fallback.difficulty || (index < 2 ? "medium" : "easy");
  return {
    question,
    sampleAnswer,
    category,
    difficulty,
    type: category,
    company: item.company || "Target employer",
    answer: sampleAnswer,
    grounding: item.grounding || fallback.grounding || "",
    userAnswer: item.userAnswer || "",
    feedback: item.feedback || "",
    score: item.score ?? null,
  };
}

function ensureFiveQuestions(items = [], resumeText = "") {
  const normalized = (Array.isArray(items) ? items : [])
    .filter((item) => item && String(item.question || "").trim())
    .map((item, index) => normalizeGeneratedQuestion(item, index, resumeText))
    .slice(0, 5);

  const fallbacks = fallbackInterviewQuestions(resumeText);
  while (normalized.length < 5) {
    normalized.push(normalizeGeneratedQuestion(fallbacks[normalized.length], normalized.length, resumeText));
  }
  return normalized;
}

async function generateQuestionsWithTimeout(resumeText, previousQuestions, seed) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Interview generation timed out")), INTERVIEW_GENERATION_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      generateFreshDetailedInterviewQuestions(resumeText, previousQuestions, seed),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function previousQuestionTexts(userId) {
  if (isMongoDBAvailable()) {
    const sessions = await InterviewSession.find({ userId }).select("questions.question").sort({ createdAt: -1 }).limit(30);
    return sessions.flatMap((session) => session.questions?.map((q) => q.question).filter(Boolean) || []);
  }
  const rows = db
    .prepare("SELECT questions_json FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30")
    .all(userId);
  return rows.flatMap((row) => {
    try {
      return JSON.parse(row.questions_json || "[]").map((q) => q.question).filter(Boolean);
    } catch {
      return [];
    }
  });
}

async function saveGeneratedSession({ userId, resumeText, resumeName, questions }) {
  const normalizedQuestions = ensureFiveQuestions(questions, resumeText).map((item) => ({
    question: item.question,
    sampleAnswer: item.sampleAnswer || item.answer || "",
    category: item.category || item.type || "Question",
    difficulty: item.difficulty || "medium",
    type: item.type || item.category || "Question",
    company: item.company || "Target employer",
    answer: item.sampleAnswer || item.answer || "",
    grounding: item.grounding || "",
    userAnswer: "",
    feedback: "",
    score: null,
  }));

  if (isMongoDBAvailable()) {
    const session = new InterviewSession({
      userId,
      resumeName,
      resumeText,
      questions: normalizedQuestions,
      status: "Incomplete",
      duration: 0,
    });
    await session.save();
    return normalizeSession(session);
  }

  const result = db.prepare(`
    INSERT INTO interview_sessions (user_id, resume_name, resume_text, questions_json, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, resumeName || "Resume", resumeText || "", JSON.stringify(normalizedQuestions), "Incomplete");

  const row = db.prepare("SELECT * FROM interview_sessions WHERE id = ?").get(result.lastInsertRowid);
  return normalizeSession(row);
}

async function getHistorySessions(userId) {
  if (isMongoDBAvailable()) {
    const sessions = await InterviewSession.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return sessions.map(normalizeSession);
  }
  return db
    .prepare("SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId)
    .map(normalizeSession);
}

async function getHistorySession(userId, id) {
  if (isMongoDBAvailable()) {
    const session = await InterviewSession.findOne({ _id: id, userId });
    return normalizeSession(session);
  }
  const row = db.prepare("SELECT * FROM interview_sessions WHERE id = ? AND user_id = ?").get(id, userId);
  return normalizeSession(row);
}

async function saveSessionAnswers(userId, id, questions) {
  const average = scoreSession(questions);
  const status = isCompleted(questions) ? "Completed" : "Incomplete";
  if (isMongoDBAvailable()) {
    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) return null;
    session.questions = questions;
    session.overallScore = average;
    session.status = status;
    if (status === "Completed") session.completedAt = new Date();
    await session.save();
    return normalizeSession(session);
  }

  db.prepare(`
    UPDATE interview_sessions
    SET questions_json = ?, overall_score = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(JSON.stringify(questions), average, status, id, userId);
  return getHistorySession(userId, id);
}

async function deleteHistorySession(userId, id) {
  if (isMongoDBAvailable()) {
    const result = await InterviewSession.findOneAndDelete({ _id: id, userId });
    return Boolean(result);
  }
  const result = db.prepare("DELETE FROM interview_sessions WHERE id = ? AND user_id = ?").run(id, userId);
  return result.changes > 0;
}

// Generate and save a fresh AI interview simulator session
router.post("/generate", async (req, res) => {
  try {
    const { resumeText, resumeName, retryOf } = req.body || {};
    const userId = localUserId(req);
    if (!resumeText || !String(resumeText).trim()) {
      return res.status(400).json({ error: "resumeText is required" });
    }

    const previousQuestions = await previousQuestionTexts(userId);
    const retrySession = retryOf ? await getHistorySession(userId, retryOf) : null;
    const retryQuestions = retrySession?.questions?.map((q) => q.question).filter(Boolean) || [];
    let generatedQuestions = [];
    try {
      generatedQuestions = await generateQuestionsWithTimeout(
        String(resumeText).trim(),
        [...previousQuestions, ...retryQuestions],
        Date.now()
      );
    } catch (error) {
      console.warn("Interview AI generation fallback:", error.message);
      generatedQuestions = fallbackInterviewQuestions(String(resumeText).trim());
    }
    const questions = ensureFiveQuestions(generatedQuestions, String(resumeText).trim());
    const session = await saveGeneratedSession({
      userId,
      resumeText: String(resumeText).trim(),
      resumeName: resumeName || "Resume",
      questions,
    });

    res.json({ session, questions: ensureFiveQuestions(session.questions, String(resumeText).trim()) });
  } catch (error) {
    console.error("Interview generate error:", error);
    res.status(500).json({ error: error.message || "Failed to generate interview" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const userId = localUserId(req);
    const sessions = await getHistorySessions(userId);
    res.json({ sessions });
  } catch (error) {
    console.error("Interview history error:", error);
    res.status(500).json({ error: error.message || "Failed to load interview history" });
  }
});

router.get("/history/:id", async (req, res) => {
  try {
    const userId = localUserId(req);
    const session = await getHistorySession(userId, req.params.id);
    if (!session) return res.status(404).json({ error: "Interview history not found" });
    res.json({ session });
  } catch (error) {
    console.error("Interview history detail error:", error);
    res.status(500).json({ error: error.message || "Failed to load interview history detail" });
  }
});

router.put("/history/:id/answers", async (req, res) => {
  try {
    const userId = localUserId(req);
    const { questions = [] } = req.body || {};
    const session = await saveSessionAnswers(userId, req.params.id, questions);
    if (!session) return res.status(404).json({ error: "Interview history not found" });
    res.json({ session });
  } catch (error) {
    console.error("Interview answer save error:", error);
    res.status(500).json({ error: error.message || "Failed to save answers" });
  }
});

router.delete("/history/:id", async (req, res) => {
  try {
    const userId = localUserId(req);
    const deleted = await deleteHistorySession(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Interview history not found" });
    res.json({ message: "Interview history deleted" });
  } catch (error) {
    console.error("Interview history delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete interview history" });
  }
});

router.post("/export-pdf", async (req, res) => {
  try {
    const { title = "ResuMatch Interview Questions", questions = [] } = req.body || {};
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.pdf"`);
      res.send(Buffer.concat(chunks));
    });

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text(title).moveDown(0.5);
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(`Generated by ResuMatch on ${new Date().toLocaleString()}`).moveDown(1);
    questions.forEach((item, index) => {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(`${index + 1}. ${item.question || item}`);
      if (item.type) doc.font("Helvetica").fontSize(9).fillColor("#475569").text(`Type: ${item.type} | Angle: ${item.company || "Target employer"}`);
      if (item.answer) doc.font("Helvetica").fontSize(9).fillColor("#111827").text(`Sample answer: ${item.answer}`, { lineGap: 2 });
      if (item.userAnswer) doc.font("Helvetica").fontSize(9).fillColor("#111827").text(`Your answer: ${item.userAnswer}`, { lineGap: 2 });
      doc.moveDown(0.8);
    });
    doc.end();
  } catch (error) {
    console.error("Interview PDF export error:", error);
    res.status(500).json({ error: "Failed to export interview PDF" });
  }
});

// Start new interview session
router.post("/start", async (req, res) => {
  try {
    const { resumeId, resumeText } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    if (!resumeId && !resumeText) {
      return res.status(400).json({ error: "resumeId or resumeText is required" });
    }

    // If resumeId provided, verify it belongs to user
    let finalResumeText = resumeText;
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      finalResumeText = resume.content;
    }

    // Generate interview questions
    const questions = await generateInterviewQuestions(finalResumeText);

    const session = new InterviewSession({
      userId,
      resumeId: resumeId || null,
      resumeText: finalResumeText,
      questions: questions.map(q => ({ question: q })),
      duration: 0,
    });

    await session.save();
    res.json({ 
      session: {
        id: session._id,
        questions: session.questions.map(q => q.question),
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Submit answer for interview question
router.post("/answer", async (req, res) => {
  try {
    const { sessionId, questionIndex, userAnswer, audioUrl } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    if (!sessionId || questionIndex === undefined || !userAnswer) {
      return res.status(400).json({ 
        error: "sessionId, questionIndex, and userAnswer are required" 
      });
    }

    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    if (questionIndex >= session.questions.length) {
      return res.status(400).json({ error: "Invalid question index" });
    }

    // Evaluate the answer
    const question = session.questions[questionIndex].question;
    const evaluation = await evaluateInterviewAnswer(question, userAnswer, session.resumeText);

    // Update session with answer and evaluation
    session.questions[questionIndex].userAnswer = userAnswer;
    session.questions[questionIndex].audioUrl = audioUrl || null;
    session.questions[questionIndex].score = evaluation.score;
    session.questions[questionIndex].feedback = evaluation.feedback;
    session.questions[questionIndex].fillerWords = evaluation.fillerWords || [];

    await session.save();

    res.json({
      feedback: evaluation.feedback,
      score: evaluation.score,
      fillerWords: evaluation.fillerWords,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Complete interview session
router.post("/complete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    const session = await InterviewSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    // Calculate overall score
    const scores = session.questions
      .filter(q => q.score !== undefined)
      .map(q => q.score);

    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    session.overallScore = overallScore;
    session.completedAt = new Date();
    session.duration = duration || 0;

    await session.save();

    res.json({ 
      session,
      overallScore,
      summary: {
        totalQuestions: session.questions.length,
        answeredQuestions: scores.length,
        averageScore: overallScore,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get interview session history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user?.id || "000000000000000000000001";

    const sessions = await InterviewSession.find({ userId })
      .select("_id overallScore completedAt duration questions")
      .sort({ createdAt: -1 });

    res.json({ sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific interview session
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "000000000000000000000001";

    const session = await InterviewSession.findOne({ _id: id, userId })
      .populate("resumeId");

    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    res.json({ session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
