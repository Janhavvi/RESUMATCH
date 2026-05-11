import { GoogleGenAI, Type } from "@google/genai";

const ACTION_VERBS = [
  "led", "built", "created", "developed", "designed", "implemented", "managed",
  "improved", "optimized", "increased", "reduced", "launched", "delivered",
  "analyzed", "collaborated", "mentored", "architected", "automated", "drove",
  "executed", "scaled", "refactored", "integrated", "deployed"
];

const ATS_KEYWORDS = [
  "python", "java", "javascript", "react", "node", "sql", "aws", "docker",
  "kubernetes", "api", "microservices", "agile", "git", "testing", "ci/cd",
  "leadership", "communication", "problem solving", "data analysis"
];

function tokenize(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\-./\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function containsAny(text, patterns) {
  const lower = (text || "").toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function getActionVerbCount(text) {
  const words = tokenize(text);
  const lookup = new Set(words);
  return ACTION_VERBS.reduce((count, verb) => count + (lookup.has(verb) ? 1 : 0), 0);
}

function fallbackResumeAnalysis(text) {
  const words = tokenize(text);
  const wordCount = words.length;
  const actionVerbCount = getActionVerbCount(text);
  const lower = (text || "").toLowerCase();

  const hasSections = {
    experience: containsAny(lower, ["experience", "work history", "employment"]),
    education: containsAny(lower, ["education", "university", "college", "bachelor", "master"]),
    skills: containsAny(lower, ["skills", "technical skills", "technologies"]),
    projects: containsAny(lower, ["project", "projects"]),
  };

  let atsScore = 55;
  if (wordCount > 250) atsScore += 8;
  if (wordCount > 450) atsScore += 7;
  if (actionVerbCount > 6) atsScore += 8;
  if (hasSections.experience) atsScore += 6;
  if (hasSections.education) atsScore += 5;
  if (hasSections.skills) atsScore += 6;
  if (hasSections.projects) atsScore += 4;
  atsScore = Math.max(35, Math.min(96, atsScore));

  const strengths = [];
  const weaknesses = [];
  const formattingTips = [];

  if (wordCount > 300) strengths.push("Resume contains enough detail for meaningful ATS parsing.");
  else weaknesses.push("Resume is short; add measurable outcomes and project details.");

  if (actionVerbCount > 5) strengths.push("Strong use of action-oriented language.");
  else weaknesses.push("Use more action verbs like 'Led', 'Built', and 'Optimized'.");

  if (hasSections.skills) strengths.push("Skills section appears present and discoverable.");
  else weaknesses.push("Add a clear Skills section with tools and technologies.");

  if (!hasSections.experience) {
    weaknesses.push("Experience section is not clearly labeled for ATS scanners.");
    formattingTips.push("Add a dedicated 'Experience' header with role, company, and dates.");
  }
  if (!hasSections.education) {
    formattingTips.push("Include an Education section with degree and institution.");
  }
  formattingTips.push("Prefer simple one-column structure and standard headings.");
  formattingTips.push("Quantify impact with metrics (%, $, time saved, users served).");
  formattingTips.push("Mirror keywords from target job descriptions naturally.");

  const missingKeywords = ATS_KEYWORDS.filter((k) => !lower.includes(k)).slice(0, 8);

  return {
    atsScore,
    summary: "Generated using local fallback analysis (no Gemini key detected).",
    strengths,
    weaknesses,
    missingKeywords,
    formattingTips,
    actionVerbCount,
  };
}

function fallbackJobMatch(resume, jd) {
  const resumeTokens = new Set(tokenize(resume));
  const jdLower = (jd || "").toLowerCase();
  const jdTokens = tokenize(jdLower);
  const jdUnique = [...new Set(jdTokens)].filter((t) => t.length > 2);

  const matched = jdUnique.filter((t) => resumeTokens.has(t)).slice(0, 12);
  const unmatched = jdUnique.filter((t) => !resumeTokens.has(t)).slice(0, 12);

  const matchPercentage = jdUnique.length
    ? Math.max(25, Math.min(97, Math.round((matched.length / jdUnique.length) * 100)))
    : 40;

  const recommendations = [
    "Add role-specific keywords from the job description into experience bullets.",
    "Highlight measurable impact per bullet using numbers and outcomes.",
    "Bring matching technical skills closer to the top third of the resume.",
  ];

  const bulletPointOptimizations = [
    {
      original: "Worked on multiple tasks across the team.",
      improved: "Led cross-functional delivery of key features, improving release velocity and team throughput.",
    },
    {
      original: "Responsible for system maintenance.",
      improved: "Maintained and optimized production systems, reducing incidents and improving service reliability.",
    },
    {
      original: "Helped with project requirements.",
      improved: "Translated business requirements into technical plans and delivered milestones on schedule.",
    },
  ];

  return {
    matchPercentage,
    matchedSkills: matched.length ? matched : ["communication", "teamwork"],
    unmatchedSkills: unmatched.length ? unmatched : ["domain-specific keywords from JD"],
    recommendations,
    bulletPointOptimizations,
  };
}

async function analyzeWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackResumeAnalysis(text);

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
You are an expert ATS specialist and career coach.
Analyze the resume and return strict JSON with:
- atsScore (0-100)
- summary
- strengths (array)
- weaknesses (array)
- missingKeywords (array)
- formattingTips (array)
- actionVerbCount (number)

Resume text:
${text}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["atsScore", "summary", "strengths", "weaknesses", "missingKeywords", "formattingTips", "actionVerbCount"],
        properties: {
          atsScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          formattingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionVerbCount: { type: Type.NUMBER },
        },
      },
    },
  });

  const parsed = JSON.parse(response.text);
  parsed.atsScore = Math.max(0, Math.min(100, Math.round(Number(parsed.atsScore || 0))));
  parsed.actionVerbCount = Math.max(0, Math.round(Number(parsed.actionVerbCount || 0)));
  return parsed;
}

async function matchWithGemini(resume, jd) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallbackJobMatch(resume, jd);

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
Compare resume vs job description and return strict JSON with:
- matchPercentage (0-100)
- matchedSkills (array)
- unmatchedSkills (array)
- recommendations (array)
- bulletPointOptimizations: array of { original, improved }

Resume:
${resume}

Job Description:
${jd}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["matchPercentage", "matchedSkills", "unmatchedSkills", "recommendations", "bulletPointOptimizations"],
        properties: {
          matchPercentage: { type: Type.NUMBER },
          matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          unmatchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          bulletPointOptimizations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              required: ["original", "improved"],
              properties: {
                original: { type: Type.STRING },
                improved: { type: Type.STRING },
              },
            },
          },
        },
      },
    },
  });

  const parsed = JSON.parse(response.text);
  parsed.matchPercentage = Math.max(0, Math.min(100, Math.round(Number(parsed.matchPercentage || 0))));
  return parsed;
}

export async function runResumeAnalysis(text) {
  try {
    return await analyzeWithGemini(text);
  } catch {
    return fallbackResumeAnalysis(text);
  }
}

export async function runJobMatch(resume, jd) {
  try {
    return await matchWithGemini(resume, jd);
  } catch {
    return fallbackJobMatch(resume, jd);
  }
}
