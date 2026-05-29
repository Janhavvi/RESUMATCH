import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import {
  BadgeCheck,
  BrainCircuit,
  Building2,
  Clipboard,
  ClipboardList,
  Copy,
  Download,
  Eye,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const TABS = ['New Interview', 'Interview History', 'Saved Answers'];
const GENERATION_TIMEOUT_MS = 18000;
const QUESTION_VARIANTS = [
  'Anchor your answer in one specific example and measurable outcome.',
  'Explain the tradeoff, validation step, and result.',
  'Focus on exact ownership and what you would improve now.',
  'Include how you communicated decisions or risk.',
  'Answer with a project detail that is not already obvious from the resume.',
];

function averageScore(questions = []) {
  const scores = questions.map((q) => Number(q.score)).filter((score) => Number.isFinite(score));
  return scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
}

function evaluateLocalAnswer(answer = '') {
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return { score: null, feedback: '' };
  if (words >= 70) return { score: 88, feedback: 'Strong answer length. Add metrics, tradeoffs, and a clear result to make it interview-ready.' };
  if (words >= 35) return { score: 74, feedback: 'Good start. Strengthen it with a concrete example, your exact action, and measurable outcome.' };
  return { score: 58, feedback: 'Too brief. Use STAR: situation, task, action, result, then connect it to the role.' };
}

function downloadText(filename, content) {
  const element = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(element.href);
}

function createFallbackQuestions(resumeText = '') {
  const text = resumeText.toLowerCase();
  const skill = ['react', 'node', 'python', 'java', 'sql', 'mongodb', 'express', 'api', 'machine learning'].find((item) => text.includes(item)) || 'your strongest technical skill';
  const project = text.includes('project') ? 'a resume project' : 'your most relevant academic or practical work';

  return [
    {
      question: `Walk me through ${project}. What problem did you solve, and what was your exact contribution?`,
      sampleAnswer: 'I would describe the problem, my ownership, the technical choices I made, and the measurable result or learning outcome.',
      category: 'project-based',
      difficulty: 'medium',
      type: 'project-based',
      company: 'Target employer',
      answer: 'I would describe the problem, my ownership, the technical choices I made, and the measurable result or learning outcome.',
      grounding: 'Fallback generated from resume text',
    },
    {
      question: `How have you used ${skill} in a real task, and what tradeoff did you consider while implementing it?`,
      sampleAnswer: 'I would connect the skill to a concrete implementation, explain a tradeoff, and mention how I validated the result.',
      category: 'technical',
      difficulty: 'medium',
      type: 'technical',
      company: 'Engineering team',
      answer: 'I would connect the skill to a concrete implementation, explain a tradeoff, and mention how I validated the result.',
      grounding: 'Fallback generated from resume text',
    },
    {
      question: 'Tell me about a time you worked with a team under pressure. How did you communicate and keep the work moving?',
      sampleAnswer: 'I would use STAR: situation, task, action, result, with emphasis on communication, ownership, and outcome.',
      category: 'behavioral',
      difficulty: 'easy',
      type: 'behavioral',
      company: 'Hiring manager',
      answer: 'I would use STAR: situation, task, action, result, with emphasis on communication, ownership, and outcome.',
      grounding: 'Fallback generated from resume text',
    },
    {
      question: 'What is one gap in your current profile for this role, and what are you doing to close it?',
      sampleAnswer: 'I would identify one realistic gap, name the learning plan, and show proof through practice, projects, or certifications.',
      category: 'HR',
      difficulty: 'medium',
      type: 'HR',
      company: 'Recruiter',
      answer: 'I would identify one realistic gap, name the learning plan, and show proof through practice, projects, or certifications.',
      grounding: 'Fallback generated from resume text',
    },
    {
      question: 'If this role required you to learn a new tool in one week, how would you structure your learning and deliver useful output?',
      sampleAnswer: 'I would break the week into setup, fundamentals, guided practice, a small deliverable, feedback, and refinement.',
      category: 'problem-solving',
      difficulty: 'medium',
      type: 'problem-solving',
      company: 'Fast-moving team',
      answer: 'I would break the week into setup, fundamentals, guided practice, a small deliverable, feedback, and refinement.',
      grounding: 'Fallback generated from resume text',
    },
  ];
}

function normalizeGeneratedQuestions(items = [], resumeText = '') {
  const source = Array.isArray(items) ? items : [];
  const seen = new Set();
  const normalized = [];

  source
    .filter((item) => item && typeof item === 'object' && String(item.question || '').trim())
    .forEach((item, index) => {
      const signature = String(item.question).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (seen.has(signature) || normalized.length >= 5) return;
      seen.add(signature);
      const sampleAnswer = item.sampleAnswer || item.answer || '';
      const category = item.category || item.type || 'Interview';
      const difficulty = item.difficulty || (index < 2 ? 'medium' : 'easy');
      normalized.push({
        ...item,
        question: String(item.question).trim(),
        sampleAnswer,
        answer: sampleAnswer,
        category,
        type: category,
        difficulty,
        company: item.company || item.angle || 'Target employer',
        grounding: item.grounding || item.resumeSignal || '',
        userAnswer: item.userAnswer || '',
        feedback: item.feedback || '',
        score: item.score ?? null,
      });
    });

  if (normalized.length === 5) return normalized;
  return createFallbackQuestions(resumeText).map((fallback, index) => {
    if (normalized[index]) return normalized[index];
    const variant = QUESTION_VARIANTS[(Date.now() + index) % QUESTION_VARIANTS.length];
    return index < normalized.length ? fallback : { ...fallback, question: `${fallback.question} ${variant}` };
  });
}

export const AIInterviewPage = () => {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState('Pasted Resume');
  const [resumeText, setResumeText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('New Interview');
  const [activeSession, setActiveSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [detailSession, setDetailSession] = useState(null);
  const [generationError, setGenerationError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0]);
      setResumeName(acceptedFiles[0].name);
      setResumeText('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  const savedAnswerQuestions = useMemo(() => questions.filter((q) => q.userAnswer?.trim()), [questions]);

  const loadHistory = useCallback(async () => {
    try {
      const response = await apiFetch('/api/interview/history');
      const data = await response.json().catch(() => ({}));
      if (response.ok) setHistory(data.sessions || []);
    } catch (error) {
      console.error('Failed to load interview history:', error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleUploadResume = async () => {
    if (!resumeFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', resumeFile);

    try {
      const response = await apiFetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Upload failed. Please try again.');
      if (!data?.text) throw new Error('Upload succeeded but no resume text was returned');
      setResumeText(data.text);
      setResumeName(data.filename || resumeFile.name || 'Uploaded Resume');
      setResumeFile(null);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Upload failed. Please try again.');
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const generateInterview = async (retryOf = null, sourceText = resumeText, sourceName = resumeName) => {
    if (!sourceText.trim()) {
      alert('Please upload or paste resume text first.');
      return;
    }

    const payload = {
      resumeText: sourceText.trim(),
      resumeName: sourceName || 'Resume',
      retryOf,
    };
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

    console.log('[AI Interview] resume text length:', payload.resumeText.length);
    console.log('[AI Interview] request payload:', payload);

    setIsGenerating(true);
    setGenerationError('');
    try {
      const response = await apiFetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      console.log('[AI Interview] API response:', data);
      if (!response.ok) throw new Error(data.error || 'Interview generation failed');
      const normalizedQuestions = normalizeGeneratedQuestions(data.questions || data.session?.questions || [], payload.resumeText);
      if (!normalizedQuestions.length) throw new Error('No valid questions returned');
      const session = data.session ? { ...data.session, questions: normalizedQuestions } : {
        id: `local-${Date.now()}`,
        resumeName: payload.resumeName,
        resumeText: payload.resumeText,
        questions: normalizedQuestions,
        status: 'Incomplete',
        createdAt: new Date().toISOString(),
      };
      setActiveSession(session);
      setQuestions(normalizedQuestions);
      setDetailSession(null);
      setActiveTab('New Interview');
      await loadHistory();
    } catch (error) {
      console.error('[AI Interview] API error:', error);
      const message = error.name === 'AbortError'
        ? 'Generation timed out. Please try again.'
        : error.message || 'Interview generation failed. Showing fallback questions.';
      setGenerationError(message);
      const fallbackQuestions = normalizeGeneratedQuestions([], payload.resumeText);
      setActiveSession({
        id: `fallback-${Date.now()}`,
        resumeName: payload.resumeName,
        resumeText: payload.resumeText,
        questions: fallbackQuestions,
        status: 'Incomplete',
        createdAt: new Date().toISOString(),
      });
      setQuestions(fallbackQuestions);
      setDetailSession(null);
      setActiveTab('New Interview');
    } finally {
      window.clearTimeout(timeoutId);
      setIsGenerating(false);
    }
  };

  const updateQuestionAnswer = (index, value) => {
    setQuestions((current) =>
      current.map((item, idx) => {
        if (idx !== index) return item;
        const evaluation = evaluateLocalAnswer(value);
        return {
          ...item,
          userAnswer: value,
          score: evaluation.score,
          feedback: evaluation.feedback,
        };
      })
    );
  };

  const saveAnswers = async () => {
    if (!activeSession?.id) {
      alert('Generate an interview first.');
      return;
    }

    try {
      const response = await apiFetch(`/api/interview/history/${activeSession.id}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to save answers');
      setActiveSession(data.session);
      await loadHistory();
      alert('Interview answers saved.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to save answers.');
    }
  };

  const viewDetails = async (id) => {
    try {
      const response = await apiFetch(`/api/interview/history/${id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load details');
      setDetailSession(data.session);
      setActiveTab('Interview History');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to load details.');
    }
  };

  const retrySimilar = async (session) => {
    await generateInterview(session.id, session.resumeText || resumeText, session.resumeName || resumeName);
  };

  const deleteHistory = async (id) => {
    try {
      const response = await apiFetch(`/api/interview/history/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete history');
      if (activeSession?.id === id) {
        setActiveSession(null);
        setQuestions([]);
      }
      if (detailSession?.id === id) setDetailSession(null);
      await loadHistory();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to delete history.');
    }
  };

  const clearHistory = async () => {
    for (const session of history) {
      await apiFetch(`/api/interview/history/${session.id}`, { method: 'DELETE' }).catch(() => null);
    }
    setHistory([]);
    setDetailSession(null);
  };

  const copyQuestions = async (items = questions) => {
    const text = items.map((item, index) => `${index + 1}. ${item.question}\nSample answer: ${item.sampleAnswer || item.answer || 'N/A'}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    alert('Questions copied.');
  };

  const exportAnswers = (items = questions) => {
    const text = items.map((item, index) => [
      `${index + 1}. ${item.question}`,
      `Sample answer: ${item.sampleAnswer || item.answer || 'N/A'}`,
      `Your answer: ${item.userAnswer || ''}`,
      `Feedback: ${item.feedback || ''}`,
      `Score: ${item.score ?? 'Not scored'}`,
    ].join('\n')).join('\n\n');
    downloadText('resumatch-interview-answers.txt', text);
  };

  const downloadPdf = async (items = questions) => {
    const response = await apiFetch('/api/interview/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ResuMatch Interview Questions', questions: items }),
    });
    if (!response.ok) {
      alert('Failed to download PDF');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumatch-interview-questions.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderQuestionCard = (item, index, editable = true) => (
    <motion.div
      key={`${item.question}-${index}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/15 backdrop-blur-2xl tile-3d"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
            <BadgeCheck className="size-3" /> {item.category || item.type || 'Question'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            <Building2 className="size-3" /> {item.difficulty || 'medium'}
          </span>
        </div>
        <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-600">0{index + 1}</span>
      </div>
      <p className="text-base font-bold leading-relaxed text-slate-100">{item.question}</p>
      {item.sampleAnswer || item.answer ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.055] p-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Sample Answer</p>
          <p className="text-sm font-medium leading-relaxed text-slate-300">{item.sampleAnswer || item.answer}</p>
        </div>
      ) : null}
      {item.grounding ? (
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resume signal: {item.grounding}</p>
      ) : null}
      <div className="mt-5">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Your Answer</p>
        <textarea
          value={item.userAnswer || ''}
          onChange={(event) => editable && updateQuestionAnswer(index, event.target.value)}
          readOnly={!editable}
          placeholder="Write your answer here and save it to interview history..."
          className="h-28 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-relaxed text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-300/40"
        />
        {(item.feedback || item.score) && (
          <div className="mt-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Feedback</span>
              {item.score ? <span className="text-lg font-black text-cyan-300">{item.score}%</span> : null}
            </div>
            <p className="text-sm text-slate-300">{item.feedback}</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-200 font-bold text-xs uppercase tracking-widest border border-cyan-300/20"
        >
          <BrainCircuit className="size-4" /> AI Interview
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          Interactive <span className="text-cyan-300">Interview Simulator</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-3xl mx-auto font-medium">
          Generate fresh, personalized interview attempts from your resume, save answers, and revisit every session in history.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-2xl border px-5 py-3 text-xs font-black uppercase tracking-[0.16em] transition-all ${
              activeTab === tab
                ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100 shadow-lg shadow-cyan-500/10'
                : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'New Interview' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-8 rounded-[36px] glass space-y-7 tile-3d">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-cyan-300/10">
                <ClipboardList className="size-6 text-cyan-200" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tight">Resume Source</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                  Each click generates a new saved attempt and avoids previous questions.
                </p>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                isDragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-500/30 hover:border-slate-400/50 hover:bg-slate-500/5'
              } ${resumeText ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}
            >
              <input {...getInputProps()} />
              {resumeText ? (
                <div className="space-y-3">
                  <FileText className="size-7 text-emerald-400 mx-auto" />
                  <p className="text-emerald-400 font-bold text-sm">Resume Loaded</p>
                  <p className="text-xs text-slate-400">{resumeName}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setResumeText('');
                      setResumeFile(null);
                      setResumeName('Pasted Resume');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                  >
                    Clear and upload different file
                  </button>
                </div>
              ) : resumeFile ? (
                <div className="space-y-3">
                  <FileText className="size-7 text-cyan-400 mx-auto" />
                  <p className="text-cyan-300 font-bold text-sm">{resumeFile.name}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadResume();
                    }}
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500"
                  >
                    {isUploading ? <><Loader2 className="inline size-3 animate-spin mr-2" /> Uploading...</> : 'Upload Resume'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="size-7 text-slate-400 mx-auto" />
                  <p className="text-slate-200 font-bold text-sm">Drag and drop your resume here</p>
                  <p className="text-xs text-slate-400">(PDF, DOCX, or TXT)</p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-xs text-slate-500 font-medium mb-4">Or paste resume text directly:</p>
              <textarea
                value={resumeText}
                onChange={(event) => {
                  setResumeText(event.target.value);
                  setResumeName('Pasted Resume');
                }}
                placeholder="Optional: paste resume text here..."
                className="h-32 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-sm leading-relaxed text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-300/40"
              />
            </div>

            {generationError ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                <p className="text-sm font-bold text-amber-100">{generationError}</p>
                <button
                  onClick={() => generateInterview()}
                  disabled={isGenerating || !resumeText.trim()}
                  className="mt-3 rounded-xl border border-amber-200/30 bg-amber-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-amber-100 transition-all hover:bg-amber-200/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Retry Generation
                </button>
              </div>
            ) : null}

            <button
              onClick={() => generateInterview()}
              disabled={isGenerating || !resumeText.trim()}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
                isGenerating || !resumeText.trim()
                  ? 'cursor-not-allowed border border-white/5 bg-slate-800 text-slate-500'
                  : 'border border-cyan-300/40 bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/20 hover:bg-cyan-300 active:scale-95'
              }`}
            >
              {isGenerating ? <><Loader2 className="size-5 animate-spin" /> Generating Fresh Set</> : <><Sparkles className="size-5" /> Generate Fresh Set</>}
            </button>
          </div>

          <div className="space-y-5">
            {questions.length ? (
              <>
                <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.055] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black uppercase italic tracking-tight">Fresh Interview Ready</h2>
                      <p className="mt-1 text-sm text-slate-400">Session saved. Add your answers and save again when ready.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => copyQuestions()} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase text-slate-200"><Copy className="inline size-3" /> Copy</button>
                      <button onClick={() => downloadPdf()} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase text-slate-200"><Download className="inline size-3" /> PDF</button>
                      <button onClick={saveAnswers} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black uppercase text-slate-950"><Save className="inline size-3" /> Save Answers</button>
                    </div>
                  </div>
                </div>
                {questions.map((item, index) => renderQuestionCard(item, index, true))}
              </>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[36px] border border-dashed border-white/10 bg-white/[0.035] p-10 text-center">
                <MessageSquareText className="mb-6 size-10 text-cyan-200" />
                <h2 className="text-2xl font-black uppercase italic tracking-tight">Mock Interview Ready</h2>
                <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-slate-500">
                  Questions, sample answers, answer boxes, and score feedback will appear here. Every generation is saved to history.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'Interview History' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-black uppercase italic"><History className="size-6 text-cyan-300" /> Interview History</h2>
            {history.length > 0 && (
              <button onClick={clearHistory} className="rounded-xl border border-red-300/20 bg-red-500/10 px-4 py-2 text-xs font-black uppercase text-red-200">
                Clear History
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {history.map((session) => (
              <div key={session.id} className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-cyan-200">{session.resumeName || 'Resume'}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(session.createdAt || session.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${session.status === 'Completed' ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-200'}`}>
                    {session.status || 'Incomplete'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/20 p-3">
                    <p className="text-xs text-slate-500">Total Questions</p>
                    <p className="text-2xl font-black text-cyan-300">{session.questions?.length || 0}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 p-3">
                    <p className="text-xs text-slate-500">Average Score</p>
                    <p className="text-2xl font-black text-emerald-300">{session.overallScore || averageScore(session.questions)}%</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => viewDetails(session.id)} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase text-slate-200"><Eye className="inline size-3" /> View Details</button>
                  <button onClick={() => retrySimilar(session)} className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs font-black uppercase text-cyan-100"><RotateCcw className="inline size-3" /> Retry Similar</button>
                  <button onClick={() => deleteHistory(session.id)} className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-black uppercase text-red-200"><Trash2 className="inline size-3" /> Delete</button>
                </div>
              </div>
            ))}
          </div>

          {!history.length && (
            <div className="rounded-[36px] border border-dashed border-white/10 bg-white/[0.035] p-10 text-center text-slate-500">
              No interview attempts saved yet.
            </div>
          )}

          {detailSession && (
            <div className="space-y-5">
              <div className="rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.055] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black uppercase italic">History Details</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copyQuestions(detailSession.questions)} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase text-slate-200">Copy Questions</button>
                    <button onClick={() => downloadPdf(detailSession.questions)} className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase text-slate-200">Download PDF</button>
                    <button onClick={() => exportAnswers(detailSession.questions)} className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black uppercase text-slate-950">Export Answers</button>
                  </div>
                </div>
              </div>
              {detailSession.questions?.map((item, index) => renderQuestionCard(item, index, false))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'Saved Answers' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-black uppercase italic"><Clipboard className="size-6 text-cyan-300" /> Saved Answers</h2>
            {savedAnswerQuestions.length > 0 && (
              <button onClick={() => exportAnswers(savedAnswerQuestions)} className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black uppercase text-slate-950">
                Export Answers
              </button>
            )}
          </div>
          {savedAnswerQuestions.length ? (
            savedAnswerQuestions.map((item, index) => renderQuestionCard(item, index, false))
          ) : (
            <div className="rounded-[36px] border border-dashed border-white/10 bg-white/[0.035] p-10 text-center text-slate-500">
              Saved answers from the current attempt will appear here after you type them.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
