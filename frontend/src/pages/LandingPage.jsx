import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Rocket, Shield, Target, FileText, CheckCircle2, ChevronRight, Star, Sparkles, ArrowRight } from 'lucide-react';

export const LandingPage = () => {
  const [heroTilt, setHeroTilt] = useState({ x: "8deg", y: "-10deg" });
  const heroTags = [
    { label: "RESUME", className: "left-0 top-[42%] xl:-left-6" },
    { label: "JOBS", className: "right-0 top-[33%] xl:-right-5" },
    { label: "ATS", className: "right-[7%] top-[70%]" },
    { label: "LEADERSHIP", className: "left-[5%] top-[72%]" },
    { label: "AI", className: "right-[28%] bottom-[2%]" },
  ];

  const updateHeroTilt = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setHeroTilt({
      x: `${(-y * 10 + 6).toFixed(2)}deg`,
      y: `${(x * 12 - 8).toFixed(2)}deg`,
    });
  };

  return (
    <div className="cyber-landing-shell min-h-screen text-slate-100 selection:bg-cyan-400/30 font-sans overflow-x-hidden relative scene-3d">
      <div className="cyber-grid cyber-landing-grid" aria-hidden="true" />
      <div className="cyber-vignette cyber-landing-vignette" aria-hidden="true" />
      <div className="cyber-circuit cyber-landing-circuit cyber-landing-circuit-outer" aria-hidden="true" />
      <div className="cyber-circuit cyber-landing-circuit cyber-landing-circuit-inner" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-top-left cyber-landing-trace" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-top-right cyber-landing-trace" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-bottom-left cyber-landing-trace" aria-hidden="true" />
      <div className="cyber-trace cyber-trace-bottom-right cyber-landing-trace" aria-hidden="true" />
      {[
        ["9%", "23%"],
        ["21%", "82%"],
        ["31%", "16%"],
        ["47%", "78%"],
        ["63%", "22%"],
        ["78%", "66%"],
        ["89%", "30%"],
        ["94%", "78%"],
      ].map(([left, top], index) => (
        <span
          key={`${left}-${top}`}
          className="cyber-node cyber-landing-node"
          style={{ "--node-left": left, "--node-top": top, animationDelay: `${index * -0.4}s` }}
          aria-hidden="true"
        />
      ))}
      {/* Decorative Background Elements */}
      <div className="absolute right-[-18rem] top-[-20rem] h-[720px] w-[720px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute left-[-16rem] top-[14rem] h-[560px] w-[560px] rounded-full bg-cyan-500/8 blur-[145px] pointer-events-none" />
      <div className="absolute inset-x-0 top-[40rem] h-72 depth-grid pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/8 bg-[#080713]/70 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="cyber-brand-mark flex size-11 items-center justify-center rounded-2xl ring-1 ring-cyan-200/20">
              <Rocket className="size-6 text-white" />
            </div>
            <span className="cyber-brand-text text-2xl font-black uppercase tracking-tight italic">
              Resu<span className="text-cyan-200">Match</span>
            </span>
          </Link>
          <div className="hidden items-center gap-9 text-[12px] font-black uppercase tracking-[0.22em] text-slate-400 lg:flex">
            <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Architecture</a>
            <Link to="/analyzer" className="hover:text-white transition-colors">ATS Auditor</Link>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link to="/login" className="hidden text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-white sm:inline">Login</Link>
            <Link to="/login" className="cyber-landing-primary rounded-2xl border px-5 py-3 text-xs font-black uppercase tracking-widest transition-all hover:-translate-y-0.5 active:translate-y-0">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-5 pb-16 pt-32 sm:px-8 lg:pb-24 lg:pt-36">
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.9fr)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/18 bg-white/[0.045] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200 shadow-xl shadow-cyan-500/5 backdrop-blur-2xl tile-3d holo-sheen">
              <Sparkles className="size-4 animate-pulse" /> Neural ATS Analysis Engine
            </div>
            <h1 className="text-5xl font-black uppercase italic leading-[0.86] tracking-tight text-white sm:text-6xl md:text-7xl xl:text-8xl">
              Beat the <br />
              <span className="bg-gradient-to-r from-cyan-100 via-cyan-300 to-[#dff6ff] bg-clip-text text-transparent">Algorithms</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-slate-400 sm:text-xl lg:mx-0">
              Industry-standard AI intelligence platform for professional resume auditing and strategic career alignment.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <Link to="/analyzer" className="cyber-landing-primary group flex w-full items-center justify-center gap-3 rounded-2xl px-9 py-5 text-xs font-black uppercase tracking-[0.18em] transition-all hover:-translate-y-1 active:translate-y-0 sm:w-auto">
                Analyze Resume <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/builder" className="cyber-landing-secondary w-full rounded-2xl border px-9 py-5 text-xs font-black uppercase tracking-[0.18em] shadow-2xl backdrop-blur-2xl transition-all hover:-translate-y-1 active:translate-y-0 sm:w-auto">
                Build Resume
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="relative mx-auto min-h-[420px] w-full max-w-[560px] scene-3d sm:min-h-[480px] lg:min-h-[520px]"
          >
            <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/7 blur-[105px]" />
            <div className="absolute left-[54%] top-[54%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/9 blur-[115px]" />
            <div className="absolute right-10 top-28 scale-[0.52] opacity-80 ai-orb sm:scale-[0.64] lg:scale-[0.72]" />
            <div className="absolute right-14 top-32 h-1 w-24 scanner-line opacity-45 sm:w-32" />
            <div className="absolute left-10 bottom-16 w-40 h-52 doc-stack-3d hidden opacity-35 md:block">
              <span />
              <span />
              <span />
            </div>
            {heroTags.map((tag) => (
              <span
                key={tag.label}
                className={`absolute z-10 hidden min-w-[86px] justify-center rounded-full border border-cyan-300/18 bg-slate-950/50 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100 shadow-xl shadow-cyan-950/20 backdrop-blur-xl skill-orbit lg:inline-flex ${tag.className}`}
              >
                {tag.label}
              </span>
            ))}
            <div
              onMouseMove={updateHeroTilt}
              onMouseLeave={() => setHeroTilt({ x: "8deg", y: "-10deg" })}
              style={{ "--tilt-x": heroTilt.x, "--tilt-y": heroTilt.y }}
              className="absolute left-1/2 top-1/2 z-20 w-[84%] max-w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-white/10 bg-white/[0.05] p-3.5 shadow-2xl shadow-black/35 backdrop-blur-2xl resume-float-card sm:max-w-[360px]"
            >
              <div className="rounded-[24px] bg-slate-50/95 p-5 text-slate-950 shadow-xl shadow-black/10 resume-paper-3d sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-black tracking-tight">John Doe</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-600">AI Product Engineer</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-500 px-3.5 py-2.5 text-center text-slate-950 shadow-xl shadow-cyan-300/50">
                    <p className="text-xl font-black">94</p>
                    <p className="text-[9px] font-black uppercase tracking-widest">ATS</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {[82, 96, 68, 88].map((width, index) => (
                    <div key={index} className="h-2.5 rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-[#00bfff] to-[#dff6ff]" style={{ width: `${width}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2.5">
                  {["AI Resume Audit", "Keyword Match", "PDF Export", "Smart Builder"].map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-100 px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Proof Section */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7 }}
        className="py-24 border-y border-white/5 glass relative z-10 reveal-3d"
      >
         <div className="max-w-7xl mx-auto px-8">
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-16">Trusted for top-tier role acquisition</p>
           <div className="flex flex-wrap justify-between items-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
              <span className="text-3xl font-black tracking-tighter uppercase italic">Google</span>
              <span className="text-3xl font-black tracking-tighter uppercase italic">Stripe</span>
              <span className="text-3xl font-black tracking-tighter uppercase italic">Amazon</span>
              <span className="text-3xl font-black tracking-tighter uppercase italic">Meta</span>
              <span className="text-3xl font-black tracking-tighter uppercase italic">Netflix</span>
           </div>
         </div>
      </motion.section>

      {/* Architecture */}
      <motion.section
        id="how-it-works"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.75 }}
        className="relative z-10 px-8 py-28 reveal-3d"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-200 glass">
                <Star className="size-4" /> Product Architecture
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tight md:text-6xl">
                Resume workflow, <span className="text-cyan-300">end to end</span>
              </h2>
            </div>
            <p className="max-w-md text-lg font-medium leading-relaxed text-slate-400">
              A clean path from upload to ATS insight, guided edits, and export-ready resume output.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              { icon: FileText, title: "Upload", desc: "Import a resume and target role without leaving the app." },
              { icon: Sparkles, title: "Analyze", desc: "AI reviews structure, keywords, gaps, and recruiter signals." },
              { icon: Target, title: "Optimize", desc: "Prioritized fixes help tune the resume for matching systems." },
              { icon: CheckCircle2, title: "Export", desc: "Move into the builder and generate polished resume output." },
            ].map((step, index) => (
              <div key={step.title} className="group rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2 hover:border-cyan-300/30 hover:bg-white/[0.08] tile-3d">
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 shadow-xl shadow-cyan-500/10">
                    <step.icon className="size-6 text-cyan-200" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-600">0{index + 1}</span>
                </div>
                <h3 className="mb-3 text-xl font-black uppercase italic tracking-tight text-white">{step.title}</h3>
                <p className="text-sm font-medium leading-relaxed text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        id="features"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.18 }}
        transition={{ duration: 0.75 }}
        className="py-32 px-8 relative z-10 reveal-3d"
      >
         <div className="max-w-7xl mx-auto space-y-24">
            <div className="text-center space-y-4">
               <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tight">Intelligence <span className="text-cyan-300">Framework</span></h2>
               <p className="text-slate-400 font-medium max-w-2xl mx-auto">Advanced engineering for the modern professional job seeker.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
               {[
                 { icon: Shield, title: 'Strategic Privacy', desc: 'Enterprise-grade encryption for your professional assets.' },
                 { icon: Target, title: 'Contextual Fit', desc: 'Deep alignment analysis against target role descriptions.' },
                 { icon: FileText, title: 'Performance', desc: 'Bypass legacy filtering systems with optimized semantics.' },
               ].map((f, i) => (
                 <div key={i} className="p-10 rounded-[40px] glass-light border-white/5 hover:border-indigo-500/20 transition-all group tile-3d">
                    <div className="size-16 rounded-2xl bg-indigo-500/5 flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                       <f.icon className="size-8 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">{f.title}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/5 glass relative z-10">
         <div className="max-w-4xl mx-auto text-center space-y-16">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9]">Ready to <span className="text-cyan-300 underline underline-offset-8 decoration-cyan-200/20">Scale</span> Your Career?</h2>
            <Link to="/analyzer" className="cyber-landing-primary inline-flex items-center gap-4 px-16 py-7 rounded-[40px] font-black uppercase text-xl tracking-widest transition-all active:scale-95 group">
                Enter Interface <ArrowRight className="size-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
               <p>© 2026 ResuMatch AI // Protocol Loaded</p>
               <div className="flex gap-10">
                  <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
                  <a href="#how-it-works" className="hover:text-white transition-colors">Architecture</a>
                  <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};
