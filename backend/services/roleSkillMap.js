const resource = (title, description, url, provider, difficulty, duration, type, pricing = "Free") => ({
  title,
  description,
  url,
  provider,
  difficulty,
  duration,
  type,
  pricing,
});

const certification = (name, provider, cost, recognition, link) => ({
  name,
  provider,
  cost,
  recognition,
  link,
});

const project = (name, description, technologies, estimatedHours = 10) => ({
  name,
  description,
  timeframe: estimatedHours <= 8 ? "weekend" : "1 week",
  technologies,
  learningResources: technologies.map((item) => `${item} practice reference`),
  acceptanceCriteria: [
    "Clear objective and learner/user outcome",
    "Reusable template, artifact, or documented workflow",
    "Reflection notes explaining decisions and improvements",
  ],
  portfolioProof: "Screenshots, document link, template, README, or short case-study note.",
  resumeBullet: `Created a practical ${name.toLowerCase()} to demonstrate role-ready applied skills and structured execution.`,
  stretchGoal: "Add peer feedback, metrics, or a before/after comparison.",
  estimatedHours,
});

export const roleSkillMap = {
  teacher: {
    foundSkills: [
      "Communication",
      "Lesson Planning",
      "Classroom Management",
      "Subject Knowledge",
      "Student Assessment",
      "Curriculum Planning",
    ],
    gaps: [
      "Digital Teaching Tools",
      "Smart Classroom Tools",
      "Assessment Design",
      "Educational Psychology",
      "Student Engagement",
      "LMS Platforms",
    ],
    milestones: [
      "Lesson Planning",
      "Classroom Management",
      "Digital Teaching Tools",
      "Assessment Methods",
      "Student Engagement",
      "Communication Skills",
    ],
    resources: [
      resource("Google Classroom Help", "Official help center for assignments, grading, rubrics, and class communication.", "https://support.google.com/edu/classroom/", "Google", "Beginner", "3h", "Documentation"),
      resource("Khan Academy Teacher Resources", "Teacher tools for practice, progress monitoring, and classroom implementation.", "https://www.khanacademy.org/resources/teacher-essentials", "Khan Academy", "Beginner", "4h", "Course"),
      resource("Coursera Teaching Courses", "University-backed courses on teaching methods, pedagogy, and learning science.", "https://www.coursera.org/courses?query=teaching", "Coursera", "Intermediate", "8-20h", "Course", "Free/Paid"),
      resource("Edutopia Articles", "Practical classroom strategies for engagement, assessment, and inclusive teaching.", "https://www.edutopia.org/", "Edutopia", "Beginner", "Ongoing", "Article"),
    ],
    practiceProjects: [
      project("Create a Lesson Plan", "Design a complete lesson plan with learning objectives, activities, assessment, and differentiation.", ["Lesson Planning", "Curriculum Planning"], 6),
      project("Build a Student Progress Tracker", "Create a tracker for attendance, assessment scores, interventions, and parent communication notes.", ["Student Assessment", "LMS Platforms"], 8),
      project("Design a Quiz", "Build a quiz with answer key, rubric, difficulty levels, and remediation notes.", ["Assessment Design"], 5),
      project("Prepare a Digital Teaching Presentation", "Create an interactive classroom presentation using visuals, checks for understanding, and reflection prompts.", ["Digital Teaching Tools", "Student Engagement"], 6),
    ],
    certifications: [
      certification("Google Certified Educator", "Google for Education", "Paid exam", "Recognized signal for digital classroom tooling.", "https://edu.google.com/intl/ALL_in/for-educators/certification-programs/product-expertise/educator-level1/"),
      certification("Teaching with Technology", "Coursera / University partners", "Free audit or paid certificate", "Useful for smart classroom and blended learning readiness.", "https://www.coursera.org/courses?query=teaching%20technology"),
    ],
  },
  "mern developer": {
    foundSkills: ["HTML", "CSS", "JavaScript", "React", "Node.js", "Express", "MongoDB", "Git", "GitHub"],
    gaps: ["API Security", "Testing", "Deployment", "Performance Optimization", "System Design"],
    milestones: ["Secure REST APIs", "Automated Testing", "Cloud Deployment", "Performance Optimization", "System Design Basics"],
    resources: [
      resource("React Docs", "Official React learning path for components, hooks, and state patterns.", "https://react.dev/learn", "React", "Beginner", "6-8h", "Documentation"),
      resource("Node.js Learn", "Official Node guides for runtime fundamentals and backend APIs.", "https://nodejs.org/en/learn", "Node.js", "Beginner", "6h", "Documentation"),
      resource("MongoDB University", "Free MongoDB courses for schema design, aggregation, and application development.", "https://learn.mongodb.com/", "MongoDB", "Intermediate", "10h", "Course"),
      resource("OWASP API Security Top 10", "Common API security risks and practical mitigations.", "https://owasp.org/API-Security/editions/2023/en/0x11-t10/", "OWASP", "Intermediate", "5h", "Documentation"),
    ],
    practiceProjects: [
      project("Secure MERN Auth Flow", "Build login, protected routes, JWT refresh, validation, and role-based access.", ["React", "Node.js", "Express", "MongoDB", "API Security"], 18),
      project("Tested REST API Suite", "Add unit and integration tests for core API flows with realistic seed data.", ["Jest", "Supertest", "Express"], 14),
      project("Deployed MERN Dashboard", "Deploy a full-stack app with environment variables, logs, and performance checks.", ["Render", "Vercel", "MongoDB Atlas"], 16),
    ],
    certifications: [
      certification("MongoDB Associate Developer", "MongoDB", "Paid exam", "Strong backend signal for MERN roles.", "https://learn.mongodb.com/pages/mongodb-associate-developer-exam"),
      certification("Meta Front-End Developer", "Coursera / Meta", "Paid certificate", "Recognized frontend foundation when paired with MERN projects.", "https://www.coursera.org/professional-certificates/meta-front-end-developer"),
    ],
  },
  "data analyst": {
    foundSkills: ["Excel", "SQL", "Python", "Statistics", "Data Visualization"],
    gaps: ["Power BI", "Tableau", "Pandas", "NumPy", "Dashboard Design", "Business Case Studies"],
    milestones: ["SQL Analysis", "Python Data Cleaning", "Dashboard Design", "Business Case Storytelling", "Stakeholder Reporting"],
    resources: [
      resource("Microsoft Learn Power BI", "Official Power BI learning modules for reports, models, and dashboards.", "https://learn.microsoft.com/en-us/training/powerplatform/power-bi", "Microsoft Learn", "Beginner", "8h", "Course"),
      resource("Tableau Learning", "Training videos and paths for Tableau dashboards and analytics workflows.", "https://www.tableau.com/learn/training", "Tableau", "Beginner", "6h", "Video"),
      resource("Pandas Documentation", "Official pandas guides for cleaning, transforming, and analyzing data.", "https://pandas.pydata.org/docs/", "Pandas", "Intermediate", "8h", "Documentation"),
      resource("Kaggle Learn", "Short hands-on notebooks for Python, pandas, SQL, and visualization.", "https://www.kaggle.com/learn", "Kaggle", "Beginner", "5h", "Course"),
    ],
    practiceProjects: [
      project("Sales KPI Dashboard", "Analyze sales data and build an executive dashboard with trends, filters, and recommendations.", ["Excel", "Power BI", "Dashboard Design"], 14),
      project("Customer Churn Analysis", "Clean customer data, identify churn drivers, and summarize business actions.", ["Python", "Pandas", "Statistics"], 16),
      project("SQL Business Case Study", "Answer stakeholder questions from a relational dataset using documented SQL queries.", ["SQL", "Business Case Studies"], 10),
    ],
    certifications: [
      certification("PL-300 Power BI Data Analyst", "Microsoft", "Paid exam", "Recognized credential for BI analyst roles.", "https://learn.microsoft.com/en-us/credentials/certifications/power-bi-data-analyst-associate/"),
      certification("Google Data Analytics Certificate", "Coursera / Google", "Paid certificate", "Useful entry-level signal for analytics workflows.", "https://www.coursera.org/professional-certificates/google-data-analytics"),
    ],
  },
  "ui/ux designer": {
    foundSkills: ["Wireframing", "Prototyping", "Figma", "User Research", "Design Systems"],
    gaps: ["Accessibility", "Usability Testing", "UX Writing", "Design Handoff", "Portfolio Case Studies"],
    milestones: ["Research Planning", "Wireframes", "Interactive Prototypes", "Usability Testing", "Accessible Design", "Case Study Writing"],
    resources: [
      resource("Figma Learn", "Official lessons for Figma design, prototyping, and collaboration workflows.", "https://www.figma.com/resource-library/", "Figma", "Beginner", "5h", "Course"),
      resource("Nielsen Norman Group", "Research-backed UX articles on usability, research, and interaction design.", "https://www.nngroup.com/articles/", "NN/g", "Intermediate", "Ongoing", "Article", "Free/Paid"),
      resource("WCAG Quick Reference", "Accessibility guidelines and implementation references.", "https://www.w3.org/WAI/WCAG22/quickref/", "W3C", "Intermediate", "6h", "Documentation"),
      resource("Material Design", "Practical design system guidance for components, motion, and patterns.", "https://m3.material.io/", "Google", "Beginner", "4h", "Documentation"),
    ],
    practiceProjects: [
      project("Mobile App UX Case Study", "Research, wireframe, prototype, test, and document a user-centered app flow.", ["Figma", "User Research", "Portfolio Case Studies"], 18),
      project("Accessibility Audit", "Audit a product screen against WCAG and redesign the key interaction states.", ["Accessibility", "Design Systems"], 10),
      project("Design Handoff Package", "Prepare specs, components, naming, and developer notes for one feature.", ["Figma", "Design Handoff"], 8),
    ],
    certifications: [
      certification("Google UX Design Certificate", "Coursera / Google", "Paid certificate", "Popular portfolio-building path for junior UX roles.", "https://www.coursera.org/professional-certificates/google-ux-design"),
      certification("NN/g UX Certification", "Nielsen Norman Group", "Paid", "Highly respected professional UX credential.", "https://www.nngroup.com/ux-certification/"),
    ],
  },
  "cybersecurity analyst": {
    foundSkills: ["Networking", "Linux", "Security Fundamentals", "Risk Assessment", "Incident Response"],
    gaps: ["OWASP Top 10", "SIEM Monitoring", "Threat Modeling", "Vulnerability Assessment", "Log Analysis", "Security Reporting"],
    milestones: ["Networking and Linux Basics", "Web Security", "SIEM and Log Analysis", "Incident Response", "Threat Modeling", "Security Reporting"],
    resources: [
      resource("TryHackMe", "Guided cybersecurity rooms for fundamentals, blue team, and web security.", "https://tryhackme.com/", "TryHackMe", "Beginner", "20h", "Course", "Free/Paid"),
      resource("Hack The Box Academy", "Structured labs for offensive and defensive security skills.", "https://academy.hackthebox.com/", "Hack The Box", "Intermediate", "20h", "Course", "Free/Paid"),
      resource("OWASP Top 10", "Core web security risks and mitigation guidance.", "https://owasp.org/www-project-top-ten/", "OWASP", "Beginner", "4h", "Documentation"),
      resource("PortSwigger Web Security Academy", "Interactive labs for real web vulnerabilities.", "https://portswigger.net/web-security", "PortSwigger", "Intermediate", "20h", "Course"),
    ],
    practiceProjects: [
      project("OWASP Vulnerability Lab Notes", "Complete labs and write mitigation notes for five common web vulnerabilities.", ["OWASP Top 10", "Security Reporting"], 16),
      project("SIEM Alert Triage Report", "Analyze sample logs, classify alerts, and write an incident summary.", ["SIEM Monitoring", "Log Analysis"], 12),
      project("Threat Model a Web App", "Map assets, trust boundaries, threats, and controls for a small application.", ["Threat Modeling", "Risk Assessment"], 10),
    ],
    certifications: [
      certification("Security+", "CompTIA", "Paid exam", "Common baseline certification for cybersecurity analyst roles.", "https://www.comptia.org/certifications/security"),
      certification("Google Cybersecurity Certificate", "Coursera / Google", "Paid certificate", "Good entry-level signal with practical security workflows.", "https://www.coursera.org/professional-certificates/google-cybersecurity"),
    ],
  },
  doctor: {
    foundSkills: ["Clinical Knowledge", "Patient Communication", "Diagnosis", "Medical Ethics", "Documentation"],
    gaps: ["Evidence-Based Practice", "EMR Workflows", "Patient Counseling", "Clinical Case Presentation", "Triage Protocols"],
    milestones: ["Clinical Case Review", "Patient Communication", "EMR Documentation", "Evidence-Based Practice", "Triage and Safety"],
    resources: [
      resource("BMJ Best Practice", "Evidence-based clinical decision support and case guidance.", "https://bestpractice.bmj.com/", "BMJ", "Intermediate", "Ongoing", "Documentation", "Paid"),
      resource("WHO Clinical Guidance", "Public health and clinical practice guidance.", "https://www.who.int/publications", "WHO", "Beginner", "Ongoing", "Documentation"),
    ],
    practiceProjects: [
      project("Clinical Case Presentation", "Prepare a structured case presentation with history, assessment, and management plan.", ["Clinical Case Presentation"], 8),
      project("Patient Counseling Script", "Create a clear counseling script for diagnosis, medication, and follow-up.", ["Patient Counseling"], 6),
    ],
    certifications: [
      certification("Basic Life Support", "AHA / Local provider", "Paid", "Common clinical readiness credential.", "https://cpr.heart.org/"),
    ],
  },
  accountant: {
    foundSkills: ["Accounting Principles", "Excel", "Reconciliation", "Tax Basics", "Financial Reporting"],
    gaps: ["Tally", "GST Compliance", "Advanced Excel", "Audit Documentation", "Financial Analysis"],
    milestones: ["Ledger Review", "GST and Tax Workflows", "Advanced Excel", "Audit Documentation", "Financial Reporting"],
    resources: [
      resource("Microsoft Excel Training", "Official Excel formulas, pivots, and analysis training.", "https://support.microsoft.com/en-us/excel", "Microsoft", "Beginner", "6h", "Documentation"),
      resource("Tally Learning Hub", "Training resources for Tally workflows and accounting operations.", "https://tallysolutions.com/learning-hub/", "Tally", "Beginner", "8h", "Course"),
    ],
    practiceProjects: [
      project("Monthly Closing Checklist", "Create a closing workflow with reconciliations, checks, and reporting outputs.", ["Reconciliation", "Financial Reporting"], 10),
      project("GST Filing Tracker", "Build a compliance tracker for invoices, filings, and due dates.", ["GST Compliance", "Excel"], 8),
    ],
    certifications: [
      certification("Tally Certification", "Tally Education", "Paid", "Useful practical accounting software signal.", "https://tallyeducation.com/"),
    ],
  },
  hr: {
    foundSkills: ["Recruitment", "Communication", "Employee Relations", "Onboarding", "HR Documentation"],
    gaps: ["HR Analytics", "ATS Tools", "Interview Scorecards", "Policy Writing", "Performance Management"],
    milestones: ["Recruiting Operations", "ATS Workflows", "Interview Design", "Onboarding", "HR Analytics"],
    resources: [
      resource("SHRM Resources", "HR articles and templates for policies, recruiting, and employee relations.", "https://www.shrm.org/resourcesandtools", "SHRM", "Intermediate", "Ongoing", "Article", "Free/Paid"),
      resource("LinkedIn Talent Blog", "Recruiting and talent operations insights.", "https://www.linkedin.com/business/talent/blog", "LinkedIn", "Beginner", "Ongoing", "Article"),
    ],
    practiceProjects: [
      project("Interview Scorecard Kit", "Design scorecards, evaluation rubrics, and hiring notes for one role.", ["Interview Scorecards"], 8),
      project("Onboarding Plan", "Create a 30-60-90 day onboarding workflow with checklists and manager touchpoints.", ["Onboarding", "HR Documentation"], 10),
    ],
    certifications: [
      certification("SHRM-CP", "SHRM", "Paid exam", "Recognized HR professional credential.", "https://www.shrm.org/certification"),
    ],
  },
  lawyer: {
    foundSkills: ["Legal Research", "Drafting", "Case Analysis", "Client Communication", "Compliance"],
    gaps: ["Contract Review", "Legal Writing", "Case Briefing", "Regulatory Research", "Negotiation"],
    milestones: ["Case Briefing", "Contract Review", "Legal Drafting", "Research Memo", "Client Advisory"],
    resources: [
      resource("Legal Information Institute", "Open legal references and explanations.", "https://www.law.cornell.edu/", "Cornell LII", "Beginner", "Ongoing", "Documentation"),
      resource("Harvard Law Review", "Legal scholarship and analysis examples.", "https://harvardlawreview.org/", "Harvard Law Review", "Advanced", "Ongoing", "Article"),
    ],
    practiceProjects: [
      project("Contract Clause Review", "Review sample clauses, identify risks, and draft safer alternatives.", ["Contract Review", "Legal Writing"], 10),
      project("Case Brief Portfolio", "Write briefs for three cases with facts, issues, holdings, and reasoning.", ["Case Briefing"], 8),
    ],
    certifications: [
      certification("Contract Law Course Certificate", "Coursera / University partners", "Free audit or paid certificate", "Good supplemental proof for contract-focused roles.", "https://www.coursera.org/courses?query=contract%20law"),
    ],
  },
  designer: {
    foundSkills: ["Visual Design", "Typography", "Layout", "Color Theory", "Branding"],
    gaps: ["Design Systems", "Accessibility", "Client Presentation", "Portfolio Case Studies", "Design Handoff"],
    milestones: ["Visual Foundations", "Brand System", "Accessible Components", "Portfolio Case Study", "Client Presentation"],
    resources: [
      resource("Figma Learn", "Design tooling, prototyping, and collaboration learning resources.", "https://www.figma.com/resource-library/", "Figma", "Beginner", "5h", "Course"),
      resource("Behance", "Portfolio inspiration and case study references.", "https://www.behance.net/", "Behance", "Beginner", "Ongoing", "Project"),
      resource("Dribbble", "Visual design inspiration and presentation patterns.", "https://dribbble.com/", "Dribbble", "Beginner", "Ongoing", "Project"),
    ],
    practiceProjects: [
      project("Brand Identity Mini System", "Create logo usage, type, color, components, and social templates.", ["Branding", "Design Systems"], 14),
      project("Portfolio Case Study", "Document problem, process, iterations, and final design outcomes.", ["Portfolio Case Studies"], 10),
    ],
    certifications: [
      certification("Adobe Certified Professional", "Adobe", "Paid exam", "Recognized creative tooling credential.", "https://certifiedprofessional.adobe.com/"),
    ],
  },
  general: {
    foundSkills: ["Communication", "Problem Solving", "Planning", "Collaboration", "Documentation"],
    gaps: ["Role-Specific Tools", "Portfolio Evidence", "Interview Storytelling", "Professional Communication", "Industry Research"],
    milestones: ["Role Research", "Tool Practice", "Portfolio Proof", "Interview Preparation", "Application Strategy"],
    resources: [
      resource("Coursera Career Academy", "Career-oriented courses across domains and professional skills.", "https://www.coursera.org/career-academy", "Coursera", "Beginner", "8h", "Course", "Free/Paid"),
      resource("LinkedIn Learning", "Professional learning paths across business, tech, and creative domains.", "https://www.linkedin.com/learning/", "LinkedIn Learning", "Beginner", "Ongoing", "Course", "Paid"),
    ],
    practiceProjects: [
      project("Role Research Portfolio", "Analyze target job descriptions and build a skill evidence checklist.", ["Industry Research", "Portfolio Evidence"], 8),
      project("Interview Story Bank", "Prepare STAR stories linked to target role competencies.", ["Interview Storytelling"], 6),
    ],
    certifications: [
      certification("Role-Specific Certificate", "Vendor or university provider", "Varies", "Choose only if it matches target job descriptions.", "https://www.coursera.org/"),
    ],
  },
};

const aliases = [
  [["teacher", "teaching", "educator", "school", "faculty", "tutor"], "teacher"],
  [["mern", "full stack", "full-stack", "fullstack", "react node", "node react"], "mern developer"],
  [["data analyst", "business analyst", "analytics", "bi analyst", "power bi", "tableau"], "data analyst"],
  [["ui/ux", "ux designer", "ui designer", "product designer", "user experience"], "ui/ux designer"],
  [["cyber", "security analyst", "soc analyst", "information security"], "cybersecurity analyst"],
  [["doctor", "physician", "medical", "clinician"], "doctor"],
  [["accountant", "accounting", "finance executive", "bookkeeper"], "accountant"],
  [["hr", "human resources", "recruiter", "talent acquisition"], "hr"],
  [["lawyer", "legal", "advocate", "attorney"], "lawyer"],
  [["graphic designer", "visual designer", "designer"], "designer"],
];

export function normalizeRoleKey(role = "") {
  const lowerRole = String(role || "").toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (roleSkillMap[lowerRole]) return lowerRole;

  const match = aliases.find(([terms]) => terms.some((term) => lowerRole.includes(term)));
  return match?.[1] || "general";
}

export function getRoleTemplate(role = "") {
  return roleSkillMap[normalizeRoleKey(role)] || roleSkillMap.general;
}

function unique(items) {
  return [...new Set(items.map((item) => String(item || "").trim()).filter(Boolean))];
}

function skillAppearsInText(text, skill) {
  const normalizedText = String(text || "").toLowerCase().replace(/[./]/g, "");
  const normalizedSkill = String(skill || "").toLowerCase().replace(/[./]/g, "");
  return normalizedSkill && normalizedText.includes(normalizedSkill);
}

export function inferRoleSkillGaps(resumeText = "", targetRole = "", extraSkills = []) {
  const template = getRoleTemplate(targetRole);
  const extras = unique(extraSkills);
  const hasResume = Boolean(String(resumeText || "").trim());
  const detectedFromResume = template.foundSkills.filter((skill) => skillAppearsInText(resumeText, skill));
  const detectedSkills = hasResume && detectedFromResume.length
    ? unique(detectedFromResume)
    : template.foundSkills.slice(0, 8);

  const detectedLookup = new Set(detectedSkills.map((skill) => skill.toLowerCase()));
  const extraLookup = new Set(extras.map((skill) => skill.toLowerCase()));
  const inferredSkills = unique(template.gaps)
    .filter((skill) => !detectedLookup.has(skill.toLowerCase()))
    .filter((skill) => !extraLookup.has(skill.toLowerCase()))
    .slice(0, 8);

  return {
    detectedSkills,
    inferredSkills,
    addedSkills: extras,
    sourceSummary: hasResume
      ? `Roadmap generated from resume evidence and ${targetRole} role expectations.`
      : `Roadmap generated from ${targetRole} role expectations. Add a resume for deeper personalization.`,
  };
}

export function getRoleResources(targetRole = "", skill = "") {
  const template = getRoleTemplate(targetRole);
  const lowerSkill = String(skill || "").toLowerCase();
  const focused = template.resources.filter((item) => {
    const haystack = `${item.title} ${item.description} ${item.provider} ${item.type}`.toLowerCase();
    return lowerSkill && haystack.includes(lowerSkill.split(" ")[0]);
  });
  return focused.length ? focused : template.resources;
}

export function buildRoleRoadmapSkills(skillNames = [], targetRole = "") {
  const template = getRoleTemplate(targetRole);
  const skills = unique(skillNames).length ? unique(skillNames) : template.gaps.slice(0, 6);

  return skills.map((skill, index) => {
    const milestoneOne = template.milestones[index % template.milestones.length] || skill;
    const milestoneTwo = template.milestones[(index + 1) % template.milestones.length] || skill;
    const projects = template.practiceProjects.map((item) => ({
      ...item,
      technologies: unique([skill, ...(item.technologies || [])]).slice(0, 5),
    }));

    return {
      skill,
      proficiency: index < 2 ? "beginner" : "intermediate",
      importance: index < 4 ? "high" : "medium",
      whyItMatters: `${skill} is important for ${targetRole || "this role"} because it proves practical readiness beyond resume keywords.`,
      targetOutcome: `Create usable proof that demonstrates ${skill} through a role-specific workflow, artifact, or project.`,
      prerequisites: template.foundSkills.slice(0, 3),
      learningResources: getRoleResources(targetRole, skill),
      certifications: template.certifications,
      milestones: [
        {
          week: "Week 1",
          title: milestoneOne,
          goals: [
            `Understand how ${skill} is used in ${targetRole || "the target role"}.`,
            "Review examples, templates, and quality standards.",
          ],
          practiceTasks: [
            `Complete one focused ${skill} learning resource.`,
            "Create notes with examples, mistakes, and improvement points.",
          ],
          deliverables: [`${skill} notes and checklist`, "One reusable practice artifact"],
          estimatedHours: 6 + (index % 3),
          learningResources: getRoleResources(targetRole, skill).slice(0, 2),
          projects: projects.slice(0, 1),
        },
        {
          week: "Week 2",
          title: milestoneTwo,
          goals: [
            `Apply ${skill} to a realistic ${targetRole || "role"} scenario.`,
            "Prepare evidence that can be discussed in interviews.",
          ],
          practiceTasks: [
            "Build or document the role-specific practice project.",
            "Ask for feedback or compare against a professional example.",
          ],
          deliverables: ["Finished project artifact", "Resume bullet or case-study note"],
          estimatedHours: 9 + (index % 4),
          learningResources: getRoleResources(targetRole, skill),
          projects: projects.slice(0, 2),
        },
      ],
      projects,
    };
  });
}
