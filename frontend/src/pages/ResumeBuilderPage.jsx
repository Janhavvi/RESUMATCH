import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Download,
  User,
  Briefcase,
  GraduationCap,
  Layout,
  Eye,
  Type as TypeIcon,
  Sparkles,
  FolderKanban,
  Award,
  BadgeCheck,
  HeartHandshake,
  BarChart3,
  Bot,
  ClipboardList,
  Lightbulb,
  MessageCircle,
  PanelRightOpen,
  Send,
  Target,
  X,
} from "lucide-react";
import { apiFetch } from "../lib/api.js";

export const ResumeBuilderPage = () => {
  const [data, setData] = useState({
    name: "User",
    phone: "",
    email: "",
    linkedIn: "",
    portfolio: "",
    summary: "",
    objective: "",
    education: [
      {
        degree: "",
        university: "",
        cgpa: "",
        year: "",
      },
    ],
    technicalSkills: {
      programmingLanguages: "",
      frameworks: "",
      databases: "",
      tools: "",
    },
    projects: [
      {
        name: "",
        technologies: "",
        details: "",
      },
    ],
    featureAchievements: [""],
    workExperience: [
      {
        company: "",
        role: "",
        duration: "",
        responsibilities: "",
        achievements: "",
      },
    ],
    certifications: [""],
    achievements: [""],
    softSkills: [""],
    extracurricular: [""],
    languagesKnown: [""],
  });

  const [activeTab, setActiveTab] = useState("edit");
  const [visualFramework, setVisualFramework] = useState("modern");
  const [typographyPack, setTypographyPack] = useState("interMono");
  const [isAssisting, setIsAssisting] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [assistantSection, setAssistantSection] = useState("overall");
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([
    {
      role: "assistant",
      text: "Ask me about ATS visibility, gaps, section wording, or what to add next. I will use the resume you are building here.",
      suggestions: [
        "Run a quick resume gap check.",
        "Suggest stronger content for my current section.",
        "Give me ATS optimization tips.",
      ],
    },
  ]);

  const FRAMEWORKS = [
    { key: "modern", label: "Modern Minimalist v2" },
    { key: "executive", label: "Executive Focus v1" },
    { key: "clean", label: "Clean Chronicle v3" },
  ];

  const TYPOGRAPHY = [
    {
      key: "interMono",
      label: "Inter / Mono Mix",
      style: { fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' },
    },
    {
      key: "serifClassic",
      label: "Serif Classic",
      style: { fontFamily: '"Georgia", "Times New Roman", serif' },
    },
    {
      key: "techMono",
      label: "Tech Mono",
      style: { fontFamily: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
    },
  ];

  const currentFramework =
    FRAMEWORKS.find((f) => f.key === visualFramework) || FRAMEWORKS[0];
  const currentTypography =
    TYPOGRAPHY.find((t) => t.key === typographyPack) || TYPOGRAPHY[0];

  const liveSuggestions = useMemo(() => {
    const tips = [];
    const skills = data.technicalSkills || {};
    const filledSkills = Object.values(skills).filter(Boolean).join(", ");
    const firstProject = data.projects[0] || {};
    const firstExperience = data.workExperience[0] || {};

    if (!data.summary || data.summary.trim().length < 80) {
      tips.push({
        title: "Strengthen summary",
        text: "Add a 2-3 line summary with target role, top skills, and measurable impact.",
      });
    }
    if (!filledSkills) {
      tips.push({
        title: "Add ATS skills",
        text: "List languages, frameworks, databases, and tools using job-description keywords.",
      });
    }
    if (firstProject.name && firstProject.details && !/\d/.test(firstProject.details)) {
      tips.push({
        title: "Quantify project impact",
        text: "Add scale, users, accuracy, performance, time saved, or other measurable outcomes.",
      });
    }
    if (firstExperience.role && firstExperience.responsibilities && !firstExperience.achievements) {
      tips.push({
        title: "Convert work into results",
        text: "Turn responsibilities into achievement bullets that start with action verbs.",
      });
    }
    if (!data.email || !data.phone) {
      tips.push({
        title: "Complete contact details",
        text: "Add email and phone so recruiters and ATS exports have complete header data.",
      });
    }
    if (!tips.length) {
      tips.push({
        title: "Polish for targeting",
        text: "Compare your resume against a job description and mirror the strongest matching keywords naturally.",
      });
    }
    return tips.slice(0, 4);
  }, [data]);

  const cycleFramework = () => {
    const idx = FRAMEWORKS.findIndex((f) => f.key === visualFramework);
    setVisualFramework(FRAMEWORKS[(idx + 1) % FRAMEWORKS.length].key);
  };

  const cycleTypography = () => {
    const idx = TYPOGRAPHY.findIndex((t) => t.key === typographyPack);
    setTypographyPack(TYPOGRAPHY[(idx + 1) % TYPOGRAPHY.length].key);
  };

  const handleExportPdf = async () => {
    try {
      setIsAssisting(true);
      const response = await apiFetch("/api/resume/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData: data }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.name || "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setIsAssisting(false);
    }
  };

  const generateSummary = async () => {
    try {
      setIsAssisting(true);
      const variationSeed = Date.now();
      const response = await apiFetch("/api/resume/ai/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          role:
            data.workExperience.find((exp) => exp.role)?.role ||
            data.projects.find((project) => project.name)?.name ||
            "Software Engineer",
          skills: [
            data.technicalSkills.programmingLanguages,
            data.technicalSkills.frameworks,
            data.technicalSkills.databases,
            data.technicalSkills.tools,
          ]
            .filter(Boolean)
            .join(", "),
          experience: data.workExperience
            .map((exp) => [exp.role, exp.company].filter(Boolean).join(" at "))
            .filter(Boolean)
            .join(", "),
          currentSummary: data.summary,
          variationSeed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const { summary } = await response.json();
      updateField("summary", summary);
      openAssistantFor("summary", "Review this generated professional summary and suggest one improvement.");
    } catch (error) {
      alert("Summary: " + (error.message || "Could not generate summary, but you can write one manually."));
    } finally {
      setIsAssisting(false);
    }
  };

  const improveProjectDescription = async (projectIdx) => {
    try {
      setIsAssisting(true);
      const project = data.projects[projectIdx];
      
      const improveRes = await apiFetch("/api/resume/ai/improve-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          technologies: project.technologies,
          details: project.details,
        }),
      });

      if (improveRes.ok) {
        const { improved } = await improveRes.json();
        updateListObject("projects", projectIdx, "details", improved);
        alert("✨ Project description improved!");
      }
    } catch (error) {
      alert("Failed to improve project: " + error.message);
    } finally {
      setIsAssisting(false);
    }
  };

  const generateAchievements = async (expIdx) => {
    try {
      setIsAssisting(true);
      const exp = data.workExperience[expIdx];

      const achieveRes = await apiFetch("/api/resume/ai/generate-achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: exp.role,
          skills: data.technicalSkills.programmingLanguages,
          industry: "Technology",
        }),
      });

      if (achieveRes.ok) {
        const { achievements } = await achieveRes.json();
        updateListObject("workExperience", expIdx, "achievements", achievements.join("\n"));
        alert("✨ Achievements generated!");
      }
    } catch (error) {
      alert("Failed to generate achievements: " + error.message);
    } finally {
      setIsAssisting(false);
    }
  };

  const openAssistantFor = (section, prompt = "") => {
    setAssistantSection(section);
    setAssistantOpen(true);
    if (prompt) {
      askAssistant(prompt, section);
    }
  };

  const askAssistant = async (questionOverride = "", sectionOverride = "") => {
    const question = (questionOverride || assistantInput).trim();
    if (!question) return;
    const activeSection = sectionOverride || assistantSection;

    setAssistantInput("");
    setAssistantOpen(true);
    setAssistantMessages((prev) => [...prev, { role: "user", text: question }]);
    setAssistantThinking(true);

    try {
      const response = await apiFetch("/api/resume/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          resumeData: data,
          section: activeSection,
        }),
      });

      if (!response.ok) {
        throw new Error("Assistant request failed");
      }

      const result = await response.json();
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.answer,
          suggestions: result.suggestions || [],
          analysis: result.analysis,
        },
      ]);
    } catch (error) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I could not reach the assistant service, but you can still use the live tips in this panel while editing.",
          suggestions: liveSuggestions.map((tip) => `${tip.title}: ${tip.text}`),
        },
      ]);
    } finally {
      setAssistantThinking(false);
    }
  };

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent, field, value) => {
    setData((prev) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  const updateListObject = (key, index, field, value) => {
    setData((prev) => {
      const updated = [...prev[key]];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, [key]: updated };
    });
  };

  const addListObject = (key, template) => {
    setData((prev) => ({ ...prev, [key]: [...prev[key], template] }));
  };

  const removeListObject = (key, index) => {
    setData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const updateStringList = (key, index, value) => {
    setData((prev) => {
      const updated = [...prev[key]];
      updated[index] = value;
      return { ...prev, [key]: updated };
    });
  };

  const addStringList = (key) => {
    setData((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  };

  const removeStringList = (key, index) => {
    setData((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">
            AI <span className="text-indigo-400">Resume Builder</span>
          </h1>
          <p className="text-slate-400 font-medium">
            Build a complete resume with all core sections.
          </p>
        </div>
        <div className="flex glass p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("edit")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "edit"
                ? "bg-white text-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layout className="size-4" /> Editor
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "preview"
                ? "bg-white text-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="size-4" /> Preview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          {activeTab === "edit" ? (
            <div className="space-y-8">
              <SectionCard
                title="Header / Contact Information"
                icon={<User className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("header", "How can I make my contact header more recruiter-friendly?")} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Name"
                    value={data.name}
                    onChange={(v) => updateField("name", v)}
                  />
                  <Input
                    label="Phone Number"
                    value={data.phone}
                    onChange={(v) => updateField("phone", v)}
                  />
                  <Input
                    label="Email"
                    value={data.email}
                    onChange={(v) => updateField("email", v)}
                  />
                  <Input
                    label="LinkedIn"
                    value={data.linkedIn}
                    onChange={(v) => updateField("linkedIn", v)}
                  />
                  <Input
                    label="GitHub / Portfolio"
                    value={data.portfolio}
                    onChange={(v) => updateField("portfolio", v)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Professional Summary / Objective"
                icon={<Sparkles className="size-5" />}
                action={
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={generateSummary}
                      disabled={isAssisting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    >
                      <Sparkles className="size-3" /> Generate
                    </button>
                    <SectionAssistButton onClick={() => openAssistantFor("summary", "Help me improve my professional summary and objective.")} />
                  </div>
                }
              >
                <TextArea
                  label="Professional Summary"
                  value={data.summary}
                  onChange={(v) => updateField("summary", v)}
                />
                <TextArea
                  label="Objective"
                  value={data.objective}
                  onChange={(v) => updateField("objective", v)}
                />
              </SectionCard>

              <SectionCard
                title="Education"
                icon={<GraduationCap className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("education", "What should I add or remove from my education section?")} />}
              >
                <div className="space-y-6">
                  {data.education.map((edu, i) => (
                    <div key={i} className="p-6 glass-light rounded-2xl border border-white/10 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Degree"
                          value={edu.degree}
                          onChange={(v) =>
                            updateListObject("education", i, "degree", v)
                          }
                        />
                        <Input
                          label="College / University"
                          value={edu.university}
                          onChange={(v) =>
                            updateListObject("education", i, "university", v)
                          }
                        />
                        <Input
                          label="CGPA / Percentage"
                          value={edu.cgpa}
                          onChange={(v) =>
                            updateListObject("education", i, "cgpa", v)
                          }
                        />
                        <Input
                          label="Graduation Year"
                          value={edu.year}
                          onChange={(v) =>
                            updateListObject("education", i, "year", v)
                          }
                        />
                      </div>
                      {data.education.length > 1 && (
                        <button
                          onClick={() => removeListObject("education", i)}
                          className="text-red-400 text-xs font-bold uppercase tracking-widest"
                        >
                          Remove Education
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <AddButton
                  label="Add Education"
                  onClick={() =>
                    addListObject("education", {
                      degree: "",
                      university: "",
                      cgpa: "",
                      year: "",
                    })
                  }
                />
              </SectionCard>

              <SectionCard
                title="Technical Skills"
                icon={<TypeIcon className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("skills", "Which skills should I add for better ATS matching?")} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Programming Languages"
                    value={data.technicalSkills.programmingLanguages}
                    onChange={(v) =>
                      updateNestedField("technicalSkills", "programmingLanguages", v)
                    }
                  />
                  <Input
                    label="Frameworks"
                    value={data.technicalSkills.frameworks}
                    onChange={(v) =>
                      updateNestedField("technicalSkills", "frameworks", v)
                    }
                  />
                  <Input
                    label="Databases"
                    value={data.technicalSkills.databases}
                    onChange={(v) =>
                      updateNestedField("technicalSkills", "databases", v)
                    }
                  />
                  <Input
                    label="Tools & Technologies"
                    value={data.technicalSkills.tools}
                    onChange={(v) =>
                      updateNestedField("technicalSkills", "tools", v)
                    }
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Projects"
                icon={<FolderKanban className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("projects", "Suggest stronger project content and impact bullets.")} />}
              >
                <div className="space-y-6">
                  {data.projects.map((project, i) => (
                    <div key={i} className="p-6 glass-light rounded-2xl border border-white/10 space-y-4">
                      <Input
                        label="Project Name"
                        value={project.name}
                        onChange={(v) => updateListObject("projects", i, "name", v)}
                      />
                      <Input
                        label="Technologies Used"
                        value={project.technologies}
                        onChange={(v) =>
                          updateListObject("projects", i, "technologies", v)
                        }
                      />
                      <TextArea
                        label="Major Project Details"
                        value={project.details}
                        onChange={(v) => updateListObject("projects", i, "details", v)}
                      />
                      <div className="flex gap-2 flex-wrap">
                        {project.name && project.technologies && (
                          <button
                            onClick={() => improveProjectDescription(i)}
                            disabled={isAssisting}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            <Sparkles className="size-3" /> Improve Description
                          </button>
                        )}
                        {data.projects.length > 1 && (
                          <button
                            onClick={() => removeListObject("projects", i)}
                            className="text-red-400 text-xs font-bold uppercase tracking-widest"
                          >
                            Remove Project
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <AddButton
                  label="Add Project"
                  onClick={() =>
                    addListObject("projects", {
                      name: "",
                      technologies: "",
                      details: "",
                    })
                  }
                />
              </SectionCard>

              <SectionCard
                title="Features and Achievements"
                icon={<Award className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("achievements", "What achievements would make this resume stronger?")} />}
              >
                <StringListEditor
                  items={data.featureAchievements}
                  onChange={(i, v) => updateStringList("featureAchievements", i, v)}
                  onAdd={() => addStringList("featureAchievements")}
                  onRemove={(i) => removeStringList("featureAchievements", i)}
                  placeholder="Add feature or achievement..."
                />
              </SectionCard>

              <SectionCard
                title="Work Experience / Internship"
                icon={<Briefcase className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("experience", "Analyze my work experience and suggest stronger achievement bullets.")} />}
              >
                <div className="space-y-6">
                  {data.workExperience.map((exp, i) => (
                    <div key={i} className="p-6 glass-light rounded-2xl border border-white/10 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Company Name"
                          value={exp.company}
                          onChange={(v) =>
                            updateListObject("workExperience", i, "company", v)
                          }
                        />
                        <Input
                          label="Role"
                          value={exp.role}
                          onChange={(v) =>
                            updateListObject("workExperience", i, "role", v)
                          }
                        />
                        <Input
                          label="Duration"
                          value={exp.duration}
                          onChange={(v) =>
                            updateListObject("workExperience", i, "duration", v)
                          }
                        />
                      </div>
                      <TextArea
                        label="Responsibilities"
                        value={exp.responsibilities}
                        onChange={(v) =>
                          updateListObject("workExperience", i, "responsibilities", v)
                        }
                      />
                      <TextArea
                        label="Achievements"
                        value={exp.achievements}
                        onChange={(v) =>
                          updateListObject("workExperience", i, "achievements", v)
                        }
                      />
                      <div className="flex gap-2 flex-wrap">
                        {exp.responsibilities && (
                          <button
                            onClick={() => generateAchievements(i)}
                            disabled={isAssisting}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            <Sparkles className="size-3" /> AI Achievements
                          </button>
                        )}
                        {data.workExperience.length > 1 && (
                          <button
                            onClick={() => removeListObject("workExperience", i)}
                            className="text-red-400 text-xs font-bold uppercase tracking-widest"
                          >
                            Remove Work Item
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <AddButton
                  label="Add Work Experience"
                  onClick={() =>
                    addListObject("workExperience", {
                      company: "",
                      role: "",
                      duration: "",
                      responsibilities: "",
                      achievements: "",
                    })
                  }
                />
              </SectionCard>

              <SectionCard
                title="Certifications"
                icon={<BadgeCheck className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("certifications", "Which certifications should I prioritize or add?")} />}
              >
                <StringListEditor
                  items={data.certifications}
                  onChange={(i, v) => updateStringList("certifications", i, v)}
                  onAdd={() => addStringList("certifications")}
                  onRemove={(i) => removeStringList("certifications", i)}
                  placeholder="Coursera / Udemy / Certification name..."
                />
              </SectionCard>

              <SectionCard
                title="Achievements"
                icon={<Award className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("achievements", "Help me improve the achievements section.")} />}
              >
                <StringListEditor
                  items={data.achievements}
                  onChange={(i, v) => updateStringList("achievements", i, v)}
                  onAdd={() => addStringList("achievements")}
                  onRemove={(i) => removeStringList("achievements", i)}
                  placeholder="Coding contest rank / hackathon / award..."
                />
              </SectionCard>

              <SectionCard
                title="Soft Skills"
                icon={<HeartHandshake className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("skills", "Which soft skills are worth keeping on this resume?")} />}
              >
                <StringListEditor
                  items={data.softSkills}
                  onChange={(i, v) => updateStringList("softSkills", i, v)}
                  onAdd={() => addStringList("softSkills")}
                  onRemove={(i) => removeStringList("softSkills", i)}
                  placeholder="Communication / Teamwork / Leadership..."
                />
              </SectionCard>

              <SectionCard
                title="Extra-Curricular Activities"
                icon={<Sparkles className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("achievements", "How can I present extracurricular activities professionally?")} />}
              >
                <StringListEditor
                  items={data.extracurricular}
                  onChange={(i, v) => updateStringList("extracurricular", i, v)}
                  onAdd={() => addStringList("extracurricular")}
                  onRemove={(i) => removeStringList("extracurricular", i)}
                  placeholder="Clubs / events / volunteering..."
                />
              </SectionCard>

              <SectionCard
                title="Languages Known"
                icon={<TypeIcon className="size-5" />}
                action={<SectionAssistButton onClick={() => openAssistantFor("overall", "Should I include languages on this resume?")} />}
              >
                <StringListEditor
                  items={data.languagesKnown}
                  onChange={(i, v) => updateStringList("languagesKnown", i, v)}
                  onAdd={() => addStringList("languagesKnown")}
                  onRemove={(i) => removeStringList("languagesKnown", i)}
                  placeholder="English, Hindi, ..."
                />
              </SectionCard>
            </div>
          ) : (
            <div className="relative scene-3d">
              <div className="absolute -inset-6 rounded-[52px] bg-cyan-400/10 blur-3xl" />
              <div
                id="resume-print-root"
                className={`p-16 rounded-[48px] text-black min-h-[900px] shadow-3xl relative overflow-hidden flex flex-col resume-float-card holo-sheen ${
                  visualFramework === "executive"
                    ? "bg-[#f7f6f2]"
                    : visualFramework === "clean"
                      ? "bg-[#fcfcfd]"
                      : "bg-white"
                }`}
                style={currentTypography.style}
              >
              <header
                className={`pb-8 mb-8 ${
                  visualFramework === "executive"
                    ? "border-b-2 border-zinc-700"
                    : "border-b-4 border-black"
                }`}
              >
                <h2 className="text-5xl font-black uppercase tracking-tighter mb-4">
                  {data.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 font-semibold">
                  <p>{data.phone}</p>
                  <p>{data.email}</p>
                  <p>{data.linkedIn}</p>
                  <p>{data.portfolio}</p>
                </div>
              </header>

              <div className="space-y-7">
                <PreviewSection title="Professional Summary">
                  <p className="text-sm text-gray-800">{data.summary}</p>
                </PreviewSection>

                <PreviewSection title="Objective">
                  <p className="text-sm text-gray-800">{data.objective}</p>
                </PreviewSection>

                <PreviewSection title="Education">
                  <div className="space-y-3">
                    {data.education.map((edu, i) => (
                      <div key={i}>
                        <p className="font-bold text-sm">{edu.degree}</p>
                        <p className="text-sm text-gray-700">
                          {edu.university} | {edu.cgpa} | {edu.year}
                        </p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>

                <PreviewSection title="Technical Skills">
                  <div className="space-y-2 text-sm text-gray-800">
                    <p>
                      <span className="font-bold">Programming Languages:</span>{" "}
                      {data.technicalSkills.programmingLanguages}
                    </p>
                    <p>
                      <span className="font-bold">Frameworks:</span>{" "}
                      {data.technicalSkills.frameworks}
                    </p>
                    <p>
                      <span className="font-bold">Databases:</span>{" "}
                      {data.technicalSkills.databases}
                    </p>
                    <p>
                      <span className="font-bold">Tools & Technologies:</span>{" "}
                      {data.technicalSkills.tools}
                    </p>
                  </div>
                </PreviewSection>

                <PreviewSection title="Projects">
                  <div className="space-y-4">
                    {data.projects.map((project, i) => (
                      <div key={i}>
                        <p className="font-bold text-sm">{project.name}</p>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Technologies:</span>{" "}
                          {project.technologies}
                        </p>
                        <p className="text-sm text-gray-800">{project.details}</p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>

                <PreviewSection title="Features and Achievements">
                  <PreviewList items={data.featureAchievements} />
                </PreviewSection>

                <PreviewSection title="Work Experience / Internship">
                  <div className="space-y-4">
                    {data.workExperience.map((exp, i) => (
                      <div key={i}>
                        <p className="font-bold text-sm">
                          {exp.role} - {exp.company}
                        </p>
                        <p className="text-xs uppercase text-gray-500 mb-1">
                          {exp.duration}
                        </p>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Responsibilities:</span>{" "}
                          {exp.responsibilities}
                        </p>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">Achievements:</span>{" "}
                          {exp.achievements}
                        </p>
                      </div>
                    ))}
                  </div>
                </PreviewSection>

                <PreviewSection title="Certifications">
                  <PreviewList items={data.certifications} />
                </PreviewSection>

                <PreviewSection title="Achievements">
                  <PreviewList items={data.achievements} />
                </PreviewSection>

                <PreviewSection title="Soft Skills">
                  <ChipList items={data.softSkills} />
                </PreviewSection>

                <PreviewSection title="Extra-Curricular Activities">
                  <PreviewList items={data.extracurricular} />
                </PreviewSection>

                <PreviewSection title="Languages Known">
                  <ChipList items={data.languagesKnown} />
                </PreviewSection>
              </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          {assistantOpen && (
            <ResumeAssistantPanel
              section={assistantSection}
              setSection={setAssistantSection}
              messages={assistantMessages}
              input={assistantInput}
              setInput={setAssistantInput}
              onAsk={askAssistant}
              thinking={assistantThinking}
              liveSuggestions={liveSuggestions}
              onClose={() => setAssistantOpen(false)}
            />
          )}

          <div
            className={`p-10 rounded-[40px] glass space-y-10 panel-3d ${
              assistantOpen ? "" : "sticky top-24"
            }`}
          >
            <div>
              <h3 className="font-bold mb-6 tracking-tight">
                Strategy Configuration
              </h3>
              <div className="space-y-4">
                <button
                  onClick={cycleFramework}
                  className="w-full p-6 glass-light border-white/5 rounded-3xl text-left hover:border-indigo-500/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Visual Framework
                    </p>
                    <p className="font-bold text-slate-200">
                      {currentFramework.label}
                    </p>
                  </div>
                  <Layout className="size-6 text-slate-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                </button>
                <button
                  onClick={cycleTypography}
                  className="w-full p-6 glass-light border-white/5 rounded-3xl text-left hover:border-indigo-500/30 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                      Typography Pack
                    </p>
                    <p className="font-bold text-slate-200">
                      {currentTypography.label}
                    </p>
                  </div>
                  <TypeIcon className="size-6 text-slate-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                </button>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-4">
              <button
                onClick={handleExportPdf}
                className="w-full bg-slate-100 hover:bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all text-sm active:scale-95"
              >
                <Download className="size-5" /> Export PDF
              </button>
              {!assistantOpen && (
                <button
                  onClick={() => openAssistantFor("overall")}
                  className="w-full glass-light hover:bg-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-3 text-sm"
                >
                  <PanelRightOpen className="size-5 text-cyan-300" /> Open Assistant
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!assistantOpen && (
        <button
          onClick={() => openAssistantFor("overall")}
          className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-2xl shadow-indigo-950/50 hover:bg-indigo-400 active:scale-95 transition-all"
          aria-label="Open Resume AI Assistant"
        >
          <MessageCircle className="size-6" />
        </button>
      )}
    </div>
  );
};

const ASSISTANT_SECTIONS = [
  { key: "overall", label: "All" },
  { key: "summary", label: "Summary" },
  { key: "skills", label: "Skills" },
  { key: "projects", label: "Projects" },
  { key: "experience", label: "Work" },
  { key: "education", label: "Education" },
  { key: "achievements", label: "Wins" },
];

const ResumeAssistantPanel = ({
  section,
  setSection,
  messages,
  input,
  setInput,
  onAsk,
  thinking,
  liveSuggestions,
  onClose,
}) => (
  <aside className="glass relative min-w-0 max-w-full overflow-hidden rounded-[28px] border border-cyan-300/20">
    <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-black tracking-tight">Resume AI Assistant</h3>
          <p className="text-xs leading-relaxed text-slate-400">Chat, tips, ATS checks, and content ideas</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Close assistant"
      >
        <X className="size-4" />
      </button>
    </div>

    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ASSISTANT_SECTIONS.map((item) => (
          <button
            key={item.key}
            onClick={() => setSection(item.key)}
            className={`min-w-0 rounded-full px-2.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
              section === item.key
                ? "bg-cyan-300 text-slate-950"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <QuickPrompt
          icon={<ClipboardList className="size-4" />}
          label="Tips"
          onClick={() => onAsk(`Give me best practices for the ${section} section.`)}
        />
        <QuickPrompt
          icon={<BarChart3 className="size-4" />}
          label="Analyze"
          onClick={() => onAsk("Analyze gaps and improvements in my current resume.")}
        />
        <QuickPrompt
          icon={<Target className="size-4" />}
          label="ATS"
          onClick={() => onAsk("Give me ATS optimization tips for this resume.")}
        />
      </div>

      <div className="max-h-[340px] space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-black/25 p-3 shadow-inner shadow-black/20">
        {messages.map((message, index) => (
          <ChatMessage
            key={`${message.role}-${index}`}
            message={message}
          />
        ))}
        {thinking && (
          <div className="flex items-end gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
              <Bot className="size-4" />
            </span>
            <div className="rounded-3xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-cyan-300 animate-pulse" />
                <span className="size-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        className="rounded-3xl border border-white/10 bg-black/30 p-2 focus-within:border-cyan-300/60"
        onSubmit={(event) => {
          event.preventDefault();
          onAsk();
        }}
      >
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAsk();
              }
            }}
            placeholder="Ask about wording, gaps, ATS..."
            className="max-h-28 min-h-12 min-w-0 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
            aria-label="Ask assistant"
          >
            <Send className="size-5" />
          </button>
        </div>
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Enter to send, Shift Enter for new line
        </div>
      </form>

      <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
          <Lightbulb className="size-4" /> Live Suggestions
        </div>
        <div className="space-y-3">
          {liveSuggestions.map((tip) => (
            <button
              key={tip.title}
              onClick={() => onAsk(`Help me with this suggestion: ${tip.title}. ${tip.text}`)}
              className="w-full rounded-2xl bg-black/30 p-3 text-left hover:bg-white/10 transition-colors"
            >
              <p className="text-sm font-bold text-slate-100">{tip.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{tip.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  </aside>
);

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={`max-w-[86%] break-words rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
          isUser
            ? "rounded-br-md bg-indigo-500 text-white shadow-indigo-950/30"
            : "rounded-bl-md border border-white/10 bg-white/[0.07] text-slate-200 shadow-black/20"
        }`}
      >
        <div className={`mb-1 text-[10px] font-black uppercase tracking-widest ${isUser ? "text-indigo-100" : "text-cyan-200"}`}>
          {isUser ? "You" : "Assistant"}
        </div>
        <p>{message.text}</p>
        {message.analysis && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MetricPill label="ATS" value={`${message.analysis.atsScore}/100`} />
            <MetricPill label="Verbs" value={message.analysis.actionVerbCount} />
          </div>
        )}
        {!!message.suggestions?.length && (
          <div className="mt-3 space-y-2">
            {message.suggestions.slice(0, 4).map((item) => (
              <div key={item} className="rounded-2xl bg-black/25 px-3 py-2 text-xs text-slate-300">
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MetricPill = ({ label, value }) => (
  <div className="rounded-2xl bg-black/25 px-3 py-2">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    <p className="text-sm font-black text-cyan-200">{value}</p>
  </div>
);

const QuickPrompt = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2 text-xs font-bold text-slate-300 hover:border-cyan-300/40 hover:text-white transition-all"
  >
    {icon}
    {label}
  </button>
);

const SectionCard = ({ title, icon, action, children }) => (
  <div className="p-10 rounded-[40px] glass space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-400 italic tracking-tight">
        {icon} {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
);

const SectionAssistButton = ({ onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-200 hover:bg-indigo-500/20 transition-all"
  >
    <MessageCircle className="size-3" /> Ask AI
  </button>
);

const Input = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
      {label}
    </span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors"
    />
  </label>
);

const TextArea = ({ label, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">
      {label}
    </span>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-h-24 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors"
    />
  </label>
);

const AddButton = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="text-[10px] font-black text-indigo-400 flex items-center gap-2 hover:underline uppercase tracking-widest"
  >
    <Plus className="size-3" /> {label}
  </button>
);

const StringListEditor = ({ items, onChange, onAdd, onRemove, placeholder }) => (
  <div className="space-y-3">
    {items.map((item, i) => (
      <div key={i} className="flex items-center gap-3">
        <input
          value={item}
          onChange={(e) => onChange(i, e.target.value)}
          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 transition-colors"
          placeholder={placeholder}
        />
        {items.length > 1 && (
          <button
            onClick={() => onRemove(i)}
            className="p-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    ))}
    <AddButton label="Add Item" onClick={onAdd} />
  </div>
);

const PreviewSection = ({ title, children }) => (
  <section>
    <h4 className="text-xs font-black uppercase tracking-[0.3em] mb-3 text-gray-500">
      {title}
    </h4>
    {children}
  </section>
);

const PreviewList = ({ items }) => (
  <ul className="space-y-2">
    {items.filter(Boolean).map((item, i) => (
      <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
        <span className="mt-2 size-1.5 rounded-full bg-gray-400" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const ChipList = ({ items }) => (
  <div className="flex flex-wrap gap-2">
    {items.filter(Boolean).map((item, i) => (
      <span
        key={i}
        className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700 font-semibold"
      >
        {item}
      </span>
    ))}
  </div>
);
