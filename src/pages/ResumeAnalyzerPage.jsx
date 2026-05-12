import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Rocket, 
  Loader2, 
  ChevronRight,
  Target,
  Sparkles,
  ArrowRight,
  BarChart3
} from 'lucide-react';
export const ResumeAnalyzerPage = () => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const handleAnalyze = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 413) {
          throw new Error('File is too large. Maximum size is 3MB on this deployment. For larger files, consider using cloud storage.');
        }
        if (response.status === 400) {
          throw new Error(data?.error || 'Invalid file. Please use PDF, DOCX, or TXT files.');
        }
        throw new Error(data?.error || 'Upload failed. Please try again.');
      }

      if (!data?.id) {
        throw new Error('Upload succeeded but no resume ID was returned');
      }
      
      setIsUploading(false);
      setIsAnalyzing(true);

      // Server-side AI analysis (uses Gemini when configured, fallback otherwise).
      const analyzeRes = await fetch('/api/resume/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error || 'Analysis failed');
      }

      const analyzeData = await analyzeRes.json();
      const aiResult = analyzeData.analysis;
      setResult(aiResult);

    } catch (error) {
      console.error(error);
      alert(error.message || 'Analysis failed. Please try again.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
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
          <Sparkles className="size-4" /> AI-Powered Audit
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          Resume <span className="text-indigo-400">Insights</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Deep structural analysis to bypass automated filters and reach human recruiters.
        </p>
      </div>

      {!result ? (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
          <div 
            {...getRootProps()} 
            className={`
              relative group cursor-pointer border-2 border-dashed rounded-[40px] p-20 transition-all duration-700 glass-light
              ${isDragActive ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/40'}
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center space-y-8">
              <div className="size-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-2xl">
                {isUploading ? (
                  <Loader2 className="size-12 text-indigo-500 animate-spin" />
                ) : file ? (
                  <FileText className="size-12 text-indigo-500" />
                ) : (
                  <Upload className="size-12 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                )}
              </div>
              <div>
                <h3 className="text-3xl font-black mb-3 italic tracking-tight">
                  {file ? file.name : isDragActive ? 'Release to upload' : 'Upload your Resume'}
                </h3>
                <p className="text-slate-500 font-semibold text-sm uppercase tracking-widest">
                  PDF / DOCX / TXT • Max 5MB
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className={`
                px-14 py-6 rounded-2xl font-black text-xl uppercase tracking-widest transition-all relative overflow-hidden
                ${!file || isAnalyzing 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-500/40 active:scale-95 border border-indigo-400'}
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-4">Analyzing Core... <Loader2 className="size-6 animate-spin" /></span>
              ) : (
                <span className="flex items-center gap-4">Start Analysis <Rocket className="size-6" /></span>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
        >
          {/* Analysis Results View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-8">
                {/* Score Card */}
                <div className="p-12 rounded-[40px] glass flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <BarChart3 className="size-40" />
                    </div>
                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1b4b" strokeWidth="3" />
                            <circle 
                                cx="18" cy="18" r="16" fill="none" 
                                stroke={result.atsScore > 80 ? '#10b981' : result.atsScore > 70 ? '#6366f1' : '#f59e0b'}
                                strokeWidth="3" 
                                strokeDasharray="100, 100"
                                strokeDashoffset={100 - result.atsScore}
                                strokeLinecap="round" 
                                transform="rotate(-90 18 18)" 
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black tracking-tighter">{result.atsScore}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-black">ATS Score</span>
                        </div>
                    </div>
                    <div className="text-center space-y-3 relative z-10">
                        <p className={`text-xl font-black uppercase italic ${result.atsScore > 80 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                           {result.atsScore > 80 ? 'Excellent Match' : 'Strong Polish Needed'}
                        </p>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium px-4">{result.summary}</p>
                    </div>
                </div>

                {/* Match Metrics */}
                <div className="p-8 rounded-[40px] glass-light space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                        <Target className="size-4 text-indigo-400" /> Match Metrics
                    </h3>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span>Action Verbs</span>
                                <span className="text-indigo-400">{result.actionVerbCount}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span>Readability</span>
                                <span className="text-indigo-400">High</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                {/* Critical Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-10 rounded-[40px] glass-light border-emerald-500/10 space-y-8">
                        <h3 className="font-black text-emerald-400 flex items-center gap-2 uppercase tracking-widest text-xs italic">
                           <CheckCircle2 className="size-4" /> Strong Aspects
                        </h3>
                        <ul className="space-y-4">
                            {result.strengths.map((s, i) => (
                                <li key={i} className="text-sm font-medium text-slate-300 leading-relaxed flex gap-4">
                                   <div className="size-1.5 bg-emerald-500 rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                   {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-10 rounded-[40px] glass-light border-red-500/10 space-y-8">
                        <h3 className="font-black text-red-400 flex items-center gap-2 uppercase tracking-widest text-xs italic">
                           <AlertCircle className="size-4" /> Gaps Identified
                        </h3>
                        <ul className="space-y-4">
                            {result.weaknesses.map((w, i) => (
                                <li key={i} className="text-sm font-medium text-slate-300 leading-relaxed flex gap-4">
                                   <div className="size-1.5 bg-red-400 rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                                   {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Keyword Analysis */}
                <div className="p-10 rounded-[40px] glass space-y-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold tracking-tight">Critical Keywords Analysis</h3>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Add these to boost score</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {result.missingKeywords.map((k, i) => (
                            <span key={i} className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-default">
                                + {k}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Structure Analysis */}
                <div className="p-10 rounded-[40px] bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/10 space-y-8 shadow-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <FileText className="size-6 text-indigo-400" /> Structure & Formatting
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.formattingTips.map((tip, i) => (
                            <div key={i} className="flex gap-4 items-start p-5 glass rounded-2xl border-white/5 hover:border-white/10 transition-all group">
                                <ArrowRight className="size-4 text-indigo-400 mt-1 shrink-0 group-hover:translate-x-1 transition-transform" />
                                <span className="text-xs font-bold text-slate-300 leading-relaxed">{tip}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>

          <div className="flex justify-center pb-20 pt-8">
              <button 
                onClick={() => setResult(null)}
                className="group flex items-center gap-3 text-slate-500 hover:text-white font-black uppercase text-xs tracking-[0.3em] transition-all"
              >
                  Restart Audit <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
