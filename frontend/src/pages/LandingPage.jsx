import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Rocket, Shield, Target, FileText, CheckCircle2, ChevronRight, Star, Sparkles, ArrowRight } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0a0514] text-slate-100 selection:bg-indigo-500/30 font-sans overflow-x-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -ml-72 -mb-72 pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0514]/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
              <Rocket className="size-6 text-white" />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter italic">Resu<span className="text-indigo-400">Match</span></span>
          </div>
          <div className="hidden md:flex items-center gap-12 text-sm font-black uppercase tracking-widest text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Intelligence</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Architecture</a>
            <Link to="/analyzer" className="hover:text-white transition-colors">ATS Auditor</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Login</Link>
            <Link to="/builder" className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-8">
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-12"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
              <Sparkles className="size-4 animate-pulse" /> Neural ATS Analysis Engine
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] mb-8 uppercase italic">
              Beat the <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Algorithms</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
              Industry-standard AI intelligence platform for professional resume auditing and strategic career alignment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link to="/analyzer" className="w-full sm:w-auto bg-slate-100 text-black px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-3xl">
                Initialize Audit <ChevronRight className="size-5" />
              </Link>
              <Link to="/builder" className="w-full sm:w-auto glass-light border border-white/10 px-12 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-white">
                Build Prototype
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="mt-32 relative max-w-5xl mx-auto"
          >
            <div className="absolute -inset-4 bg-indigo-500/20 rounded-[48px] blur-3xl opacity-30 animate-pulse" />
            <div className="relative glass p-4 md:p-10 rounded-[64px] border-white/10 shadow-3xl overflow-hidden">
               <div className="aspect-[16/9] bg-[#0a0514]/40 rounded-[40px] overflow-hidden flex items-center justify-center border border-white/5 glass-light relative">
                  {/* Mock Analysis Dashboard */}
                  <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-3 gap-10 p-12 lg:p-20">
                     <div className="col-span-2 space-y-10">
                        <div className="space-y-4">
                           <div className="h-6 bg-white/10 rounded-full w-2/3 animate-pulse" />
                           <div className="h-2 bg-white/5 rounded-full w-1/2" />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                           <div className="p-8 glass rounded-[40px] border-white/10 flex flex-col items-center justify-center space-y-4 group">
                               <div className="size-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
                                   <Target className="size-8 text-indigo-400" />
                               </div>
                               <div className="text-center">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Synergy</p>
                                  <p className="font-bold text-slate-200">92% Match</p>
                               </div>
                           </div>
                           <div className="p-8 glass rounded-[40px] border-white/10 flex flex-col items-center justify-center space-y-4 group">
                               <div className="size-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
                                   <Sparkles className="size-8 text-purple-400" />
                               </div>
                               <div className="text-center">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Keywords</p>
                                  <p className="font-bold text-slate-200">AI Driven</p>
                               </div>
                           </div>
                        </div>
                     </div>
                     <div className="flex flex-col items-center justify-center space-y-6 glass rounded-[48px] border-indigo-500/20 p-10 bg-indigo-500/5 relative">
                        <div className="absolute top-0 right-0 p-6 opacity-30">
                           <Shield className="size-8 text-indigo-400" />
                        </div>
                        <div className="relative size-40">
                           <svg className="size-full" viewBox="0 0 36 36">
                               <circle cx="18" cy="18" r="16" fill="none" stroke="#1e1b4b" strokeWidth="3" />
                               <circle cx="18" cy="18" r="16" fill="none" stroke="#6366f1" strokeWidth="3" strokeDasharray="100, 100" strokeDashoffset="18" strokeLinecap="round" transform="rotate(-90 18 18)" />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-5xl font-black tracking-tighter">82</span>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">ATS Readiness</span>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-24 border-y border-white/5 glass relative z-10">
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
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-8 relative z-10">
         <div className="max-w-7xl mx-auto space-y-24">
            <div className="text-center space-y-4">
               <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tight">Intelligence <span className="text-indigo-400">Framework</span></h2>
               <p className="text-slate-400 font-medium max-w-2xl mx-auto">Advanced engineering for the modern professional job seeker.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
               {[
                 { icon: Shield, title: 'Strategic Privacy', desc: 'Enterprise-grade encryption for your professional assets.' },
                 { icon: Target, title: 'Contextual Fit', desc: 'Deep alignment analysis against target role descriptions.' },
                 { icon: FileText, title: 'Performance', desc: 'Bypass legacy filtering systems with optimized semantics.' },
               ].map((f, i) => (
                 <div key={i} className="p-10 rounded-[40px] glass-light border-white/5 hover:border-indigo-500/20 transition-all group">
                    <div className="size-16 rounded-2xl bg-indigo-500/5 flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 transition-transform">
                       <f.icon className="size-8 text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">{f.title}</h3>
                    <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/5 glass relative z-10">
         <div className="max-w-4xl mx-auto text-center space-y-16">
            <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9]">Ready to <span className="text-indigo-400 underline underline-offset-8 decoration-white/10">Scale</span> Your Career?</h2>
            <Link to="/analyzer" className="inline-flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white px-16 py-7 rounded-[40px] font-black uppercase text-xl tracking-widest shadow-3xl shadow-indigo-500/30 transition-all active:scale-95 group">
                Enter Interface <ArrowRight className="size-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
               <p>© 2026 ResuMatch AI // Protocol Loaded</p>
               <div className="flex gap-10">
                  <a href="#" className="hover:text-white transition-colors">Intelligence</a>
                  <a href="#" className="hover:text-white transition-colors">Terminal</a>
                  <a href="#" className="hover:text-white transition-colors">Repository</a>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};
