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

function normalizeResumeData(resumeData = {}) {
  const technicalSkills = resumeData.technicalSkills || {};
  const education = Array.isArray(resumeData.education) ? resumeData.education : [];
  const projects = Array.isArray(resumeData.projects) ? resumeData.projects : [];
  const workExperience = Array.isArray(resumeData.workExperience) ? resumeData.workExperience : [];

  return [
    resumeData.name,
    resumeData.email,
    resumeData.phone,
    resumeData.linkedIn,
    resumeData.portfolio,
    resumeData.summary,
    resumeData.objective,
    education.map((item) => [item.degree, item.university, item.cgpa, item.year].filter(Boolean).join(" ")).join("\n"),
    Object.values(technicalSkills).filter(Boolean).join(", "),
    projects.map((item) => [item.name, item.technologies, item.details].filter(Boolean).join(" - ")).join("\n"),
    workExperience.map((item) => [item.role, item.company, item.duration, item.responsibilities, item.achievements].filter(Boolean).join(" - ")).join("\n"),
    ...(resumeData.certifications || []),
    ...(resumeData.achievements || []),
    ...(resumeData.featureAchievements || []),
    ...(resumeData.softSkills || []),
    ...(resumeData.extracurricular || []),
    ...(resumeData.languagesKnown || []),
  ]
    .filter(Boolean)
    .join("\n");
}

function getResumeCompleteness(resumeData = {}) {
  const technicalSkills = resumeData.technicalSkills || {};
  const achievementItems = [
    ...(resumeData.achievements || []),
    ...(resumeData.featureAchievements || []),
  ];
  const checks = [
    ["contact", resumeData.email || resumeData.phone],
    ["summary", resumeData.summary && resumeData.summary.length > 80],
    ["skills", Object.values(technicalSkills).some(Boolean)],
    ["education", (resumeData.education || []).some((item) => item.degree || item.university)],
    ["projects", (resumeData.projects || []).some((item) => item.name && item.details)],
    ["experience", (resumeData.workExperience || []).some((item) => item.role && (item.responsibilities || item.achievements))],
    ["achievements", achievementItems.some(Boolean)],
  ];

  return {
    completed: checks.filter(([, value]) => Boolean(value)).map(([key]) => key),
    missing: checks.filter(([, value]) => !value).map(([key]) => key),
  };
}

function fallbackAssistantResponse(question, resumeData = {}, section = "overall") {
  const resumeText = normalizeResumeData(resumeData);
  const analysis = fallbackResumeAnalysis(resumeText);
  const completeness = getResumeCompleteness(resumeData);
  const lowerQuestion = (question || "").toLowerCase();
  const focus = section === "overall" ? "your resume" : `the ${section} section`;

  const sectionTips = {
    header: [
      "Use one professional email, one phone number, LinkedIn, and a portfolio or GitHub link when relevant.",
      "Keep contact details plain text so ATS systems can parse them reliably.",
    ],
    summary: [
      "Write 2-3 lines with target role, strongest skills, and measurable impact.",
      "Avoid generic claims; mention tools, domain, or outcomes that match the job.",
    ],
    education: [
      "Include degree, institution, graduation year, and CGPA only if it helps your profile.",
      "Add relevant coursework for early-career resumes when experience is limited.",
    ],
    skills: [
      "Group skills by category and mirror important job-description keywords naturally.",
      "Prioritize tools you can discuss in an interview over long keyword lists.",
    ],
    projects: [
      "For each project, show problem, tech stack, what you built, and user or business impact.",
      "Add links, scale, metrics, or outcomes where possible.",
    ],
    experience: [
      "Start bullets with action verbs and include scope, tools, and measurable results.",
      "Turn responsibilities into outcomes, such as speed improved, errors reduced, or users served.",
    ],
    certifications: [
      "Keep current, relevant certifications and include issuer or platform names.",
      "Place high-value certifications near skills when they support target roles.",
    ],
    achievements: [
      "Use achievements that prove impact: awards, rankings, shipped work, leadership, or measurable wins.",
      "Prefer specific results over broad statements.",
    ],
  };

  if (lowerQuestion.includes("ats")) {
    return {
      answer: `For ATS optimization, keep ${focus} simple, keyword-aligned, and measurable. Your estimated ATS score is ${analysis.atsScore}. Add missing role keywords, use standard headings, and avoid graphics-heavy formatting.`,
      suggestions: [
        "Use standard headings like Experience, Education, Skills, and Projects.",
        "Add job-description keywords only where they truthfully match your experience.",
        "Write bullets with action verb + task + tool + result.",
      ],
      analysis,
    };
  }

  if (lowerQuestion.includes("gap") || lowerQuestion.includes("missing") || lowerQuestion.includes("analysis")) {
    return {
      answer: `I found ${completeness.missing.length || "no major"} resume gaps. The biggest opportunities are: ${completeness.missing.slice(0, 4).join(", ") || "tightening impact metrics and keyword alignment"}.`,
      suggestions: [
        ...analysis.weaknesses.slice(0, 3),
        "Add quantified impact to your strongest project or experience bullet.",
      ],
      analysis,
    };
  }

  const tips = sectionTips[section] || sectionTips.summary;
  return {
    answer: `Here is how I would improve ${focus}: ${tips[0]} ${tips[1] || ""}`,
    suggestions: [
      ...tips,
      "Make each important line answer: what did you do, how did you do it, and what changed?",
    ],
    analysis,
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

export async function runResumeAssistant(question, resumeData, section = "overall") {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackAssistantResponse(question, resumeData, section);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const resumeText = normalizeResumeData(resumeData);
    const prompt = `
You are a concise Resume AI Assistant inside a resume builder.
Answer the user's question using the current resume data.
Return strict JSON with:
- answer: a helpful direct answer
- suggestions: 3 to 5 specific resume improvements
- analysis: {
  atsScore,
  strengths,
  weaknesses,
  missingKeywords,
  formattingTips,
  actionVerbCount
}

Focused section: ${section}
Question: ${question}

Resume data:
${resumeText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["answer", "suggestions", "analysis"],
          properties: {
            answer: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            analysis: {
              type: Type.OBJECT,
              required: ["atsScore", "strengths", "weaknesses", "missingKeywords", "formattingTips", "actionVerbCount"],
              properties: {
                atsScore: { type: Type.NUMBER },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                formattingTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionVerbCount: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text);
    parsed.analysis.atsScore = Math.max(0, Math.min(100, Math.round(Number(parsed.analysis.atsScore || 0))));
    parsed.analysis.actionVerbCount = Math.max(0, Math.round(Number(parsed.analysis.actionVerbCount || 0)));
    return parsed;
  } catch {
    return fallbackAssistantResponse(question, resumeData, section);
  }
}

/**
 * Generate professional summary using AI
 */
export async function generateProfessionalSummary(name, role, skills, experience, variationSeed = Date.now(), currentSummary = "") {
  const apiKey = process.env.GEMINI_API_KEY;
  const primarySkill = skills.split(",").map((skill) => skill.trim()).filter(Boolean)[0] || "technology";
  const fallbackSummaries = [
    `Motivated ${role || "professional"} with hands-on knowledge of ${primarySkill} and a strong interest in building practical, user-focused solutions. Eager to apply technical skills, learn quickly, and contribute to reliable software delivery.`,
    `Detail-oriented ${role || "professional"} with a foundation in ${primarySkill} and experience developing academic or personal projects. Skilled at learning new tools, solving problems, and turning requirements into working solutions.`,
    `Aspiring ${role || "professional"} with growing expertise in ${primarySkill}, web development, and software fundamentals. Brings curiosity, consistency, and a commitment to improving through real-world engineering work.`,
    `Entry-level ${role || "professional"} with technical exposure to ${primarySkill} and a focus on creating clean, functional applications. Ready to contribute to development teams while continuing to expand engineering depth.`,
  ];
  
  if (!apiKey) {
    const index = Math.abs(Number(variationSeed) || Date.now()) % fallbackSummaries.length;
    return fallbackSummaries[index];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a concise 2-3 sentence professional summary for:
- Name: ${name}
- Current/Target Role: ${role}
- Skills: ${skills}
- Experience: ${experience}
- Current summary to replace: ${currentSummary}
- Variation seed: ${variationSeed}

Return as plain text (no JSON, no quotes). Make it compelling for ATS and recruiters.
Create a fresh version every time. Vary the opening phrase, sentence structure, and emphasis from the current summary while staying truthful to the provided data.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text.trim();
  } catch {
    const index = Math.abs(Number(variationSeed) || Date.now()) % fallbackSummaries.length;
    return fallbackSummaries[index];
  }
}

/**
 * Improve work experience descriptions using AI
 */
export async function improveWorkDescription(role, company, responsibilities) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return `Demonstrated expertise in ${responsibilities || role} with measurable impact on team productivity and project delivery.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Improve this work experience bullet point for a resume:
- Role: ${role}
- Company: ${company}
- Description: ${responsibilities}

Return a single improved bullet point that:
1. Starts with a strong action verb
2. Includes measurable impact or results
3. Is 1-2 sentences max
4. Is ATS-friendly (no special formatting)

Return as plain text only, no explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text.trim();
  } catch {
    return responsibilities || `Delivered strong results in ${role} at ${company}.`;
  }
}

/**
 * Generate achievement suggestions based on role and skills
 */
export async function generateAchievements(role, skills, industry) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return [
      "Delivered projects on schedule while maintaining high quality standards",
      "Improved team efficiency through process optimization",
      "Contributed to company goals through technical excellence",
    ];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Generate 3 impressive achievement bullet points for resume:
- Role: ${role}
- Skills: ${skills}
- Industry: ${industry}

Each should:
1. Start with an action verb
2. Include a quantifiable metric or result
3. Show business impact

Return as JSON array of strings only, no explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const achievements = JSON.parse(response.text);
      return Array.isArray(achievements) ? achievements : [response.text];
    } catch {
      return [response.text];
    }
  } catch {
    return [
      "Delivered projects on schedule while maintaining high quality standards",
      "Improved team efficiency through process optimization",
      "Contributed to company goals through technical excellence",
    ];
  }
}

/**
 * Improve project description using AI
 */
export async function improveProjectDescription(projectName, technologies, details) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return `${projectName} - A ${technologies} project focusing on ${details}.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Improve this project description for a resume:
- Project Name: ${projectName}
- Technologies: ${technologies}
- Details: ${details}

Create a compelling 1-2 sentence description that:
1. Emphasizes business/user impact
2. Highlights technical achievement
3. Includes measurable results if possible
4. Uses action-oriented language

Return as plain text only, no explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text.trim();
  } catch {
    return `${projectName} - Developed using ${technologies} to ${details}.`;
  }
}
