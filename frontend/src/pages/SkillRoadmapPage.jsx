import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Lightbulb,
  Code,
  Clock,
  Target,
  CheckCircle,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Clipboard,
  ExternalLink,
  Filter,
  FileCheck2,
  Sparkles,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const ROADMAP_REQUEST_TIMEOUT_MS = 45000;
const ROLE_SUGGESTIONS = ['Teacher', 'MERN Developer', 'UI/UX Designer', 'Data Analyst', 'Cybersecurity Analyst'];

function apiFetchWithTimeout(path, options = {}, timeoutMs = ROADMAP_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return apiFetch(path, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

export const SkillRoadmapPage = () => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resourceFilter, setResourceFilter] = useState('All');
  const [savedResources, setSavedResources] = useState({});
  const [completedResources, setCompletedResources] = useState({});
  const [formData, setFormData] = useState({
    extraSkills: '',
    targetRole: '',
  });

  const handleGenerate = async () => {
    const targetRole = formData.targetRole.trim();
    const extraSkills = formData.extraSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!targetRole) {
      alert('Choose a target role first.');
      return;
    }

    try {
      setLoading(true);
      setRoadmap(null);
      setResourceFilter('All');
      setSavedResources({});
      setCompletedResources({});

      let response;

      if (resumeFile) {
        const uploadData = new FormData();
        uploadData.append('resume', resumeFile);

        const uploadResponse = await apiFetchWithTimeout('/api/resume/upload', {
          method: 'POST',
          body: uploadData,
        });

        const uploadedResume = await uploadResponse.json().catch(() => ({}));

        if (!uploadResponse.ok) {
          throw new Error(uploadedResume?.error || 'Failed to upload resume');
        }

        response = await apiFetchWithTimeout('/api/skills/generate-from-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resumeId: uploadedResume.id || null,
            resumeText: uploadedResume.text || '',
            extraSkills,
            targetRole,
          }),
        });
      } else {
        response = await apiFetchWithTimeout('/api/skills/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missingSkills: extraSkills,
            targetRole,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate skill roadmap');
      }

      setRoadmap({
        ...data.roadmap,
        sourceSummary: data.sourceSummary || data.roadmap?.sourceSummary,
        detectedSkills: data.detectedSkills || data.roadmap?.detectedSkills || [],
        inferredSkills: data.inferredSkills || data.roadmap?.inferredSkills || [],
        addedSkills: data.addedSkills || data.roadmap?.addedSkills || extraSkills,
      });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      alert(error.name === 'AbortError' ? 'Roadmap generation timed out. Please try again.' : error.message || 'Failed to generate skill roadmap');
    } finally {
      setLoading(false);
    }
  };

  const handleManualOnlyGenerate = async () => {
    const targetRole = formData.targetRole.trim();
    const skills = formData.extraSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!targetRole) {
      alert('Choose a target role first.');
      return;
    }

    try {
      setLoading(true);
      setRoadmap(null);
      setResourceFilter('All');
      setSavedResources({});
      setCompletedResources({});
      const response = await apiFetchWithTimeout('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingSkills: skills,
          targetRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate skill roadmap');
      }

      setRoadmap({
        ...data.roadmap,
        sourceSummary: skills.length
          ? 'Roadmap generated from manually added skills and the selected role template.'
          : `Roadmap generated from the ${targetRole} role template.`,
        detectedSkills: [],
        inferredSkills: [],
        addedSkills: skills,
      });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      alert(error.name === 'AbortError' ? 'Roadmap generation timed out. Please try again.' : error.message || 'Failed to generate skill roadmap');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHours = () => {
    if (!roadmap?.missingSkills) return 0;
    return roadmap.missingSkills.reduce((total, skill) => {
      return total + (skill.projects || []).reduce((sum, project) => sum + (project.estimatedHours || 0), 0);
    }, 0);
  };

  const totalProjects = roadmap?.missingSkills?.reduce((sum, skill) => sum + (skill.projects?.length || 0), 0) || 0;
  const totalMilestones = roadmap?.missingSkills?.reduce((sum, skill) => sum + (skill.milestones?.length || 0), 0) || 0;
  const resourceFilters = ['All', 'Free', 'Paid', 'Beginner', 'Intermediate', 'Advanced', 'Video', 'Course', 'Documentation', 'Article', 'Project'];
  const normalizeResource = (resource, fallbackSkill = '') => {
    if (typeof resource === 'string') {
      return {
        title: resource,
        description: `Use this resource to strengthen ${fallbackSkill || 'this skill'} with practical notes and examples.`,
        url: 'https://www.google.com/search?q=' + encodeURIComponent(resource),
        provider: 'Search',
        difficulty: 'Beginner',
        duration: 'Self-paced',
        type: 'Documentation',
        pricing: 'Free',
      };
    }
    return {
      title: resource?.title || `${fallbackSkill} resource`,
      description: resource?.description || 'Curated learning resource for this milestone.',
      url: resource?.url || '#',
      provider: resource?.provider || 'Resource',
      difficulty: resource?.difficulty || 'Beginner',
      duration: resource?.duration || 'Self-paced',
      type: resource?.type || 'Documentation',
      pricing: resource?.pricing || resource?.cost || 'Free',
    };
  };

  const resourceMatchesFilter = (resource) => {
    if (resourceFilter === 'All') return true;
    const haystack = `${resource.pricing} ${resource.difficulty} ${resource.type}`.toLowerCase();
    return haystack.includes(resourceFilter.toLowerCase());
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-200 font-bold text-xs uppercase tracking-widest border border-cyan-300/20"
        >
          <Target className="size-4" /> Skill Roadmap
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          The Missing Skill <span className="text-cyan-300">Roadmap</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Generate an AI-built roadmap with milestones, practice tasks, portfolio projects, and resume-ready proof for your target role.
        </p>
      </div>

      {!roadmap ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[36px] glass space-y-6 tile-3d"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-cyan-300/10">
              <Lightbulb className="size-6 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">Generate Your Roadmap</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                Upload a resume and enter a target role so AI can detect skill gaps. Add extra skills only when you want them included too.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-300">Resume Upload</label>
              <div className="rounded-2xl border border-dashed border-cyan-300/25 bg-white/5 p-5">
                {!resumeFile ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl bg-black/20 px-4 py-8 text-center transition-all hover:bg-cyan-300/5">
                    <Upload className="size-8 text-cyan-200" />
                    <span className="text-sm font-bold text-slate-200">Upload resume for AI skill-gap analysis</span>
                    <span className="text-xs font-medium text-slate-500">PDF, DOCX, or TXT</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-5 shrink-0 text-cyan-200" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-100">{resumeFile.name}</p>
                        <p className="text-xs text-slate-500">{Math.max(1, Math.round(resumeFile.size / 1024))} KB selected</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResumeFile(null)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label="Remove selected resume"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">Target Role / Position</label>
                <input
                  type="text"
                  placeholder="e.g., Teacher, Data Analyst, UI/UX Designer"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {ROLE_SUGGESTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetRole: role })}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                        formData.targetRole === role
                          ? 'border-cyan-300/50 bg-cyan-300 text-slate-950'
                          : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Required. The roadmap fallback is role-specific, even if AI is unavailable.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-300">Extra Skills To Learn (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., GraphQL, Docker, Kubernetes"
                  value={formData.extraSkills}
                  onChange={(e) => setFormData({ ...formData, extraSkills: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40"
                />
                <p className="text-xs text-slate-500 mt-1">Separate multiple skills with commas</p>
              </div>
            </div>

            {!formData.targetRole.trim() && (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-medium text-amber-100">
                Choose a target role first so the roadmap does not fall back to unrelated skills.
              </div>
            )}

            {!resumeFile && formData.targetRole.trim() && (
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100">
                No resume selected, so the roadmap will use the {formData.targetRole.trim()} role template plus any extra skills you add.
              </div>
            )}

            {resumeFile && (
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100">
                AI will analyze your resume against the target role, then merge any extra skills you added.
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                loading
                  ? 'cursor-not-allowed border border-white/5 bg-slate-800 text-slate-500'
                  : 'border border-cyan-300/40 bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/20 hover:bg-cyan-300 active:scale-95'
              }`}
            >
              {loading ? (
                <>
                  <div className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
                  Analyzing Resume...
                </>
              ) : (
                <>
                  <Target className="size-5" />
                  Generate AI Roadmap
                </>
              )}
            </button>

            {resumeFile && (
              <button
                onClick={handleManualOnlyGenerate}
                disabled={loading}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-300 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600"
              >
                Generate From Role Template Only
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl glass border border-white/10">
              <p className="text-slate-400 text-sm font-medium">Total Skills</p>
              <p className="text-3xl font-bold text-cyan-300 mt-2">{roadmap.missingSkills?.length || 0}</p>
            </div>
            <div className="p-6 rounded-xl glass border border-white/10">
              <p className="text-slate-400 text-sm font-medium">Milestones</p>
              <p className="text-3xl font-bold text-indigo-300 mt-2">{totalMilestones}</p>
            </div>
            <div className="p-6 rounded-xl glass border border-white/10">
              <p className="text-slate-400 text-sm font-medium">Total Projects</p>
              <p className="text-3xl font-bold text-purple-300 mt-2">
                {totalProjects}
              </p>
            </div>
            <div className="p-6 rounded-xl glass border border-white/10">
              <p className="text-slate-400 text-sm font-medium">Estimated Hours</p>
              <p className="text-3xl font-bold text-green-300 mt-2">{calculateTotalHours()}</p>
            </div>
          </div>

          {(roadmap.sourceSummary || roadmap.detectedSkills?.length > 0 || roadmap.inferredSkills?.length > 0 || roadmap.addedSkills?.length > 0) && (
            <div className="rounded-2xl glass border border-white/10 p-6">
              {roadmap.sourceSummary && (
                <p className="mb-4 flex items-start gap-3 text-sm font-medium leading-relaxed text-slate-300">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                  {roadmap.sourceSummary}
                </p>
              )}
              <div className="grid gap-4 lg:grid-cols-3">
                {roadmap.detectedSkills?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">Skills Found In Resume</p>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.detectedSkills.map((skill, idx) => (
                        <span key={idx} className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {roadmap.inferredSkills?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">AI-Detected Gaps</p>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.inferredSkills.map((skill, idx) => (
                        <span key={idx} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {roadmap.addedSkills?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-purple-200">Extra Skills Added</p>
                    <div className="flex flex-wrap gap-2">
                      {roadmap.addedSkills.map((skill, idx) => (
                        <span key={idx} className="rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-1 text-xs font-bold text-purple-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-[28px] border border-cyan-300/15 bg-white/[0.035] p-5">
            <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
              <Filter className="size-4 text-cyan-300" /> Resource Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {resourceFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setResourceFilter(filter)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition-all ${
                    resourceFilter === filter
                      ? 'border-cyan-300/50 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Skills and Projects */}
          {roadmap.missingSkills && roadmap.missingSkills.length > 0 ? (
            <div className="space-y-6">
              {roadmap.missingSkills.map((skill, skillIdx) => (
                <motion.div
                  key={skillIdx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: skillIdx * 0.1 }}
                  className="rounded-2xl glass border border-white/10 overflow-hidden"
                >
                  {/* Skill Header */}
                  <div className="p-6 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-white/10">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <h3 className="text-2xl font-bold text-cyan-300">{skill.skill}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          skill.proficiency === 'beginner' ? 'bg-blue-500/20 text-blue-200' :
                          skill.proficiency === 'intermediate' ? 'bg-yellow-500/20 text-yellow-200' :
                          'bg-green-500/20 text-green-200'
                        }`}>
                          {skill.proficiency}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          skill.importance === 'high' ? 'bg-red-500/20 text-red-200' :
                          'bg-slate-500/20 text-slate-200'
                        }`}>
                          {skill.importance} Priority
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {skill.whyItMatters && (
                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200">
                            <Sparkles className="size-4" /> Why It Matters
                          </p>
                          <p className="text-sm font-medium leading-relaxed text-slate-300">{skill.whyItMatters}</p>
                        </div>
                      )}
                      {skill.targetOutcome && (
                        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                          <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                            <Target className="size-4" /> Target Outcome
                          </p>
                          <p className="text-sm font-medium leading-relaxed text-slate-300">{skill.targetOutcome}</p>
                        </div>
                      )}
                    </div>

                    {skill.prerequisites && skill.prerequisites.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {skill.prerequisites.map((item, itemIdx) => (
                          <span
                            key={itemIdx}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {skill.learningResources && skill.learningResources.length > 0 && (
                    <div className="border-b border-white/10 p-6">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                        <ExternalLink className="size-4 text-cyan-300" /> Learning Resources
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {skill.learningResources.map((item, resourceIdx) => {
                          const resource = normalizeResource(item, skill.skill);
                          const resourceId = `${skill.skill}-${resource.title}-${resourceIdx}`;
                          if (!resourceMatchesFilter(resource)) return null;
                          return (
                            <div key={resourceId} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition-all hover:-translate-y-1 hover:border-cyan-300/30">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-xs font-black text-cyan-100">
                                  {resource.provider.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setSavedResources((current) => ({ ...current, [resourceId]: !current[resourceId] }))}
                                    className={`rounded-lg p-2 ${savedResources[resourceId] ? 'bg-purple-400/20 text-purple-200' : 'bg-white/5 text-slate-400'}`}
                                    aria-label="Save resource"
                                  >
                                    <Bookmark className="size-4" />
                                  </button>
                                  <button
                                    onClick={() => setCompletedResources((current) => ({ ...current, [resourceId]: !current[resourceId] }))}
                                    className={`rounded-lg p-2 ${completedResources[resourceId] ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/5 text-slate-400'}`}
                                    aria-label="Mark complete"
                                  >
                                    <CheckCircle className="size-4" />
                                  </button>
                                </div>
                              </div>
                              <h5 className="font-black text-slate-100">{resource.title}</h5>
                              <p className="mt-2 text-sm leading-relaxed text-slate-400">{resource.description}</p>
                              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                                <span className="rounded-full bg-white/10 px-2 py-1 text-slate-300">{resource.duration}</span>
                                <span className="rounded-full bg-cyan-300/10 px-2 py-1 text-cyan-100">{resource.difficulty}</span>
                                <span className="rounded-full bg-purple-300/10 px-2 py-1 text-purple-100">{resource.type}</span>
                                <span className="rounded-full bg-emerald-300/10 px-2 py-1 text-emerald-100">{resource.pricing}</span>
                              </div>
                              <a href={resource.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-950">
                                Open Resource <ExternalLink className="size-3" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {skill.certifications && skill.certifications.length > 0 && (
                    <div className="border-b border-white/10 p-6">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                        <FileCheck2 className="size-4 text-emerald-300" /> Certifications
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {skill.certifications.map((cert, certIdx) => (
                          <a key={certIdx} href={cert.link || '#'} target="_blank" rel="noreferrer" className="rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4 transition-all hover:border-emerald-300/35">
                            <p className="font-black text-emerald-100">{cert.name}</p>
                            <p className="mt-1 text-sm text-slate-400">{cert.provider} • {cert.cost}</p>
                            <p className="mt-2 text-sm text-slate-300">{cert.recognition}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Milestones */}
                  {skill.milestones && skill.milestones.length > 0 && (
                    <div className="p-6 border-b border-white/10">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                        <CalendarDays className="size-4 text-cyan-300" /> Detailed Milestone Plan
                      </h4>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {skill.milestones.map((milestone, milestoneIdx) => (
                          <div key={milestoneIdx} className="rounded-xl border border-white/10 bg-black/20 p-5">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{milestone.week}</p>
                                <h5 className="mt-1 text-lg font-bold text-white">{milestone.title}</h5>
                              </div>
                              {milestone.estimatedHours && (
                                <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-700/60 px-3 py-1 text-xs font-bold text-slate-300">
                                  <Clock className="size-3" /> {milestone.estimatedHours}h
                                </span>
                              )}
                            </div>

                            {milestone.goals && milestone.goals.length > 0 && (
                              <div className="mb-4">
                                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Goals</p>
                                <ul className="space-y-2">
                                  {milestone.goals.map((goal, goalIdx) => (
                                    <li key={goalIdx} className="flex gap-2 text-sm text-slate-300">
                                      <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                                      <span>{goal}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {milestone.practiceTasks && milestone.practiceTasks.length > 0 && (
                              <div className="mb-4">
                                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Practice Tasks</p>
                                <ul className="space-y-2">
                                  {milestone.practiceTasks.map((task, taskIdx) => (
                                    <li key={taskIdx} className="flex gap-2 text-sm text-slate-400">
                                      <ArrowRight className="mt-0.5 size-4 shrink-0 text-cyan-300" />
                                      <span>{task}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {milestone.deliverables && milestone.deliverables.length > 0 && (
                              <div>
                                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Deliverables</p>
                                <div className="flex flex-wrap gap-2">
                                  {milestone.deliverables.map((deliverable, deliverableIdx) => (
                                    <span key={deliverableIdx} className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                                      {deliverable}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {milestone.learningResources && milestone.learningResources.length > 0 && (
                              <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Milestone Resources</p>
                                <div className="space-y-2">
                                  {milestone.learningResources.map((item, idx) => {
                                    const resource = normalizeResource(item, skill.skill);
                                    if (!resourceMatchesFilter(resource)) return null;
                                    return (
                                      <a key={idx} href={resource.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">
                                        <span>{resource.title}</span>
                                        <span className="text-xs text-slate-500">{resource.type}</span>
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {milestone.projects && milestone.projects.length > 0 && (
                              <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Practice Projects</p>
                                <div className="space-y-2">
                                  {milestone.projects.map((project, idx) => (
                                    <div key={idx} className="rounded-xl bg-purple-400/10 p-3">
                                      <p className="font-bold text-purple-100">{project.name}</p>
                                      <p className="mt-1 text-xs leading-relaxed text-slate-300">{project.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolio Projects */}
                  {skill.projects && skill.projects.length > 0 && (
                    <div className="p-6 space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
                        <FileCheck2 className="size-4 text-purple-300" /> Portfolio Projects
                      </h4>
                      {skill.projects.map((project, projIdx) => (
                        <motion.div
                          key={projIdx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: projIdx * 0.1 }}
                          className="p-4 rounded-xl border border-white/5 bg-black/20 space-y-3 hover:border-cyan-300/30 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-lg font-bold text-slate-100">{project.name}</h4>
                            <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-700/50 text-xs font-semibold text-slate-300">
                              <Clock className="size-3" />
                              {project.timeframe}
                            </div>
                          </div>

                          <p className="text-sm text-slate-400 leading-relaxed">{project.description}</p>

                          {/* Technologies */}
                          {project.technologies && project.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {project.technologies.map((tech, techIdx) => (
                                <span
                                  key={techIdx}
                                  className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-200 border border-cyan-300/20"
                                >
                                  <Code className="inline-block size-3 mr-1" />
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Acceptance Criteria */}
                          {project.acceptanceCriteria && project.acceptanceCriteria.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <p className="text-xs font-semibold text-slate-400 uppercase">Completion Checklist:</p>
                              <ul className="grid gap-2 md:grid-cols-2">
                                {project.acceptanceCriteria.map((criterion, criterionIdx) => (
                                  <li key={criterionIdx} className="flex gap-2 text-sm text-slate-300">
                                    <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                                    <span>{criterion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(project.portfolioProof || project.resumeBullet || project.stretchGoal) && (
                            <div className="grid gap-3 pt-2 border-t border-white/5 md:grid-cols-3">
                              {project.portfolioProof && (
                                <div className="rounded-lg bg-white/5 p-3">
                                  <p className="mb-1 text-xs font-bold uppercase text-slate-500">Portfolio Proof</p>
                                  <p className="text-sm text-slate-300">{project.portfolioProof}</p>
                                </div>
                              )}
                              {project.resumeBullet && (
                                <div className="rounded-lg bg-cyan-400/10 p-3">
                                  <p className="mb-1 text-xs font-bold uppercase text-cyan-200">Resume Bullet</p>
                                  <p className="text-sm text-slate-200">{project.resumeBullet}</p>
                                </div>
                              )}
                              {project.stretchGoal && (
                                <div className="rounded-lg bg-purple-400/10 p-3">
                                  <p className="mb-1 text-xs font-bold uppercase text-purple-200">Stretch Goal</p>
                                  <p className="text-sm text-slate-300">{project.stretchGoal}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Learning Resources */}
                          {project.learningResources && project.learningResources.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <p className="text-xs font-semibold text-slate-400 uppercase">Learning Resources:</p>
                              <ul className="space-y-1">
                                {project.learningResources.map((item, resIdx) => {
                                  const resource = normalizeResource(item, skill.skill);
                                  if (!resourceMatchesFilter(resource)) return null;
                                  return (
                                    <li key={resIdx} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-cyan-300">
                                      <span className="flex items-center gap-2"><ArrowRight className="size-3" /> {resource.title}</span>
                                      <a href={resource.url} target="_blank" rel="noreferrer" className="text-xs font-black uppercase tracking-widest text-cyan-100">Open</a>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Estimated Hours */}
                          {project.estimatedHours && (
                            <div className="flex items-center gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                              <Clock className="size-3" />
                              Estimated {project.estimatedHours} hours
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass border border-white/10 text-center text-slate-400">
              No skills in your roadmap yet.
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setRoadmap(null)}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
            >
              Generate New Roadmap
            </button>
            <button
              onClick={() => {
                const roadmapText = roadmap.missingSkills
                  .map((skill) => {
                    const milestones = (skill.milestones || [])
                      .map((milestone) => {
                        const tasks = (milestone.practiceTasks || []).map((task) => `    - ${task}`).join('\n');
                        const deliverables = (milestone.deliverables || []).map((item) => `    - ${item}`).join('\n');
                        return `  ${milestone.week}: ${milestone.title}\n  Practice:\n${tasks || '    - Practice core concepts'}\n  Deliverables:\n${deliverables || '    - Working proof of skill'}`;
                      })
                      .join('\n');
                    const projects = (skill.projects || [])
                      .map((project) => `  - ${project.name} (${project.timeframe})\n    ${project.description}\n    Resume bullet: ${project.resumeBullet || 'Add a measurable project bullet after completion.'}`)
                      .join('\n');

                    return `${skill.skill}\nWhy it matters: ${skill.whyItMatters || 'Important for the target role.'}\nTarget outcome: ${skill.targetOutcome || 'Build and explain practical work.'}\n\nMilestones:\n${milestones || '  No milestones listed.'}\n\nProjects:\n${projects || '  No projects listed.'}`;
                  })
                  .join('\n\n');
                navigator.clipboard.writeText(roadmapText);
                alert('Roadmap copied to clipboard!');
              }}
              className="flex flex-1 items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all"
            >
              <Clipboard className="size-4" />
              Copy Roadmap
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
