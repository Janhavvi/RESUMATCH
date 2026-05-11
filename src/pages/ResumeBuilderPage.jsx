import React, { useState } from "react";
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
} from "lucide-react";

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

  const cycleFramework = () => {
    const idx = FRAMEWORKS.findIndex((f) => f.key === visualFramework);
    setVisualFramework(FRAMEWORKS[(idx + 1) % FRAMEWORKS.length].key);
  };

  const cycleTypography = () => {
    const idx = TYPOGRAPHY.findIndex((t) => t.key === typographyPack);
    setTypographyPack(TYPOGRAPHY[(idx + 1) % TYPOGRAPHY.length].key);
  };

  const handleExportPdf = () => {
    setActiveTab("preview");
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleAiFlowAssist = async () => {
    setIsAssisting(true);
    try {
      setData((prev) => ({
        ...prev,
        summary:
          prev.summary && prev.summary.length > 100
            ? prev.summary
            : `${prev.summary} Proven record of delivering measurable outcomes and cross-functional collaboration.`,
        workExperience: prev.workExperience.map((item) => ({
          ...item,
          achievements:
            item.achievements && item.achievements.length > 30
              ? item.achievements
              : `${item.achievements} Delivered impact through process optimization and quality improvements.`,
        })),
      }));
      alert("AI Flow Assist applied.");
    } finally {
      setIsAssisting(false);
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

              <SectionCard title="Education" icon={<GraduationCap className="size-5" />}>
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

              <SectionCard title="Technical Skills" icon={<TypeIcon className="size-5" />}>
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

              <SectionCard title="Projects" icon={<FolderKanban className="size-5" />}>
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
                      {data.projects.length > 1 && (
                        <button
                          onClick={() => removeListObject("projects", i)}
                          className="text-red-400 text-xs font-bold uppercase tracking-widest"
                        >
                          Remove Project
                        </button>
                      )}
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

              <SectionCard title="Features and Achievements" icon={<Award className="size-5" />}>
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
                      {data.workExperience.length > 1 && (
                        <button
                          onClick={() => removeListObject("workExperience", i)}
                          className="text-red-400 text-xs font-bold uppercase tracking-widest"
                        >
                          Remove Work Item
                        </button>
                      )}
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

              <SectionCard title="Certifications" icon={<BadgeCheck className="size-5" />}>
                <StringListEditor
                  items={data.certifications}
                  onChange={(i, v) => updateStringList("certifications", i, v)}
                  onAdd={() => addStringList("certifications")}
                  onRemove={(i) => removeStringList("certifications", i)}
                  placeholder="Coursera / Udemy / Certification name..."
                />
              </SectionCard>

              <SectionCard title="Achievements" icon={<Award className="size-5" />}>
                <StringListEditor
                  items={data.achievements}
                  onChange={(i, v) => updateStringList("achievements", i, v)}
                  onAdd={() => addStringList("achievements")}
                  onRemove={(i) => removeStringList("achievements", i)}
                  placeholder="Coding contest rank / hackathon / award..."
                />
              </SectionCard>

              <SectionCard title="Soft Skills" icon={<HeartHandshake className="size-5" />}>
                <StringListEditor
                  items={data.softSkills}
                  onChange={(i, v) => updateStringList("softSkills", i, v)}
                  onAdd={() => addStringList("softSkills")}
                  onRemove={(i) => removeStringList("softSkills", i)}
                  placeholder="Communication / Teamwork / Leadership..."
                />
              </SectionCard>

              <SectionCard title="Extra-Curricular Activities" icon={<Sparkles className="size-5" />}>
                <StringListEditor
                  items={data.extracurricular}
                  onChange={(i, v) => updateStringList("extracurricular", i, v)}
                  onAdd={() => addStringList("extracurricular")}
                  onRemove={(i) => removeStringList("extracurricular", i)}
                  placeholder="Clubs / events / volunteering..."
                />
              </SectionCard>

              <SectionCard title="Languages Known" icon={<TypeIcon className="size-5" />}>
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
            <div
              id="resume-print-root"
              className={`p-16 rounded-[48px] text-black min-h-[900px] shadow-3xl relative overflow-hidden flex flex-col ${
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
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="p-10 rounded-[40px] glass space-y-10 sticky top-24">
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
              <button
                onClick={handleAiFlowAssist}
                disabled={isAssisting}
                className="w-full glass-light hover:bg-white/10 text-white py-5 rounded-2xl font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="size-5 text-indigo-400" />{" "}
                {isAssisting ? "Optimizing..." : "AI Flow Assist"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon, children }) => (
  <div className="p-10 rounded-[40px] glass space-y-6">
    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-400 italic tracking-tight">
      {icon} {title}
    </h3>
    {children}
  </div>
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
