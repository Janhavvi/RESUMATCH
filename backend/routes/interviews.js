import express from "express";
import { InterviewSession, Resume } from "../lib/models.js";
import { isMongoDBAvailable } from "../lib/db-adapter.js";
import PDFDocument from "pdfkit";
import { generateFreshDetailedInterviewQuestions } from "../services/ai.js";

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
  const scores = questions
    .map((q) => q.score)
    .filter((score) => score !== null && score !== undefined && score !== "" && Number.isFinite(Number(score)))
    .map(Number);
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
  const source = typeof item === "string" ? { question: item } : item || {};
  const fallback = fallbackInterviewQuestions(resumeText)[index] || fallbackInterviewQuestions(resumeText)[0];
  const question = String(source.question || fallback.question || "").trim();
  const sampleAnswer = source.sampleAnswer || source.answer || fallback.sampleAnswer || "";
  const category = source.category || source.type || fallback.category || "Interview";
  const difficulty = source.difficulty || fallback.difficulty || (index < 2 ? "medium" : "easy");
  return {
    question,
    sampleAnswer,
    category,
    difficulty,
    type: category,
    company: source.company || "Target employer",
    answer: sampleAnswer,
    grounding: source.grounding || fallback.grounding || "",
    userAnswer: source.userAnswer || "",
    feedback: source.feedback || "",
    score: source.score ?? null,
  };
}

function ensureFiveQuestions(items = [], resumeText = "", count = 5) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeGeneratedQuestion(item, index, resumeText))
    .filter((item) => item.question)
    .slice(0, count);

  const fallbacks = fallbackInterviewQuestions(resumeText);
  while (normalized.length < count) {
    normalized.push(normalizeGeneratedQuestion(fallbacks[normalized.length % fallbacks.length], normalized.length, resumeText));
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
  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
}

const SUPPORTED_VOICE_ROLES = [
  "Teacher",
  "MERN Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "AI Engineer",
  "Machine Learning Engineer",
  "Cybersecurity Analyst",
  "UI/UX Designer",
  "Product Manager",
  "HR",
  "Accountant",
  "Doctor",
  "Lawyer",
  "Marketing Specialist",
  "Sales Executive",
];

const ROLE_ALIASES = {
  mern: "MERN Developer",
  frontend: "Frontend Developer",
  backend: "Backend Developer",
  "full stack": "Full Stack Developer",
  cybersecurity: "Cybersecurity Analyst",
  "ui/ux": "UI/UX Designer",
};

const ROLE_QUESTION_BANKS = {
  Teacher: [
    "How do you manage a disruptive classroom without losing instructional time?",
    "Explain your teaching methodology and how you adapt it for different learners.",
    "How do you evaluate student performance beyond test scores?",
    "How would you teach a difficult concept to students who are already behind?",
    "How do you identify and support weak students without lowering standards?",
    "Describe a challenging classroom situation and the result of your intervention.",
    "How do you involve parents or guardians when a student is struggling?",
    "What would you do if your lesson plan fails halfway through class?",
  ],
  "MERN Developer": [
    "Explain JWT authentication, token expiry, refresh tokens, and where you would store each token.",
    "How would you optimize React performance in a dashboard with slow renders?",
    "Explain MongoDB indexing and how you would diagnose a slow query.",
    "How would you scale a Node API that suddenly receives ten times more traffic?",
    "Walk me through error handling and validation in an Express API.",
    "How would you secure a MERN application against common authentication attacks?",
    "Describe a production bug in a MERN project and how you isolated it.",
  ],
  "Frontend Developer": [
    "How would you diagnose and fix a React component that re-renders too often?",
    "Explain your approach to accessibility for forms, navigation, and error states.",
    "How do you choose between client state, server state, and URL state?",
    "Describe how you would improve Core Web Vitals on a slow landing page.",
    "How do you test frontend behavior beyond snapshot tests?",
    "Explain a difficult UI bug you solved and the debugging steps you used.",
  ],
  "Backend Developer": [
    "Design an API endpoint that must handle validation, authorization, rate limits, and audit logs.",
    "How would you debug a slow backend request in production?",
    "Explain database indexing tradeoffs for write-heavy and read-heavy systems.",
    "How do you make background jobs reliable when retries can cause duplicate work?",
    "Describe how you would secure secrets, tokens, and service-to-service calls.",
    "What metrics would you monitor for a backend service after deployment?",
  ],
  "Full Stack Developer": [
    "Walk me through a feature from UI event to database write and back to the user.",
    "How do you decide whether logic belongs on the frontend or backend?",
    "How would you handle authentication, authorization, and session expiry end to end?",
    "Describe how you would debug a bug that only appears after deployment.",
    "How do you keep frontend and backend contracts stable as a product changes?",
    "Design a scalable file upload flow with progress, validation, and recovery.",
  ],
  "Data Analyst": [
    "Explain a dashboard you built and the decisions it helped someone make.",
    "How do you clean messy datasets while preserving data meaning?",
    "What KPIs would you track for a business funnel, and why?",
    "Explain SQL joins using a real analysis scenario.",
    "Explain your data visualization choices for executives versus operators.",
    "How would you investigate a sudden drop in conversion rate?",
  ],
  "Data Scientist": [
    "How would you frame a vague business problem as a measurable data science problem?",
    "Explain how you validate a model and detect leakage.",
    "How do you choose between interpretability and predictive performance?",
    "Describe a feature engineering decision that changed model quality.",
    "How would you explain model uncertainty to a non-technical stakeholder?",
    "What would you do when a model performs well offline but poorly in production?",
  ],
  "AI Engineer": [
    "How would you design an LLM feature that is reliable, observable, and cost controlled?",
    "Explain retrieval augmented generation and when it fails.",
    "How do you evaluate prompt quality beyond subjective preference?",
    "What guardrails would you add before shipping an AI assistant to users?",
    "How would you reduce hallucinations in a domain-specific assistant?",
    "Describe how you would monitor latency, token cost, and answer quality.",
  ],
  "Machine Learning Engineer": [
    "How would you move a trained model from notebook to production service?",
    "Explain training-serving skew and how you prevent it.",
    "How do you monitor model drift and decide when to retrain?",
    "Describe a robust ML pipeline for data validation, training, and deployment.",
    "How would you optimize inference latency without destroying quality?",
    "What tests belong in an ML system before release?",
  ],
  "Cybersecurity Analyst": [
    "Walk me through how you would triage a suspected phishing incident.",
    "How do you distinguish true positives from false positives in alert review?",
    "Explain how you would investigate suspicious login activity.",
    "What controls would you recommend after a credential compromise?",
    "How would you communicate security risk to a non-technical business owner?",
    "Describe your approach to vulnerability prioritization.",
  ],
  "UI/UX Designer": [
    "Explain your design process from problem discovery to handoff.",
    "How do you conduct user research when access to users is limited?",
    "How do you test usability and decide what to change?",
    "How do you improve accessibility in an existing product?",
    "Describe a time data or user feedback forced you to change a design.",
    "How do you defend design decisions to product and engineering stakeholders?",
  ],
  "Product Manager": [
    "How would you prioritize a roadmap when sales, engineering, and customers disagree?",
    "Describe a product metric you would own and how you would move it.",
    "How do you write a requirement that engineering can execute without ambiguity?",
    "Tell me about a time you said no to a feature request.",
    "How would you investigate low activation for a new product flow?",
    "How do you balance user needs, business impact, and technical effort?",
  ],
  HR: [
    "How do you handle a conflict between an employee and a manager?",
    "Explain how you would improve a slow hiring pipeline without lowering quality.",
    "How do you conduct a fair and structured interview process?",
    "What would you do if an employee reports harassment?",
    "How do you measure employee engagement and act on the findings?",
    "Describe a difficult HR conversation and how you handled it.",
  ],
  Accountant: [
    "Walk me through how you would investigate a reconciliation mismatch.",
    "Explain accrual accounting with a practical example.",
    "How do you ensure accuracy when closing books under time pressure?",
    "What internal controls reduce the risk of payment errors?",
    "Describe how you would explain a variance to management.",
    "How do you handle missing documentation for an expense?",
  ],
  Doctor: [
    "How do you approach a patient with unclear symptoms and limited history?",
    "Explain how you communicate risk and treatment options to a patient.",
    "How do you prioritize cases during a high-pressure shift?",
    "Describe a time you handled a difficult patient or family conversation.",
    "How do you avoid diagnostic bias?",
    "What would you do if you noticed a possible medication error?",
  ],
  Lawyer: [
    "How would you analyze a new matter with incomplete facts?",
    "Explain how you prepare a client for a difficult negotiation or hearing.",
    "How do you balance legal risk with a client's commercial goal?",
    "Describe a time you found a weakness in your own argument.",
    "How do you manage deadlines across multiple matters?",
    "How would you explain a complex legal issue to a non-lawyer?",
  ],
  "Marketing Specialist": [
    "How would you build a campaign for a product with low brand awareness?",
    "What metrics would you track from impression to revenue?",
    "How do you decide between paid, organic, email, and partnership channels?",
    "Describe a campaign that underperformed and how you diagnosed it.",
    "How do you position the same product for different customer segments?",
    "How would you improve conversion without increasing ad spend?",
  ],
  "Sales Executive": [
    "Walk me through how you qualify a lead before spending serious time on it.",
    "How do you handle a prospect who says the price is too high?",
    "Describe your discovery process for understanding buyer pain.",
    "How do you recover a deal that has gone silent?",
    "What does a strong follow-up after a demo include?",
    "Tell me about a difficult objection and exactly how you handled it.",
  ],
};

const FOLLOW_UP_BANK = [
  "Give a real example with context, action, and result.",
  "Why did you choose that approach instead of the obvious alternative?",
  "What would you do differently if this happened again?",
  "What evidence proves that your answer worked?",
  "Be more specific. What was your exact contribution?",
  "What was the tradeoff, and how did you decide?",
];

function normalizeVoiceRole(role = "") {
  const trimmed = String(role || "").trim();
  const alias = ROLE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  return SUPPORTED_VOICE_ROLES.find((item) => item.toLowerCase() === trimmed.toLowerCase()) || "MERN Developer";
}

function extractResumeSignals(resumeText = "") {
  const text = String(resumeText || "");
  const skills = Array.from(new Set((text.match(/\b(react|node|express|mongodb|sql|python|excel|tableau|power bi|figma|jwt|aws|docker|machine learning|tensorflow|pytorch|security|teaching|classroom|accounting|sales|marketing)\b/gi) || []).map((item) => item.toLowerCase()))).slice(0, 6);
  const project = (text.match(/(?:project|experience|built|developed|designed|managed|taught|analyzed)[^\n.]{12,100}/i) || [])[0] || "";
  const years = (text.match(/\b\d+\+?\s*(?:years|yrs)\b/i) || [])[0] || "";
  return { skills, project: project.trim(), years };
}

function isSimilarQuestion(question, history = []) {
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 3);
  const current = new Set(normalize(question));
  if (!current.size) return false;
  return history.some((past) => {
    const words = normalize(past);
    if (!words.length) return false;
    const overlap = words.filter((word) => current.has(word)).length;
    return overlap / Math.max(current.size, words.length) > 0.62;
  });
}

function generateRoleSpecificQuestions({ role, resumeText, interviewConfig = {}, previousQuestions = [], seed = Date.now() }) {
  const normalizedRole = normalizeVoiceRole(role || interviewConfig.role);
  const bank = ROLE_QUESTION_BANKS[normalizedRole] || ROLE_QUESTION_BANKS["MERN Developer"];
  const signals = extractResumeSignals(resumeText);
  const strict = interviewConfig.strictMode || interviewConfig.difficulty === "Strict Mode";
  const type = interviewConfig.type || "Resume Based";
  const history = [...previousQuestions];
  const rotated = bank.slice(seed % bank.length).concat(bank.slice(0, seed % bank.length));
  const resumeSpecific = [];

  if (signals.project) {
    resumeSpecific.push(`Your resume mentions "${signals.project}". Defend your exact role, decisions, and measurable result.`);
  }
  if (signals.skills.length) {
    resumeSpecific.push(`Pick one of these resume skills (${signals.skills.join(", ")}) and explain a real situation where it changed the outcome.`);
  }
  resumeSpecific.push(`For a ${normalizedRole} role, describe a realistic failure scenario you could face and how you would handle it under pressure.`);

  const candidates = [...resumeSpecific, ...rotated]
    .map((question) => strict ? `${question} I will ask follow-ups if your answer is vague.` : question)
    .filter((question) => !isSimilarQuestion(question, history));

  const selected = [];
  for (const question of candidates) {
    if (selected.length >= 6) break;
    if (!isSimilarQuestion(question, [...history, ...selected])) selected.push(question);
  }

  while (selected.length < 6) {
    const fallback = `${rotated[selected.length % rotated.length]} Include one concrete example and one measurable result.`;
    selected.push(isSimilarQuestion(fallback, [...history, ...selected]) ? `${fallback} Session angle ${selected.length + 1}.` : fallback);
  }

  return selected.map((question, index) => ({
    question,
    sampleAnswer: "Answer with situation, action, tradeoff, result, and one lesson learned. Avoid generic claims.",
    category: index < 2 ? "resume-specific" : type,
    difficulty: strict ? "strict" : String(interviewConfig.difficulty || "Intermediate").toLowerCase(),
    type,
    company: "Top-company interviewer",
    grounding: signals.project || signals.skills.join(", ") || normalizedRole,
  }));
}

function clampScore(value) {
  return Math.max(0, Math.min(10, Number(value) || 0));
}

function strictLocalEvaluation({ question, userAnswer, role, interviewConfig = {} }) {
  const answer = String(userAnswer || "").trim();
  const lower = answer.toLowerCase();
  const words = answer.split(/\s+/).filter(Boolean);
  const fillerWordsPattern = /\b(um|uh|like|you know|basically|actually|sort of|kind of|i think|well|so|anyway)\b/gi;
  const fillerWords = [...new Set((answer.match(fillerWordsPattern) || []).map((word) => word.toLowerCase()))];
  const evidence = /\b(example|when|because|result|improved|reduced|increased|measured|data|metric|tested|debugged|stakeholder|student|client|patient|customer)\b/i.test(answer);
  const metrics = /\b\d+%?|\b(first|second|third)\b/i.test(answer);
  const structure = /\b(situation|task|action|result|first|then|finally|because|therefore)\b/i.test(answer);
  const roleTerms = String(role || "").toLowerCase().split(/\W+/).filter(Boolean);
  const roleRelevant = roleTerms.some((term) => lower.includes(term)) || ROLE_QUESTION_BANKS[role]?.some((item) => item.toLowerCase().split(/\W+/).some((term) => term.length > 5 && lower.includes(term)));
  const strict = interviewConfig.strictMode || interviewConfig.difficulty === "Strict Mode";

  let base = 2.2;
  if (words.length >= 25) base += 1.2;
  if (words.length >= 55) base += 1.1;
  if (evidence) base += 1.3;
  if (metrics) base += 0.8;
  if (structure) base += 0.9;
  if (roleRelevant) base += 0.7;
  if (/\b(tradeoff|risk|constraint|alternative|why|root cause|validate|impact)\b/i.test(answer)) base += 1.0;
  base -= Math.min(1.2, fillerWords.length * 0.25);
  if (words.length < 15) base = Math.min(base, 3.4);
  if (!evidence && words.length < 45) base = Math.min(base, 5.2);
  if (strict) base -= 0.6;

  const score = Number(clampScore(base).toFixed(1));
  const dimensions = {
    communication: clampScore(score + (structure ? 0.8 : -0.6)),
    confidence: clampScore(score - (fillerWords.length ? 0.7 : 0) + (words.length > 45 ? 0.4 : -0.2)),
    clarity: clampScore(score + (structure ? 0.5 : -0.5)),
    technicalAccuracy: clampScore(score + (roleRelevant ? 0.5 : -0.8)),
    problemSolving: clampScore(score + (/\b(debug|solve|tradeoff|root cause|prioritize|diagnose|validate)\b/i.test(answer) ? 0.8 : -0.5)),
    structure: clampScore(score + (structure ? 0.9 : -0.8)),
    depth: clampScore(score + (words.length > 55 && evidence ? 0.8 : -0.9)),
    relevance: clampScore(score + (roleRelevant || evidence ? 0.5 : -0.7)),
  };
  const missingInformation = [];
  if (!evidence) missingInformation.push("A real example with context and outcome");
  if (!metrics) missingInformation.push("Measurable impact or concrete evidence");
  if (!structure) missingInformation.push("Clear structure such as STAR or problem-action-result");
  if (!/\b(tradeoff|risk|alternative|constraint|why)\b/i.test(answer)) missingInformation.push("Reasoning, tradeoffs, and why you chose the approach");

  return {
    score,
    dimensions,
    strengths: [
      words.length >= 25 ? "You gave enough substance to evaluate." : "You attempted to answer the question directly.",
      roleRelevant ? "You connected part of the answer to the role." : "You stayed generally relevant to the prompt.",
    ],
    weaknesses: [
      score < 5 ? "The answer is too generic for a serious interview." : "The answer needs sharper evidence and pressure-tested reasoning.",
      !metrics ? "No measurable result or objective proof was provided." : "The measurable result could be tied more clearly to your action.",
    ],
    missingInformation,
    betterAnswer: `A stronger ${role} answer would name the situation, explain the exact action you took, justify why that approach was chosen, mention one tradeoff, and finish with a measurable result or lesson learned.`,
    feedback: score < 5
      ? "That answer would not pass a strict interview. It needs a specific example, clearer ownership, and evidence of impact."
      : "This is a workable answer, but a top-company interview would expect more depth, tradeoffs, and measurable proof.",
    followUpQuestion: score < 6
      ? "That is too generic. Give me a real example and explain exactly why your approach worked."
      : FOLLOW_UP_BANK[(Date.now() + words.length) % FOLLOW_UP_BANK.length],
    fillerWords,
  };
}

async function saveGeneratedSession({ userId, resumeText, resumeName, questions, questionCount = 5, role, interviewType, difficulty, strictMode, askedQuestions }) {
  const normalizedQuestions = ensureFiveQuestions(questions, resumeText, questionCount).map((item) => ({
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
      role,
      interviewType,
      difficulty,
      strictMode: Boolean(strictMode),
      askedQuestions: askedQuestions || normalizedQuestions.map((item) => item.question),
      questions: normalizedQuestions,
      status: "Incomplete",
      duration: 0,
    });
    await session.save();
    return normalizeSession(session);
  }

  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
}

async function getHistorySessions(userId) {
  if (isMongoDBAvailable()) {
    const sessions = await InterviewSession.find({ userId }).sort({ createdAt: -1 }).limit(50);
    return sessions.map(normalizeSession);
  }
  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
}

async function getHistorySession(userId, id) {
  if (isMongoDBAvailable()) {
    const session = await InterviewSession.findOne({ _id: id, userId });
    return normalizeSession(session);
  }
  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
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

  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
}

async function completeHistorySession(userId, id, duration = 0) {
  const session = await getHistorySession(userId, id);
  if (!session) return null;

  const overallScore = scoreSession(session.questions);
  if (isMongoDBAvailable()) {
    const updated = await InterviewSession.findOneAndUpdate(
      { _id: id, userId },
      {
        overallScore,
        status: "Completed",
        completedAt: new Date(),
        duration,
      },
      { new: true }
    );
    return normalizeSession(updated);
  }

  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
}

async function deleteHistorySession(userId, id) {
  if (isMongoDBAvailable()) {
    const result = await InterviewSession.findOneAndDelete({ _id: id, userId });
    return Boolean(result);
  }
  throw new Error("MongoDB is not connected. SQLite fallback has been disabled.");
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
    const { resumeId, resumeText, interviewConfig = {} } = req.body;
    const userId = localUserId(req);

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

    const role = normalizeVoiceRole(interviewConfig.role);
    const previousQuestions = await previousQuestionTexts(userId).catch(() => []);
    const generatedQuestions = generateRoleSpecificQuestions({
      role,
      resumeText: finalResumeText,
      interviewConfig: { ...interviewConfig, role },
      previousQuestions,
      seed: Date.now(),
    });
    const session = await saveGeneratedSession({
      userId,
      resumeText: finalResumeText,
      resumeName: "Voice Interview Resume",
      questions: generatedQuestions,
      questionCount: 6,
      role,
      interviewType: interviewConfig.type || "Resume Based",
      difficulty: interviewConfig.difficulty || "Intermediate",
      strictMode: Boolean(interviewConfig.strictMode || interviewConfig.difficulty === "Strict Mode"),
      askedQuestions: generatedQuestions.map((item) => item.question),
    });

    res.json({ 
      session: {
        id: session.id,
        role,
        interviewType: interviewConfig.type || "Resume Based",
        difficulty: interviewConfig.difficulty || "Intermediate",
        strictMode: Boolean(interviewConfig.strictMode || interviewConfig.difficulty === "Strict Mode"),
        askedQuestions: session.questions.map((q) => q.question),
        questions: session.questions.map((q) => q.question),
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
    const userId = localUserId(req);

    if (!sessionId || questionIndex === undefined || !userAnswer) {
      return res.status(400).json({ 
        error: "sessionId, questionIndex, and userAnswer are required" 
      });
    }

    const session = await getHistorySession(userId, sessionId);
    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    if (questionIndex < 0 || questionIndex >= session.questions.length) {
      return res.status(400).json({ error: "Invalid question index" });
    }

    const question = session.questions[questionIndex].question;
    const role = normalizeVoiceRole(session.role);
    const evaluation = strictLocalEvaluation({
      question,
      userAnswer,
      role,
      interviewConfig: {
        type: session.interviewType,
        difficulty: session.difficulty,
        strictMode: session.strictMode,
      },
    });

    const updatedQuestions = session.questions.map((item, index) => (
      index === questionIndex
        ? {
            ...item,
            userAnswer,
            audioUrl: audioUrl || null,
            score: evaluation.score,
            feedback: evaluation.feedback,
            fillerWords: evaluation.fillerWords || [],
            strengths: evaluation.strengths || [],
            weaknesses: evaluation.weaknesses || [],
            missingInformation: evaluation.missingInformation || [],
            betterAnswer: evaluation.betterAnswer || "",
            followUpQuestion: evaluation.followUpQuestion || "",
            dimensions: evaluation.dimensions || {},
          }
        : item
    ));
    const updatedSession = await saveSessionAnswers(userId, sessionId, updatedQuestions);

    res.json({
      feedback: evaluation.feedback,
      score: evaluation.score,
      dimensions: evaluation.dimensions,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      missingInformation: evaluation.missingInformation,
      betterAnswer: evaluation.betterAnswer,
      followUpQuestion: evaluation.followUpQuestion,
      fillerWords: evaluation.fillerWords || [],
      session: updatedSession,
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
    const userId = localUserId(req);

    const session = await completeHistorySession(userId, id, duration || 0);
    if (!session) {
      return res.status(404).json({ error: "Interview session not found" });
    }

    const answeredQuestions = session.questions.filter(
      (q) => q.score !== null && q.score !== undefined && q.score !== "" && Number.isFinite(Number(q.score))
    ).length;
    const overallScore = session.overallScore ?? 0;

    res.json({ 
      session,
      overallScore,
      summary: {
        totalQuestions: session.questions.length,
        answeredQuestions,
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
