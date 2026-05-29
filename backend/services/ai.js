// Nvidia AI API integration
// Uses NVIDIA API Catalog (https://api.nvcf.com)

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

import {
  buildRoleRoadmapSkills,
  getRoleTemplate,
  inferRoleSkillGaps,
} from "./roleSkillMap.js";

const COMMON_TECH_SKILLS = [
  "HTML", "CSS", "JavaScript", "TypeScript", "React", "Node.js", "Express",
  "Python", "Java", "C++", "SQL", "MongoDB", "PostgreSQL", "MySQL", "Git",
  "GitHub", "REST API", "GraphQL", "Docker", "Kubernetes", "AWS", "Azure",
  "Firebase", "Tailwind", "Bootstrap", "Testing", "Jest", "CI/CD", "Figma",
  "Data Analysis", "Machine Learning", "Excel", "Power BI", "Tableau"
];

// Nvidia API endpoint for chat completions
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";

const QUESTION_STYLE_SUFFIXES = [
  "Frame the answer around architecture, constraints, and measurable impact.",
  "Use one concrete example, one tradeoff, and one lesson learned.",
  "Focus on debugging steps, evidence, and communication under pressure.",
  "Answer as if a hiring manager will probe your exact ownership.",
  "Include what you would improve if you had one more week.",
  "Connect the answer to users, business value, or stakeholder outcomes.",
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
    summary: "Generated using local fallback analysis (Nvidia API key not configured or unavailable).",
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

// Call Nvidia API
async function callNvidiaAPI(prompt, isJsonMode = false) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY not configured");
  }

  const configuredModel = process.env.NVIDIA_MODEL;
  const model = !configuredModel || configuredModel === "nvidia/llama-2-70b-chat"
    ? "nvidia/llama-3.1-nemotron-70b-instruct"
    : configuredModel;
  const timeoutMs = Number(process.env.NVIDIA_TIMEOUT_MS || 12000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: isJsonMode 
              ? "You are a helpful assistant. Always respond with valid JSON only, no additional text or markdown."
              : "You are a helpful, professional assistant."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: isJsonMode ? 4096 : 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Nvidia API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Nvidia API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("❌ Nvidia API: No content in response", data);
      throw new Error("Nvidia API returned empty response");
    }
    
    console.log("✅ Nvidia API call successful");
    return content.trim();
  } catch (error) {
    const message = error.name === "AbortError"
      ? `Nvidia API timed out after ${timeoutMs}ms`
      : error.message;
    console.error("❌ Nvidia API call failed:", message);
    if (error.name === "AbortError") {
      throw new Error(message);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWithNvidia(text) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.log("⚠️  No NVIDIA_API_KEY, using fallback analysis");
    return fallbackResumeAnalysis(text);
  }

  const prompt = `You are an expert ATS specialist and career coach.
Analyze the resume and return ONLY valid JSON (no markdown, no extra text) with:
- atsScore (0-100 number)
- summary (string)
- strengths (array of strings)
- weaknesses (array of strings)
- missingKeywords (array of strings)
- formattingTips (array of strings)
- actionVerbCount (number)

Resume text:
${text}

Response format MUST be valid JSON only:`;

  try {
    console.log("📊 Calling Nvidia API for resume analysis...");
    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON from response (in case there's extra text)
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonStr);
    parsed.atsScore = Math.max(0, Math.min(100, Math.round(Number(parsed.atsScore || 0))));
    parsed.actionVerbCount = Math.max(0, Math.round(Number(parsed.actionVerbCount || 0)));
    console.log("✅ Resume analysis complete. ATS Score:", parsed.atsScore);
    return parsed;
  } catch (error) {
    console.error("❌ Nvidia analysis failed, using fallback:", error.message);
    return fallbackResumeAnalysis(text);
  }
}

async function matchWithNvidia(resume, jd) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.log("⚠️  No NVIDIA_API_KEY, using fallback job match");
    return fallbackJobMatch(resume, jd);
  }

  const prompt = `Compare resume vs job description and return ONLY valid JSON (no markdown, no extra text) with:
- matchPercentage (0-100 number)
- matchedSkills (array of strings)
- unmatchedSkills (array of strings)
- recommendations (array of strings)
- bulletPointOptimizations (array of objects with "original" and "improved" strings)

Resume:
${resume}

Job Description:
${jd}

Response format MUST be valid JSON only:`;

  try {
    console.log("🎯 Calling Nvidia API for job matching...");
    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON from response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonStr);
    parsed.matchPercentage = Math.max(0, Math.min(100, Math.round(Number(parsed.matchPercentage || 0))));
    console.log("✅ Job match complete. Match %:", parsed.matchPercentage);
    return parsed;
  } catch (error) {
    console.error("❌ Nvidia job match failed, using fallback:", error.message);
    return fallbackJobMatch(resume, jd);
  }
}

export async function runResumeAnalysis(text) {
  try {
    return await analyzeWithNvidia(text);
  } catch {
    return fallbackResumeAnalysis(text);
  }
}

export async function runJobMatch(resume, jd) {
  try {
    return await matchWithNvidia(resume, jd);
  } catch {
    return fallbackJobMatch(resume, jd);
  }
}

export async function runResumeAssistant(question, resumeData, section = "overall") {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return fallbackAssistantResponse(question, resumeData, section);
  }

  try {
    const resumeText = normalizeResumeData(resumeData);
    const prompt = `You are a concise Resume AI Assistant inside a resume builder.
Answer the user's question using the current resume data.
Return ONLY valid JSON (no markdown, no extra text) with:
- answer: a helpful direct answer (string)
- suggestions: 3 to 5 specific resume improvements (array of strings)
- analysis: {
  atsScore (number 0-100),
  strengths (array of strings),
  weaknesses (array of strings),
  missingKeywords (array of strings),
  formattingTips (array of strings),
  actionVerbCount (number)
}

Focused section: ${section}
Question: ${question}

Resume data:
${resumeText}

Response format MUST be valid JSON only:`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const parsed = JSON.parse(jsonStr);
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
  const apiKey = process.env.NVIDIA_API_KEY;
  const skillsStr = String(skills || "").trim();
  const primarySkill = skillsStr.split(",").map((skill) => skill.trim()).filter(Boolean)[0] || "technology";
  const fallbackSummaries = [
    `Motivated ${role || "professional"} with hands-on knowledge of ${primarySkill} and a strong interest in building practical, user-focused solutions. Eager to apply technical skills, learn quickly, and contribute to reliable software delivery.`,
    `Detail-oriented ${role || "professional"} with a foundation in ${primarySkill} and experience developing academic or personal projects. Skilled at learning new tools, solving problems, and turning requirements into working solutions.`,
    `Aspiring ${role || "professional"} with growing expertise in ${primarySkill}, web development, and software fundamentals. Brings curiosity, consistency, and a commitment to improving through real-world engineering work.`,
    `Entry-level ${role || "professional"} with technical exposure to ${primarySkill} and a focus on creating clean, functional applications. Ready to contribute to development teams while continuing to expand engineering depth.`,
  ];
  
  if (!apiKey) {
    console.warn("⚠️ NVIDIA_API_KEY not configured, using fallback summary generator");
    const index = Math.abs(Number(variationSeed) || Date.now()) % fallbackSummaries.length;
    return fallbackSummaries[index];
  }

  try {
    const prompt = `Create a concise 2-3 sentence professional summary for:
- Name: ${name}
- Current/Target Role: ${role}
- Skills: ${skills}
- Experience: ${experience}
- Current summary to replace: ${currentSummary}
- Variation seed: ${variationSeed}

Return as plain text only (no JSON, no quotes). Make it compelling for ATS and recruiters.
Create a fresh version every time. Vary the opening phrase, sentence structure, and emphasis from the current summary while staying truthful to the provided data.`;

    const response = await callNvidiaAPI(prompt, false);
    console.log("✅ Professional summary generated via Nvidia API");
    return response.trim();
  } catch (apiError) {
    console.warn("⚠️ Nvidia API call failed, using fallback summary:", apiError.message);
    const index = Math.abs(Number(variationSeed) || Date.now()) % fallbackSummaries.length;
    return fallbackSummaries[index];
  }
}

/**
 * Improve work experience descriptions using AI
 */
export async function improveWorkDescription(role, company, responsibilities) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    return `Demonstrated expertise in ${responsibilities || role} with measurable impact on team productivity and project delivery.`;
  }

  try {
    const prompt = `Improve this work experience bullet point for a resume:
- Role: ${role}
- Company: ${company}
- Description: ${responsibilities}

Return a single improved bullet point that:
1. Starts with a strong action verb
2. Includes measurable impact or results
3. Is 1-2 sentences max
4. Is ATS-friendly (no special formatting)

Return as plain text only, no explanations or extra text.`;

    const response = await callNvidiaAPI(prompt, false);
    return response.trim();
  } catch {
    return responsibilities || `Delivered strong results in ${role} at ${company}.`;
  }
}

/**
 * Generate achievement suggestions based on role and skills
 */
export async function generateAchievements(role, skills, industry) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    return [
      "Delivered projects on schedule while maintaining high quality standards",
      "Improved team efficiency through process optimization",
      "Contributed to company goals through technical excellence",
    ];
  }

  try {
    const prompt = `Generate 3 impressive achievement bullet points for resume. Return ONLY valid JSON array of strings, no extra text.

Details:
- Role: ${role}
- Skills: ${skills}
- Industry: ${industry}

Each achievement should:
1. Start with an action verb
2. Include a quantifiable metric or result
3. Show business impact

Return as JSON array ONLY:`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const achievements = JSON.parse(jsonStr);
    return Array.isArray(achievements) ? achievements : [responseText];
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
  const apiKey = process.env.NVIDIA_API_KEY;
  
  if (!apiKey) {
    return `${projectName} - A ${technologies} project focusing on ${details}.`;
  }

  try {
    const prompt = `Improve this project description for a resume:
- Project Name: ${projectName}
- Technologies: ${technologies}
- Details: ${details}

Create a compelling 1-2 sentence description that:
1. Emphasizes business/user impact
2. Highlights technical achievement
3. Includes measurable results if possible
4. Uses action-oriented language

Return as plain text only, no explanations or extra text.`;

    const response = await callNvidiaAPI(prompt, false);
    return response.trim();
  } catch {
    return `${projectName} - Developed using ${technologies} to ${details}.`;
  }
}

/**
 * Generate interview questions tailored to resume
 */
export async function generateInterviewQuestions(resumeText) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  const fallbackQuestions = [
    "Can you walk us through your most significant technical achievement and the technologies you used?",
    "Tell me about a time you had to solve a challenging problem. What was your approach?",
    "How do you stay current with technology trends and improve your skills?",
    "Describe a situation where you had to work with a difficult team member. How did you handle it?",
    "What are your career goals, and how does this role align with them?",
  ];
  
  if (!apiKey) {
    return fallbackQuestions;
  }

  try {
    const prompt = `Generate 5 tailored interview questions based on this resume. Return ONLY valid JSON array of strings, no extra text.

Resume:
${resumeText}

Questions should:
1. Reference specific skills or experience from the resume
2. Be recruiter-style behavioral and technical questions
3. Ask about concrete examples and measurable results
4. Include both technical and soft skills assessment

Return as JSON array of question strings ONLY:`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const questions = JSON.parse(jsonStr);
    return Array.isArray(questions) && questions.length > 0 ? questions : fallbackQuestions;
  } catch (error) {
    console.warn("Failed to generate interview questions, using fallback:", error.message);
    return fallbackQuestions;
  }
}

/**
 * Evaluate interview answer for clarity, filler words, and accuracy
 */
export async function evaluateInterviewAnswer(question, userAnswer, resumeContext = "") {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  const fillerWordsPattern = /\b(um|uh|like|you know|basically|actually|sort of|kind of|i think|well|so|anyway)\b/gi;
  const fillerWordsFound = (userAnswer.match(fillerWordsPattern) || []).map(w => w.toLowerCase());
  
  if (!apiKey) {
    return {
      score: 75,
      feedback: "Your answer demonstrates good communication. Consider being more specific about measurable outcomes.",
      fillerWords: [...new Set(fillerWordsFound)],
    };
  }

  try {
    const prompt = `Evaluate this interview answer. Return ONLY valid JSON (no markdown, no extra text) with:
- score: number 0-100
- feedback: string with 2-3 sentences of constructive feedback
- suggestions: array of 2-3 specific improvements

Question: ${question}
Answer: ${userAnswer}
${resumeContext ? `Resume context: ${resumeContext.substring(0, 500)}` : ""}

Evaluate on:
1. Relevance to the question
2. Specificity and use of examples
3. Clarity and conciseness
4. Demonstrated skills or achievements

Return as JSON ONLY:`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const evaluation = JSON.parse(jsonStr);
    evaluation.score = Math.max(0, Math.min(100, Math.round(Number(evaluation.score || 75))));
    evaluation.fillerWords = [...new Set(fillerWordsFound)];
    
    return evaluation;
  } catch (error) {
    console.warn("Failed to evaluate interview answer:", error.message);
    return {
      score: 75,
      feedback: "Your answer demonstrates good communication. Consider being more specific about measurable outcomes.",
      fillerWords: [...new Set(fillerWordsFound)],
    };
  }
}

/**
 * Infer missing skills from resume text and a target role.
 */
export async function inferSkillGapsFromResume(resumeText, targetRole = "", extraSkills = []) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const role = String(targetRole || "").trim();
  const extras = Array.isArray(extraSkills)
    ? extraSkills.map((skill) => String(skill || "").trim()).filter(Boolean)
    : [];
  const roleFallback = inferRoleSkillGaps(resumeText, role, extras);
  const roleTemplate = getRoleTemplate(role);

  if (!apiKey || !resumeText) {
    return roleFallback;
  }

  try {
    const prompt = `Analyze this resume for the target role and infer missing or weak skills. Return ONLY valid JSON with:
- detectedSkills: array of 6-16 concrete skills, tools, languages, frameworks, or platforms already present in the resume
- inferredSkills: array of 4-8 specific skills the candidate should learn or strengthen
- addedSkills: array containing only these user-requested extra skills: ${JSON.stringify(extras)}
- sourceSummary: one concise sentence explaining what the roadmap is based on

Target role: ${role}
Role baseline skills: ${JSON.stringify(roleTemplate.foundSkills)}
Role gap template: ${JSON.stringify(roleTemplate.gaps)}
Resume text:
${String(resumeText).slice(0, 8000)}

Rules:
1. Do not include skills that are already strongly demonstrated in the resume unless they need deeper portfolio proof.
2. Prefer concrete tools and capabilities over vague traits.
3. Include user-requested extra skills in addedSkills, not inferredSkills.
4. Use the role baseline and role gap template as the fallback domain model.
5. Do not return web-development skills unless the target role is actually web, MERN, frontend, backend, or full-stack.
6. Return JSON only.`;

    const responseText = await callNvidiaAPI(prompt, true);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    const detectedSkills = Array.isArray(parsed.detectedSkills) ? parsed.detectedSkills : roleFallback.detectedSkills;
    const inferredSkills = Array.isArray(parsed.inferredSkills) ? parsed.inferredSkills : [];
    const addedSkills = Array.isArray(parsed.addedSkills) ? parsed.addedSkills : extras;

    const normalizedAdded = [...new Set(addedSkills.map((skill) => String(skill || "").trim()).filter(Boolean))];
    const addedLookup = new Set(normalizedAdded.map((skill) => skill.toLowerCase()));
    const allowedFoundSkills = new Set(roleTemplate.foundSkills.map((skill) => skill.toLowerCase()));
    const allowedGapSkills = new Set(roleTemplate.gaps.map((skill) => skill.toLowerCase()));
    const roleMatchedDetected = [...new Set(detectedSkills.map((skill) => String(skill || "").trim()).filter(Boolean))]
      .filter((skill) => allowedFoundSkills.has(skill.toLowerCase()));
    const roleMatchedGaps = [...new Set(inferredSkills.map((skill) => String(skill || "").trim()).filter(Boolean))]
      .filter((skill) => allowedGapSkills.has(skill.toLowerCase()))
      .filter((skill) => !addedLookup.has(skill.toLowerCase()));

    return {
      detectedSkills: (roleMatchedDetected.length ? roleMatchedDetected : roleFallback.detectedSkills).slice(0, 16),
      inferredSkills: (roleMatchedGaps.length ? roleMatchedGaps : roleFallback.inferredSkills).slice(0, 8),
      addedSkills: normalizedAdded,
      sourceSummary: roleFallback.sourceSummary,
    };
  } catch (error) {
    console.warn("Failed to infer skill gaps from resume:", error.message);
    return roleFallback;
  }
}

/**
 * Generate personalized skill roadmap with project recommendations
 */
function learningResourcesForSkill(skill = "") {
  const lower = String(skill).toLowerCase();
  const catalog = [
    {
      match: ["react", "frontend", "javascript"],
      resources: [
        ["React Docs", "Official React learning path with hooks, components, and state patterns.", "https://react.dev/learn", "React", "Beginner", "6-8h", "Documentation", "Free"],
        ["MDN JavaScript Guide", "Reliable JavaScript fundamentals and browser API references.", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", "MDN", "Beginner", "8h", "Documentation", "Free"],
        ["Frontend Mentor", "Practice product-quality UI builds from realistic briefs.", "https://www.frontendmentor.io/", "Frontend Mentor", "Intermediate", "Project", "Project", "Free/Paid"],
      ],
    },
    {
      match: ["node", "backend", "api", "express"],
      resources: [
        ["Node.js Learn", "Official Node guides for runtime fundamentals, APIs, and deployment.", "https://nodejs.org/en/learn", "Node.js", "Beginner", "6h", "Documentation", "Free"],
        ["freeCodeCamp Backend APIs", "Hands-on backend, REST API, and microservice curriculum.", "https://www.freecodecamp.org/learn/back-end-development-and-apis/", "freeCodeCamp", "Beginner", "20h", "Course", "Free"],
      ],
    },
    {
      match: ["machine learning", "ai", "ml", "pytorch", "tensorflow"],
      resources: [
        ["Hugging Face Learn", "Modern AI workflows using transformers, datasets, and model tooling.", "https://huggingface.co/learn", "Hugging Face", "Intermediate", "12h", "Course", "Free"],
        ["DeepLearning.AI Short Courses", "Applied AI lessons for production workflows and model reasoning.", "https://www.deeplearning.ai/short-courses/", "DeepLearning.AI", "Intermediate", "4-8h", "Course", "Free/Paid"],
        ["PyTorch Tutorials", "Official PyTorch tutorials from tensors to model training.", "https://pytorch.org/tutorials/", "PyTorch", "Intermediate", "10h", "Documentation", "Free"],
      ],
    },
    {
      match: ["security", "cyber", "owasp"],
      resources: [
        ["OWASP Top 10", "Core web security risks and practical mitigation guidance.", "https://owasp.org/www-project-top-ten/", "OWASP", "Beginner", "4h", "Documentation", "Free"],
        ["PortSwigger Web Security Academy", "Interactive labs for real web security vulnerabilities.", "https://portswigger.net/web-security", "PortSwigger", "Intermediate", "20h", "Course", "Free"],
      ],
    },
    {
      match: ["ui", "ux", "figma", "design"],
      resources: [
        ["Figma Learn", "Design tooling, prototyping, and collaboration learning resources.", "https://www.figma.com/resource-library/", "Figma", "Beginner", "5h", "Course", "Free"],
        ["Nielsen Norman Group", "Research-backed UX articles and usability guidance.", "https://www.nngroup.com/articles/", "NN/g", "Intermediate", "Ongoing", "Article", "Free/Paid"],
      ],
    },
  ];

  const selected = catalog.find((entry) => entry.match.some((term) => lower.includes(term)))?.resources || [
    ["Official Documentation", `Primary documentation and examples for ${skill}.`, "https://www.google.com/search?q=official+documentation", "Official Docs", "Beginner", "6h", "Documentation", "Free"],
    ["freeCodeCamp", "Structured lessons with hands-on practice and portfolio projects.", "https://www.freecodecamp.org/learn/", "freeCodeCamp", "Beginner", "20h", "Course", "Free"],
    ["Project Practice", `Build a practical ${skill} mini project with a README and demo.`, "https://github.com/topics/projects", "GitHub", "Intermediate", "1 week", "Project", "Free"],
  ];

  return selected.map(([title, description, url, provider, difficulty, duration, type, pricing]) => ({
    title,
    description,
    url,
    provider,
    difficulty,
    duration,
    type,
    pricing,
  }));
}

function certificationsForSkill(skill = "") {
  return [
    {
      name: `${skill} Portfolio Proof`,
      provider: "GitHub + Deployed Demo",
      cost: "Free",
      recognition: "Strong practical signal when the README, demo, and resume bullet are polished.",
      link: "https://github.com/",
    },
    {
      name: `${skill} Professional Certificate`,
      provider: "Coursera / Vendor Academy",
      cost: "Free audit or paid certificate",
      recognition: "Useful when matched to the target role and supported by a project.",
      link: "https://www.coursera.org/",
    },
  ];
}

function sanitizeRoadmapSkill(skillItem = {}, fallbackSkill = {}, skillName = "", targetRole = "") {
  const skillLabel = String(skillItem.skill || fallbackSkill.skill || skillName || "").trim();
  if (!skillLabel) return fallbackSkill;
  const fallbackResources = Array.isArray(fallbackSkill.learningResources) ? fallbackSkill.learningResources : [];
  const fallbackMilestones = Array.isArray(fallbackSkill.milestones) ? fallbackSkill.milestones : [];
  const fallbackProjects = Array.isArray(fallbackSkill.projects) ? fallbackSkill.projects : [];
  const aiResources = Array.isArray(skillItem.learningResources) ? skillItem.learningResources : [];
  const resources = [...fallbackResources, ...aiResources].filter((item, index, list) => {
    const title = String(item?.title || item || "").toLowerCase();
    const url = String(item?.url || "").toLowerCase();
    return title && list.findIndex((candidate) => {
      const candidateTitle = String(candidate?.title || candidate || "").toLowerCase();
      const candidateUrl = String(candidate?.url || "").toLowerCase();
      return candidateTitle === title || (url && candidateUrl === url);
    }) === index;
  }).slice(0, 4);
  const certifications = Array.isArray(skillItem.certifications) && skillItem.certifications.length
    ? skillItem.certifications
    : (fallbackSkill.certifications || certificationsForSkill(skillLabel));
  const milestones = Array.isArray(skillItem.milestones) && skillItem.milestones.length
    ? skillItem.milestones
    : fallbackMilestones;
  const projects = Array.isArray(skillItem.projects) && skillItem.projects.length
    ? skillItem.projects
    : fallbackProjects;

  return {
    ...fallbackSkill,
    ...skillItem,
    skill: skillLabel,
    whyItMatters: skillItem.whyItMatters || fallbackSkill.whyItMatters || `${skillLabel} is a hiring signal for ${targetRole || "the target role"} when backed by practical proof.`,
    targetOutcome: skillItem.targetOutcome || fallbackSkill.targetOutcome || `Build and explain a practical ${skillLabel} artifact.`,
    prerequisites: Array.isArray(skillItem.prerequisites) && skillItem.prerequisites.length
      ? skillItem.prerequisites
      : (fallbackSkill.prerequisites || []),
    learningResources: resources,
    certifications,
    milestones: milestones.map((milestone, index) => ({
      ...(fallbackMilestones[index] || {}),
      ...milestone,
      learningResources: Array.isArray(milestone.learningResources) && milestone.learningResources.length
        ? milestone.learningResources
        : (fallbackMilestones[index]?.learningResources || resources.slice(0, 2)),
      projects: Array.isArray(milestone.projects) && milestone.projects.length
        ? milestone.projects
        : (fallbackMilestones[index]?.projects || projects.slice(0, 1)),
    })),
    projects: projects.map((project, index) => ({
      ...(fallbackProjects[index] || {}),
      ...project,
      technologies: Array.isArray(project.technologies) && project.technologies.length
        ? project.technologies
        : (fallbackProjects[index]?.technologies || [skillLabel]),
      learningResources: Array.isArray(project.learningResources) && project.learningResources.length
        ? project.learningResources
        : (fallbackProjects[index]?.learningResources || resources.slice(0, 2).map((item) => item.title || item)),
    })),
  };
}

export async function generateSkillRoadmap(missingSkills, targetRole = "") {
  const apiKey = process.env.NVIDIA_API_KEY;
  const normalizedSkills = Array.isArray(missingSkills)
    ? missingSkills.map((skill) => String(skill || "").trim()).filter(Boolean)
    : [];
  const roleTemplate = getRoleTemplate(targetRole);
  
  const fallbackSkills = buildRoleRoadmapSkills(normalizedSkills, targetRole);
  
  if (!apiKey) {
    return { skills: fallbackSkills };
  }

  try {
    const skillsList = (normalizedSkills.length ? normalizedSkills : roleTemplate.gaps).join(", ");
    const prompt = `Generate a detailed AI learning roadmap for these missing skills. Return ONLY valid JSON (no markdown, no extra text) with:
- skills: array of objects, each with:
  - skill: string
  - proficiency: string (beginner/intermediate/advanced)
  - importance: string (high/medium/low)
  - whyItMatters: string explaining why recruiters or hiring managers value this skill for the target role
  - targetOutcome: string describing what the learner should be able to build, explain, and show after the roadmap
  - prerequisites: array of 2-4 short strings
  - learningResources: array of resource objects with title, description, url, provider, difficulty, duration, type, pricing
  - certifications: array of certification objects with name, provider, cost, recognition, link
  - milestones: array of 3-5 objects with:
    - week: string (example: "Week 1")
    - title: string
    - goals: array of 2-3 strings
    - practiceTasks: array of 2-4 specific tasks
    - deliverables: array of 1-3 tangible outputs
    - estimatedHours: number
    - learningResources: array of resource objects with title, description, url, provider, difficulty, duration, type, pricing
    - projects: array of practice project objects
  - projects: array of objects with:
    - name: string
    - description: string with concrete scope and user story
    - timeframe: string (e.g., "weekend", "1 week", "2 weeks")
    - technologies: array of strings
    - learningResources: array of strings with specific docs, courses, or search phrases
    - acceptanceCriteria: array of 3-5 checklist items proving the project is complete
    - portfolioProof: string explaining what screenshot, demo, repo, README, or metric should be shown
    - resumeBullet: string written as a strong resume bullet with action verb and measurable scope
    - stretchGoal: string
    - estimatedHours: number

Missing skills: ${skillsList}
Target role/position: ${targetRole}
Role baseline skills: ${JSON.stringify(roleTemplate.foundSkills)}
Role-specific milestone themes: ${JSON.stringify(roleTemplate.milestones)}
Preferred resources for this role: ${JSON.stringify(roleTemplate.resources.map((item) => item.title))}
Practice project examples: ${JSON.stringify(roleTemplate.practiceProjects.map((item) => item.name))}

For each skill:
1. Build a practical 2-4 week learning path with weekly milestones
2. Suggest 2 portfolio-worthy projects that demonstrate the exact skill in a hiring-relevant context
3. Include concrete technologies, learning resources, acceptance criteria, and deliverables
4. Make the plan beginner-friendly but not vague; every item should be actionable
5. Include resume bullets that a candidate could adapt after completing the project
6. Keep resources, projects, and milestones specific to the target role; never use MERN/web-development defaults for unrelated roles.

Return as JSON ONLY:`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const roadmap = JSON.parse(jsonStr);
    const allowedSkills = new Set(
      (normalizedSkills.length ? normalizedSkills : roleTemplate.gaps)
        .map((skill) => skill.toLowerCase())
    );
    const aiSkills = Array.isArray(roadmap.skills)
      ? roadmap.skills.filter((item) => allowedSkills.has(String(item?.skill || "").trim().toLowerCase()))
      : [];
    const fallbackBySkill = new Map(fallbackSkills.map((item) => [item.skill.toLowerCase(), item]));
    const sanitizedSkills = (normalizedSkills.length ? normalizedSkills : roleTemplate.gaps)
      .map((skill) => {
        const aiSkill = aiSkills.find((item) => String(item.skill || "").trim().toLowerCase() === skill.toLowerCase());
        return sanitizeRoadmapSkill(aiSkill, fallbackBySkill.get(skill.toLowerCase()), skill, targetRole);
      })
      .filter(Boolean);
    return { skills: sanitizedSkills.length ? sanitizedSkills : fallbackSkills };
  } catch (error) {
    console.warn("Failed to generate skill roadmap:", error.message);
    return { skills: fallbackSkills };
  }
}

/**
 * Generate detailed interview questions with metadata
 */
export async function generateDetailedInterviewQuestions(resumeText) {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  const fallbackQuestions = [
    {
      question: "Can you walk us through your most significant technical achievement and the technologies you used?",
      type: "Technical",
      company: "Target employer",
      answer: "Discuss a specific project where you made measurable impact. Mention the technologies, your role, and quantifiable results (e.g., 'improved performance by 40%').",
      grounding: "Strong technical foundation"
    },
    {
      question: "Tell me about a time you had to solve a challenging problem. What was your approach?",
      type: "Behavioral",
      company: "Target employer",
      answer: "Use the STAR method: Situation, Task, Action, Result. Highlight your problem-solving process and any lessons learned.",
      grounding: "Problem-solving skills"
    },
    {
      question: "How do you stay current with technology trends and improve your skills?",
      type: "Behavioral",
      company: "Target employer",
      answer: "Mention specific resources you use (online courses, conferences, personal projects, open source contributions) and give concrete examples of technologies you've recently learned.",
      grounding: "Continuous learning"
    },
    {
      question: "Describe a situation where you had to work with a difficult team member. How did you handle it?",
      type: "Behavioral",
      company: "Target employer",
      answer: "Focus on communication, empathy, and finding common ground. Show how you resolved conflicts professionally.",
      grounding: "Collaboration skills"
    },
    {
      question: "What are your career goals, and how does this role align with them?",
      type: "Behavioral",
      company: "Target employer",
      answer: "Articulate clear, realistic goals aligned with the role. Show how this position will help you grow and contribute value.",
      grounding: "Career alignment"
    }
  ];
  
  if (!apiKey) {
    return fallbackQuestions;
  }

  try {
    const prompt = `Generate 5 interview questions based on this resume. Return ONLY valid JSON array of objects, no extra text.

Resume:
${resumeText}

For each question, return an object with:
- question: string (the interview question)
- type: string (Technical, Behavioral, or Role-specific)
- company: string (target company type or industry)
- answer: string (suggested answer approach)
- grounding: string (what resume skill/experience this tests)

Questions should:
1. Reference specific skills or experience from the resume
2. Be recruiter-style behavioral and technical questions
3. Include suggested answer approach
4. Be grounded in resume content

Return as JSON array ONLY (no markdown):`;

    const responseText = await callNvidiaAPI(prompt, true);
    
    // Extract JSON
    let jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const questions = JSON.parse(jsonStr);
    return Array.isArray(questions) && questions.length > 0 ? questions.slice(0, 5) : fallbackQuestions;
  } catch (error) {
    console.warn("Failed to generate detailed interview questions, using fallback:", error.message);
    return fallbackQuestions;
  }
}

function normalizeQuestionText(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function questionSimilarity(a = "", b = "") {
  const aWords = new Set(normalizeQuestionText(a).split(" ").filter((word) => word.length > 2));
  const bWords = new Set(normalizeQuestionText(b).split(" ").filter((word) => word.length > 2));
  if (!aWords.size || !bWords.size) return 0;
  const overlap = [...aWords].filter((word) => bWords.has(word)).length;
  return overlap / Math.max(aWords.size, bWords.size);
}

function isSimilarToPrevious(question, previousQuestions = []) {
  const normalized = normalizeQuestionText(question);
  return previousQuestions.some((previous) => {
    const previousNormalized = normalizeQuestionText(previous);
    return previousNormalized === normalized || questionSimilarity(normalized, previousNormalized) >= 0.72;
  });
}

function inferResumeSignals(resumeText = "") {
  const lower = String(resumeText).toLowerCase();
  const cleanSignal = (value = "", fallback = "") =>
    String(value || fallback)
      .replace(/^(for|about|on|in|with)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  const skills = [
    "React", "Node.js", "JavaScript", "Python", "Java", "SQL", "MongoDB", "Docker",
    "AWS", "Machine Learning", "Data Analysis", "REST API", "Tailwind", "Git",
  ].filter((skill) => lower.includes(skill.toLowerCase().replace(".", "")) || lower.includes(skill.toLowerCase()));
  const projectMatch = String(resumeText).match(/(?:project|projects)[:\s-]+([^\n.]{8,80})/i);
  const activityMatch = String(resumeText).match(/(?:hackathon|volunteer|club|community|campus|event|activity)[^\n.]{0,80}/i);
  const educationMatch = String(resumeText).match(/(?:bachelor|b\.tech|college|university|semester|sem|degree)[^\n.]{0,80}/i);

  return {
    primarySkill: skills[0] || "your strongest technical skill",
    secondarySkill: skills[1] || "problem solving",
    project: cleanSignal(projectMatch?.[1], "your most relevant project"),
    activity: cleanSignal(activityMatch?.[0], "your extracurricular or leadership experience"),
    education: cleanSignal(educationMatch?.[0], "your education background"),
  };
}

function fallbackFreshInterviewQuestions(resumeText = "", previousQuestions = [], seed = Date.now()) {
  const signals = inferResumeSignals(resumeText);
  const styleSets = [
    {
      type: "Technical",
      company: "Engineering team",
      question: `How would you explain the technical architecture behind ${signals.project}, and what tradeoff did you make around ${signals.primarySkill}?`,
      answer: `Walk through the problem, architecture, tools used, constraints, and one measurable or user-facing outcome. Mention why ${signals.primarySkill} was a good choice.`,
      grounding: signals.project,
    },
    {
      type: "Project-based",
      company: "Product-focused employer",
      question: `Pick one project from your resume and describe how you would improve it if a real company asked you to scale it for more users.`,
      answer: "Discuss bottlenecks, reliability, testing, deployment, security, and a practical roadmap for scaling.",
      grounding: "Resume projects",
    },
    {
      type: "Behavioral",
      company: "Cross-functional team",
      question: `Tell me about a time you had to learn something quickly for ${signals.project} or ${signals.activity}. How did you handle uncertainty?`,
      answer: "Use the STAR method and include how you learned, applied feedback, and measured success.",
      grounding: signals.activity,
    },
    {
      type: "HR",
      company: "Recruiter screen",
      question: `Your resume shows ${signals.education}. How has that prepared you for this role, and where do you still want to grow?`,
      answer: "Connect education to role-readiness, then name one honest growth area with a concrete learning plan.",
      grounding: signals.education,
    },
    {
      type: "Company-angle",
      company: "Fast-moving startup",
      question: `If you joined a startup tomorrow, which resume skill would help you contribute fastest and what would you build in your first two weeks?`,
      answer: "Choose a skill, name a small useful deliverable, and describe how you would validate impact with users or teammates.",
      grounding: signals.primarySkill,
    },
    {
      type: "Problem-solving",
      company: "Senior engineering panel",
      question: `Imagine ${signals.project} suddenly starts failing for some users. How would you debug, prioritize, and communicate the fix?`,
      answer: "Explain reproduction, logs, hypothesis testing, rollback options, communication, and prevention.",
      grounding: signals.project,
    },
    {
      type: "Technical",
      company: "Code review panel",
      question: `What is one code quality or testing improvement you would add to your resume projects before showing them to an engineering manager?`,
      answer: "Discuss tests, error handling, readable structure, documentation, and CI checks.",
      grounding: "Project quality gaps",
    },
    {
      type: "Behavioral",
      company: "Team leadership round",
      question: `Describe a moment from ${signals.activity} where coordination mattered. What did you do, and what would you do differently now?`,
      answer: "Show ownership, collaboration, reflection, and a clear improvement.",
      grounding: signals.activity,
    },
  ];

  const rotation = seed % styleSets.length;
  const rotated = styleSets.slice(rotation).concat(styleSets.slice(0, rotation));
  const selected = [];
  let attempt = 0;

  while (selected.length < 5 && attempt < rotated.length * 3) {
    const base = rotated[attempt % rotated.length];
    const suffix = QUESTION_STYLE_SUFFIXES[(seed + attempt + selected.length) % QUESTION_STYLE_SUFFIXES.length];
    const candidate = {
      ...base,
      question: attempt < rotated.length
        ? base.question
        : `${base.question} ${suffix}`,
    };
    if (!isSimilarToPrevious(candidate.question, [...previousQuestions, ...selected.map((item) => item.question)])) {
      selected.push(candidate);
    }
    attempt += 1;
  }

  while (selected.length < 5) {
    const base = rotated[(selected.length + rotation) % rotated.length];
    const suffix = QUESTION_STYLE_SUFFIXES[(seed + selected.length) % QUESTION_STYLE_SUFFIXES.length];
    selected.push({
      ...base,
      question: `${base.question} ${suffix}`,
    });
  }

  return selected.slice(0, 5);
}

export async function generateFreshDetailedInterviewQuestions(resumeText, previousQuestions = [], attemptSeed = Date.now()) {
  const styles = ["technical", "HR", "project-based", "behavioral", "company-angle", "problem-solving"];
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return fallbackFreshInterviewQuestions(resumeText, previousQuestions, attemptSeed);
  }

  try {
    const prompt = `Generate a fresh set of 5 interview questions. Return ONLY valid JSON array of objects.

Resume:
${String(resumeText || "").slice(0, 7000)}

Previously used questions to avoid:
${previousQuestions.slice(-40).map((q, i) => `${i + 1}. ${q}`).join("\n") || "None"}

Required mix:
- Use these styles across the set: ${styles.join(", ")}
- Base questions on resume projects, skills, education, activities, and gaps.
- Do not repeat or paraphrase previous questions.
- Make this attempt feel new and personalized.

For each object:
- question: string
- type: one of Technical, HR, Project-based, Behavioral, Company-angle, Problem-solving
- company: string
- answer: sample answer approach, 2-3 sentences
- grounding: exact resume signal or gap being tested

Return JSON array only:`;

    const responseText = await callNvidiaAPI(prompt, true);
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    const fresh = Array.isArray(parsed)
      ? parsed.filter((item) => item?.question && !isSimilarToPrevious(item.question, previousQuestions))
      : [];

    if (fresh.length >= 5) return fresh.slice(0, 5);

    const fallback = fallbackFreshInterviewQuestions(resumeText, [...previousQuestions, ...fresh.map((item) => item.question)], attemptSeed);
    return [...fresh, ...fallback].slice(0, 5);
  } catch (error) {
    console.warn("Failed to generate fresh detailed interview questions:", error.message);
    return fallbackFreshInterviewQuestions(resumeText, previousQuestions, attemptSeed);
  }
}
