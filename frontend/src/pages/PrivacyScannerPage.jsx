import React, { useMemo, useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clipboard,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Fingerprint,
  Gauge,
  History,
  KeyRound,
  Layers,
  Link2,
  Loader2,
  Lock,
  RotateCcw,
  ScanLine,
  Settings2,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const PRIVACY_SETTINGS = [
  { key: 'email', label: 'Hide Email', types: ['email'] },
  { key: 'phone', label: 'Hide Phone', types: ['phone', 'emergency_contact'] },
  { key: 'address', label: 'Hide Address', types: ['full_address', 'city_state_pincode', 'exact_location'] },
  { key: 'dob', label: 'Hide DOB', types: ['date_of_birth', 'age'] },
  { key: 'aadhaar', label: 'Hide Aadhaar', types: ['aadhaar'] },
  { key: 'pan', label: 'Hide PAN', types: ['pan'] },
  { key: 'links', label: 'Hide Links', types: ['linkedin', 'github', 'portfolio'] },
  { key: 'ids', label: 'Hide IDs', types: ['ssn', 'passport', 'driving_license', 'school_id', 'roll_number', 'employee_id'] },
];

const MODE_LABELS = {
  current: 'Custom Version',
  recruiter: 'Recruiter Version',
  public: 'Public Version',
  anonymous: 'Anonymous Version',
};

const DEFAULT_SETTINGS = {
  email: true,
  phone: true,
  address: true,
  dob: true,
  aadhaar: true,
  pan: true,
  links: false,
  ids: true,
};

function severityClasses(severity) {
  if (severity === 'high') return 'border-red-300/25 bg-red-500/10 text-red-100';
  if (severity === 'medium') return 'border-amber-300/25 bg-amber-500/10 text-amber-100';
  return 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100';
}

function scoreTone(score) {
  if (score >= 90) return { label: 'Safe to Share', color: 'text-emerald-300', bar: 'bg-emerald-400', glow: 'shadow-emerald-500/25' };
  if (score >= 70) return { label: 'Minor Privacy Risks', color: 'text-cyan-300', bar: 'bg-cyan-400', glow: 'shadow-cyan-500/25' };
  if (score >= 40) return { label: 'Moderate Privacy Risks', color: 'text-amber-300', bar: 'bg-amber-400', glow: 'shadow-amber-500/25' };
  return { label: 'High Privacy Risks', color: 'text-red-300', bar: 'bg-red-400', glow: 'shadow-red-500/25' };
}

function enabledTypesFromSettings(settings) {
  const enabled = [];
  PRIVACY_SETTINGS.forEach((setting) => {
    if (settings[setting.key]) enabled.push(...setting.types);
  });
  return enabled;
}

function applyRedactions(content, risks, enabledTypes, selectedIds = null) {
  const enabled = new Set(enabledTypes);
  const selected = selectedIds ? new Set(selectedIds) : null;
  const priority = {
    email: 1,
    phone: 2,
    ssn: 3,
    aadhaar: 3,
    pan: 3,
    passport: 3,
    driving_license: 3,
    school_id: 3,
    roll_number: 3,
    employee_id: 3,
    emergency_contact: 3,
    family_information: 3,
    date_of_birth: 3,
    age: 3,
    full_address: 4,
    city_state_pincode: 4,
    exact_location: 4,
    linkedin: 5,
    github: 5,
    portfolio: 5,
  };
  const applicable = [];
  const sorted = (risks || [])
    .filter((risk) => enabled.has(risk.type) && (!selected || selected.has(risk.id)))
    .sort((a, b) => {
      if (a.start !== b.start && !(a.start < b.end && a.end > b.start)) return a.start - b.start;
      const priorityDiff = (priority[a.type] || 9) - (priority[b.type] || 9);
      if (priorityDiff !== 0) return priorityDiff;
      const severityRank = { high: 3, medium: 2, low: 1 };
      const severityDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return (b.end - b.start) - (a.end - a.start);
    });

  sorted.forEach((risk) => {
    const overlaps = applicable.some((item) => risk.start < item.end && risk.end > item.start);
    if (!overlaps) applicable.push(risk);
  });

  let output = content || '';
  applicable.sort((a, b) => b.start - a.start).forEach((risk) => {
    output = `${output.slice(0, risk.start)}${risk.replacement || risk.redactedValue}${output.slice(risk.end)}`;
  });
  return output;
}

function downloadText(filename, content) {
  const element = document.createElement('a');
  const file = new Blob([content || ''], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

function RedactedText({ content }) {
  const parts = String(content || '').split(/(\[[A-Z _]+REDACTED\])/g);
  return (
    <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
      {parts.map((part, idx) =>
        /\[[A-Z _]+REDACTED\]/.test(part) ? (
          <mark key={idx} className="rounded bg-cyan-300/20 px-1 py-0.5 font-bold text-cyan-100">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        )
      )}
    </pre>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'text-cyan-300' }) {
  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-white/[0.035] p-5 shadow-2xl shadow-cyan-950/20">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-400">{label}</p>
        <Icon className={`size-5 ${tone}`} />
      </div>
      <p className={`text-3xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

export const PrivacyScannerPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [resumeContent, setResumeContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRiskIds, setSelectedRiskIds] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeMode, setActiveMode] = useState('current');
  const [scanHistory, setScanHistory] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setResumeFiles(acceptedFiles);
      setResumeContent('');
      setOriginalContent('');
      setScanResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const enabledTypes = useMemo(() => enabledTypesFromSettings(settings), [settings]);

  const activeContent = useMemo(() => {
    if (!scanResult) return '';
    if (activeMode !== 'current') return scanResult.versions?.[activeMode] || scanResult.redactedContent || '';
    return applyRedactions(originalContent || resumeContent, scanResult.risks, enabledTypes);
  }, [activeMode, enabledTypes, originalContent, resumeContent, scanResult]);

  const selectedContent = useMemo(() => {
    if (!scanResult) return '';
    return applyRedactions(originalContent || resumeContent, scanResult.risks, enabledTypes, selectedRiskIds);
  }, [enabledTypes, originalContent, resumeContent, scanResult, selectedRiskIds]);

  const tone = scoreTone(scanResult?.privacyScore ?? 100);
  const riskCounts = {
    high: scanResult?.highRiskCount || 0,
    medium: scanResult?.mediumRiskCount || 0,
    low: scanResult?.lowRiskCount || 0,
  };

  const uploadSingleFile = async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    const response = await apiFetch('/api/resume/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Failed to upload ${file.name}`);
    return data;
  };

  const scanText = async (content) => {
    const response = await apiFetch('/api/privacy/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Failed to scan resume');
    return data.report;
  };

  const handleUploadResume = async () => {
    if (!resumeFiles.length) return;
    setIsUploading(true);
    try {
      const data = await uploadSingleFile(resumeFiles[0]);
      if (!data?.text) throw new Error('Upload succeeded but no resume text was returned');
      setResumeContent(data.text);
      setOriginalContent(data.text);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleScan = async () => {
    if (!resumeContent.trim()) {
      alert('Please upload or paste resume content first');
      return;
    }

    try {
      setLoading(true);
      const report = await scanText(resumeContent);
      setScanResult(report);
      setOriginalContent(resumeContent);
      setSelectedRiskIds((report.risks || []).map((risk) => risk.id));
      setActiveMode('current');
      setScanHistory((items) => [
        {
          id: Date.now(),
          name: resumeFiles[0]?.name || 'Pasted resume',
          score: report.privacyScore,
          riskLevel: report.riskLevel,
          risks: report.totalRisks,
          at: new Date().toLocaleString(),
        },
        ...items,
      ].slice(0, 6));
    } catch (error) {
      console.error('Error scanning resume:', error);
      alert(error.message || 'Failed to scan resume for privacy risks');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkScan = async () => {
    if (resumeFiles.length < 2) {
      alert('Add two or more files for bulk scanning');
      return;
    }
    setLoading(true);
    const results = [];
    try {
      for (const file of resumeFiles) {
        const uploaded = await uploadSingleFile(file);
        const report = await scanText(uploaded.text || '');
        results.push({
          name: file.name,
          score: report.privacyScore,
          riskLevel: report.riskLevel,
          risks: report.totalRisks,
          high: report.highRiskCount,
        });
      }
      setBulkResults(results);
      alert('Bulk scan completed');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Bulk scan failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (content = activeContent) => {
    await navigator.clipboard.writeText(content || '');
    alert('Safe resume copied to clipboard');
  };

  const handlePdfDownload = async (versionKey = activeMode) => {
    const content = versionKey === 'current'
      ? activeContent
      : scanResult?.versions?.[versionKey] || activeContent;
    const title = `${MODE_LABELS[versionKey] || 'Redacted Resume'} - ResuMatch`;
    const response = await apiFetch('/api/privacy/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }),
    });
    if (!response.ok) {
      alert('Failed to download PDF');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleRisk = (riskId) => {
    setSelectedRiskIds((current) =>
      current.includes(riskId) ? current.filter((id) => id !== riskId) : [...current, riskId]
    );
  };

  const applyAllRedactions = () => {
    if (!scanResult) return;
    setSelectedRiskIds(scanResult.risks.map((risk) => risk.id));
    setResumeContent(activeContent);
  };

  const applySelectedRedactions = () => {
    setResumeContent(selectedContent);
  };

  const restoreOriginal = () => {
    setResumeContent(originalContent);
    setActiveMode('current');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 pb-20">
      <div className="relative overflow-hidden rounded-[36px] border border-cyan-300/10 bg-[#020617]/70 px-6 py-12 text-center shadow-2xl shadow-cyan-950/30">
        <div className="absolute left-12 top-10 size-2 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300" />
        <div className="absolute right-20 bottom-14 size-2 rounded-full bg-emerald-300 shadow-lg shadow-emerald-300" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-200"
        >
          <ShieldCheck className="size-4" /> AI Privacy & Security Center
        </motion.div>
        <h1 className="text-4xl font-black italic uppercase tracking-tight md:text-6xl">
          Resume Privacy <span className="text-cyan-300">Command Center</span>
        </h1>
        <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-relaxed text-slate-400 md:text-lg">
          Detect, understand, redact, simulate, and export safe resume versions before sharing on recruiters, job boards, LinkedIn, GitHub, or public communities.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
              <ScanLine className="size-6 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase">Secure Resume Intake</h2>
              <p className="mt-2 text-sm font-medium text-slate-400">Upload one resume, paste text, or add multiple files for enterprise bulk scanning.</p>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-3xl border-2 border-dashed p-7 text-center transition-all ${
              isDragActive ? 'border-cyan-300 bg-cyan-400/10' : 'border-cyan-300/20 bg-black/20 hover:border-cyan-300/40'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-3 size-8 text-cyan-200" />
            <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-200">Drop resumes here</p>
            <p className="mt-1 text-xs font-medium text-slate-500">PDF, DOCX, TXT. Multiple files supported.</p>
          </div>

          {resumeFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {resumeFiles.slice(0, 4).map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-200">
                    <FileText className="size-4 shrink-0 text-cyan-200" />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <span className="text-xs text-slate-500">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                </div>
              ))}
              {resumeFiles.length > 4 && <p className="text-xs text-slate-500">{resumeFiles.length - 4} more files queued</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={handleUploadResume} disabled={isUploading} className="rounded-2xl bg-cyan-400 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition-all hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500">
                  {isUploading ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Load First Resume'}
                </button>
                <button onClick={handleBulkScan} disabled={loading || resumeFiles.length < 2} className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-600">
                  Bulk Scan Queue
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <label className="mb-2 block text-sm font-bold text-slate-300">Resume Text</label>
            <textarea
              value={resumeContent}
              onChange={(e) => {
                setResumeContent(e.target.value);
                if (!originalContent) setOriginalContent(e.target.value);
              }}
              placeholder="Paste resume text here for instant privacy scanning..."
              className="h-52 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-sm leading-relaxed text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </div>

          <button
            onClick={handleScan}
            disabled={loading || !resumeContent.trim()}
            className={`mt-5 flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
              loading || !resumeContent.trim()
                ? 'cursor-not-allowed border border-white/5 bg-slate-800 text-slate-500'
                : 'border border-cyan-300/40 bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/20 hover:bg-cyan-300 active:scale-95'
            }`}
          >
            {loading ? <><Loader2 className="size-5 animate-spin" /> Scanning Security Surface...</> : <><Shield className="size-5" /> Run Enterprise Privacy Scan</>}
          </button>
        </motion.div>

        <div className="space-y-4">
          <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
            <div className="mb-5 flex items-center gap-3">
              <Settings2 className="size-5 text-cyan-300" />
              <h3 className="text-lg font-black uppercase">Custom Privacy Settings</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRIVACY_SETTINGS.map((setting) => (
                <button
                  key={setting.key}
                  onClick={() => setSettings((current) => ({ ...current, [setting.key]: !current[setting.key] }))}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                    settings[setting.key] ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-400'
                  }`}
                >
                  <span className="text-sm font-bold">{setting.label}</span>
                  {settings[setting.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Layers className="size-5 text-purple-300" />
              <h3 className="text-lg font-black uppercase">Safe Sharing Mode</h3>
            </div>
            <div className="grid gap-3">
              {['current', 'recruiter', 'public', 'anonymous'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  disabled={!scanResult && mode !== 'current'}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-black uppercase tracking-[0.12em] transition-all ${
                    activeMode === mode ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                  }`}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {scanResult && (
        <AnimatePresence>
          <motion.section initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className={`rounded-2xl border border-cyan-300/15 bg-white/[0.04] p-6 shadow-2xl ${tone.glow}`}>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-400">Privacy Score</p>
                  <Gauge className={`size-5 ${tone.color}`} />
                </div>
                <p className={`text-5xl font-black ${tone.color}`}>{scanResult.privacyScore}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{scanResult.riskLevel || tone.label}</p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${scanResult.privacyScore}%` }} className={`h-full ${tone.bar}`} />
                </div>
              </div>
              <StatCard icon={ShieldAlert} label="Total Risks Found" value={scanResult.totalRisks || 0} tone="text-cyan-300" />
              <StatCard icon={AlertTriangle} label="High Risk Count" value={riskCounts.high} tone="text-red-300" />
              <StatCard icon={AlertCircle} label="Medium Risk Count" value={riskCounts.medium} tone="text-amber-300" />
              <StatCard icon={CheckCircle} label="Low Risk Count" value={riskCounts.low} tone="text-blue-300" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={Fingerprint} label="Personal Data Found" value={scanResult.insights?.personalDataFound || 0} tone="text-purple-300" />
              <StatCard icon={Users} label="Contact Info Found" value={scanResult.insights?.contactInformationFound || 0} tone="text-cyan-300" />
              <StatCard icon={KeyRound} label="Government IDs Found" value={scanResult.insights?.governmentIdsFound || 0} tone="text-red-300" />
              <StatCard icon={Link2} label="Links Found" value={scanResult.insights?.linksFound || 0} tone="text-blue-300" />
              <StatCard icon={Activity} label="Exposure Score" value={scanResult.insights?.overallExposureScore || 0} tone="text-amber-300" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-xl font-black uppercase"><FileSearch className="size-5 text-cyan-300" /> Risk Classification</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={applyAllRedactions} className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black uppercase text-slate-950">Apply All</button>
                    <button onClick={applySelectedRedactions} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase text-slate-200">Apply Selected</button>
                    <button onClick={restoreOriginal} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black uppercase text-slate-200"><RotateCcw className="inline size-3" /> Restore</button>
                  </div>
                </div>
                <div className="space-y-4">
                  {scanResult.risks?.length ? scanResult.risks.map((risk, idx) => (
                    <motion.div
                      key={risk.id || idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.035 }}
                      className={`rounded-2xl border p-5 ${severityClasses(risk.severity)}`}
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-black">{risk.label || risk.type}</h4>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] opacity-70">{risk.type?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleRisk(risk.id)} className="rounded-full border border-white/15 px-3 py-1 text-xs font-black uppercase">
                            {selectedRiskIds.includes(risk.id) ? 'Selected' : 'Skipped'}
                          </button>
                          <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-black uppercase">{risk.severity}</span>
                          {typeof risk.confidence === 'number' && (
                            <span className="rounded-full bg-black/30 px-3 py-1 text-xs font-black uppercase">
                              {Math.round(risk.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-black uppercase opacity-70">Detected Value</p>
                          <p className="rounded-xl bg-black/25 p-3 font-mono text-xs break-all">{risk.originalValue}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-black uppercase opacity-70">Suggested Redaction</p>
                          <p className="rounded-xl bg-emerald-400/10 p-3 font-mono text-xs text-emerald-100">{risk.redactedValue}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <p className="text-sm leading-relaxed"><strong>Why risky:</strong> {risk.whyRisky}</p>
                        <p className="text-sm leading-relaxed"><strong>Recommended action:</strong> {risk.recommendedAction || risk.suggestion}</p>
                      </div>
                      {risk.addressSignals?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {risk.addressSignals.map((signal) => (
                            <span key={signal} className="rounded-full bg-black/20 px-3 py-1 text-xs font-bold">
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )) : (
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-8 text-center">
                      <ShieldCheck className="mx-auto mb-3 size-10 text-emerald-300" />
                      <p className="font-black text-emerald-100">No sensitive data detected.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Sparkles className="size-5 text-cyan-300" /> AI Privacy Advisor</h3>
                  <div className="space-y-3">
                    {(scanResult.advisorMessages || []).map((message, idx) => (
                      <div key={idx} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm font-medium leading-relaxed text-cyan-50">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-red-300/15 bg-red-500/[0.04] p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Database className="size-5 text-red-300" /> Privacy Exposure Simulator</h3>
                  <p className="mb-4 text-sm font-medium text-slate-400">If this resume is uploaded publicly, strangers may collect:</p>
                  <div className="space-y-2">
                    {(scanResult.simulator?.exposed || []).slice(0, 7).map((risk) => (
                      <div key={risk.id} className="flex items-center justify-between rounded-xl border border-red-300/15 bg-black/20 px-3 py-2">
                        <span className="text-sm font-bold text-red-100">{risk.label}</span>
                        <span className="max-w-[50%] truncate text-xs text-slate-400">{risk.originalValue}</span>
                      </div>
                    ))}
                    {(scanResult.simulator?.exposed || []).length === 0 && <p className="text-sm text-emerald-300">No high-value public exposure detected.</p>}
                  </div>
                  <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Protected Version</p>
                    <p className="text-sm font-medium text-emerald-50">Sensitive contact, identity, and location fields are replaced with redaction placeholders.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xl font-black uppercase"><BarChart3 className="size-5 text-cyan-300" /> Before vs After Comparison</h3>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{MODE_LABELS[activeMode]}</p>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-red-300/15 bg-red-500/[0.035] p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-red-200">Original Resume</p>
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{originalContent || resumeContent}</pre>
                </div>
                <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/[0.035] p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Redacted Resume</p>
                  <div className="max-h-96 overflow-auto">
                    <RedactedText content={activeContent} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
              <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Download className="size-5 text-cyan-300" /> Export Secure Versions</h3>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <button onClick={() => handlePdfDownload('current')} className="rounded-2xl bg-cyan-400 px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-950">Download Redacted PDF</button>
                  <button onClick={() => handlePdfDownload('recruiter')} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-200">Download Recruiter Version</button>
                  <button onClick={() => handlePdfDownload('public')} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-200">Download Public Version</button>
                  <button onClick={() => handlePdfDownload('anonymous')} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-200">Download Anonymous Version</button>
                  <button onClick={() => handleCopy(activeContent)} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-200"><Copy className="inline size-4" /> Copy Safe Resume</button>
                  <button onClick={() => { handleCopy(scanResult.versions?.public || activeContent); alert('Secure public version ready to share.'); }} className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-4 text-xs font-black uppercase tracking-[0.14em] text-cyan-100"><Share2 className="inline size-4" /> Share Secure Version</button>
                </div>
                <button onClick={() => downloadText('resumatch-safe-resume.txt', activeContent)} className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                  Download Text Backup
                </button>
              </div>

              <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><History className="size-5 text-cyan-300" /> Scan History & Audit Logs</h3>
                <div className="space-y-3">
                  {scanHistory.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-bold text-slate-200">{item.name}</p>
                        <span className="text-xs font-black text-cyan-300">{item.score}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.risks} risks - {item.at}</p>
                    </div>
                  ))}
                  {scanResult.auditLog?.map((log, idx) => (
                    <div key={`${log.event}-${idx}`} className="rounded-xl border border-cyan-300/10 bg-cyan-300/5 p-3 text-xs text-slate-400">
                      <span className="font-bold text-cyan-200">{log.event}</span> - {log.detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(bulkResults.length > 0) && (
              <div className="rounded-[32px] border border-cyan-300/15 bg-white/[0.035] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-xl font-black uppercase"><Clipboard className="size-5 text-cyan-300" /> Bulk Resume Scanning</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {bulkResults.map((result) => (
                    <div key={result.name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="truncate text-sm font-black text-slate-200">{result.name}</p>
                      <p className="mt-2 text-xs text-slate-500">{result.riskLevel}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-2xl font-black text-cyan-300">{result.score}</span>
                        <span className="text-xs font-bold text-red-300">{result.high} high risks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      )}

      {!scanResult && (
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ['Recruiter Version', 'Hides addresses, identity numbers, and private family data while preserving contact channels.'],
            ['Public Version', 'Removes contact details, DOB, addresses, and IDs for job boards and public communities.'],
            ['Anonymous Version', 'Hides all personal identifiers for portfolio reviews, GitHub issues, and social sharing.'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-cyan-300/15 bg-white/[0.035] p-5">
              <Lock className="mb-3 size-5 text-cyan-300" />
              <p className="font-black text-slate-100">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
