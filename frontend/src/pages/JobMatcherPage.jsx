import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase, 
  Target, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

export const JobMatcherPage = () => {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState(null);

  const handleMatch = async () => {
    if (!jobDescription) return;
    setIsMatching(true);

    try {
      // First, fetch the latest resume text from the server if not provided
      let textToUse = resumeText;
      if (!textToUse) {
        const res = await apiFetch('/api/resume/all');
        const resumes = await res.json();
        if (resumes.length === 0) {
            alert('Please upload a resume first in the AI Analyzer section.');
            setIsMatching(false);
            return;
        }
        textToUse = resumes[0].content;
      }

      const matchRes = await apiFetch('/api/resume/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: textToUse,
          jobDescription,
        }),
      });

      if (!matchRes.ok) {
        const err = await matchRes.json().catch(() => ({}));
        throw new Error(err.error || 'Job matching failed');
      }

      const match = await matchRes.json();
      setResult(match);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Job matching failed.');
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      <div className="text-center space-y-4">
        <motion.div
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 1, scale: 1 }}
           className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 text-indigo-400 font-bold text-xs uppercase tracking-widest border border-indigo-500/20"
        >
          <Target className="size-4" /> Strategic Matching
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          Precision <span className="text-indigo-400">Job Matching</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Quantify your compatibility with any role using deep AI alignment analysis.
        </p>
      </div>

      {!result ? (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
          <div className="p-10 rounded-[40px] glass space-y-8">
            <label className="block">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block pl-2">Target Job Description</span>
                <textarea 
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description here..."
                    className="w-full h-80 glass-light rounded-3xl p-8 text-slate-300 focus:border-indigo-500 transition-all outline-none resize-none leading-relaxed text-sm"
                />
            </label>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <p className="text-xs text-slate-500 flex items-center gap-2 font-medium italic">
                    <Sparkles className="size-3 text-indigo-400" /> Analyzing against your most recent professional profile.
                </p>
                <button 
                  onClick={handleMatch}
                  disabled={!jobDescription || isMatching}
                  className={`
                    px-14 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all text-sm
                    ${!jobDescription || isMatching
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-500/30 border border-indigo-400'}
                  `}
                >
                  {isMatching ? <><Loader2 className="size-5 animate-spin" /> Calculating...</> : <><Briefcase className="size-5" /> Audit Compatibility</>}
                </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
        >
          {/* Results Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 p-12 rounded-[40px] glass flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Target className="size-40" />
                </div>
                <div className="relative size-40">
                    <svg className="size-full" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1b4b" strokeWidth="3" />
                        <circle 
                            cx="18" cy="18" r="16" fill="none" 
                            stroke="#6366f1"
                            strokeWidth="3" 
                            strokeDasharray="100, 100"
                            strokeDashoffset={100 - result.matchPercentage}
                            strokeLinecap="round" 
                            transform="rotate(-90 18 18)" 
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-black tracking-tighter">{result.matchPercentage}%</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Score</span>
                    </div>
                </div>
                <p className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] italic relative z-10">Job Match Fidelity</p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 rounded-[40px] glass-light border-emerald-500/10">
                    <h3 className="font-black text-emerald-400 flex items-center gap-2 text-xs uppercase tracking-[0.2em] mb-8 italic">
                        <CheckCircle2 className="size-4" /> Strong Alignment
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {result.matchedSkills.map((s, i) => (
                            <span key={i} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wide">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="p-10 rounded-[40px] glass-light border-red-500/10">
                    <h3 className="font-black text-red-400 flex items-center gap-2 text-xs uppercase tracking-[0.2em] mb-8 italic">
                        <AlertTriangle className="size-4" /> Critical Gaps
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {result.unmatchedSkills.map((s, i) => (
                            <span key={i} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wide">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          {/* Bullet Optimizations */}
          <div className="space-y-8">
            <h3 className="text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-4">
                <Sparkles className="size-8 text-indigo-400" /> Strategic Optimizations
            </h3>
            <div className="space-y-6">
                {result.bulletPointOptimizations.map((opt, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 rounded-[40px] overflow-hidden border border-white/5 shadow-2xl">
                        <div className="p-10 glass-light">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Current Phrasing</p>
                            <p className="text-sm text-slate-400 font-medium italic leading-relaxed">"{opt.original}"</p>
                        </div>
                        <div className="p-10 bg-indigo-600/10 relative group">
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-20 transition-opacity">
                               <Sparkles className="size-8 text-white" />
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">AI Enhanced Strategy</p>
                            <p className="text-sm text-white font-bold leading-relaxed">"{opt.improved}"</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-12 rounded-[48px] bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-white/10 space-y-10 shadow-3xl">
            <div>
                <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Roadmap to 100% Match</h3>
                <p className="text-indigo-300 font-medium text-sm">Actionable steps to eliminate identified experience gaps.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {result.recommendations.map((rec, i) => (
                    <div key={i} className="space-y-4 p-8 glass rounded-3xl border-white/10 hover:border-white/20 transition-all group">
                        <div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black italic tracking-tighter text-xl group-hover:scale-110 transition-transform">
                            {i+1}
                        </div>
                        <p className="text-sm font-bold text-slate-200 leading-relaxed">{rec}</p>
                    </div>
                ))}
            </div>
          </div>

          <div className="flex justify-center pb-20 pt-8">
              <button 
                onClick={() => setResult(null)}
                className="group flex items-center gap-3 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-[0.4em] transition-all"
              >
                  Restart Audit <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
