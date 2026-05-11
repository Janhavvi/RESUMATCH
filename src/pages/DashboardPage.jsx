import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  FileText,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  WandSparkles,
  History,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function parseAnalysis(raw) {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function scoreFromResume(r) {
  if (typeof r.ats_score === "number") return r.ats_score;
  const parsed = parseAnalysis(r.analysis);
  if (typeof parsed?.atsScore === "number") return parsed.atsScore;
  return null;
}

function qualityFromScore(score) {
  if (score == null) return "Pending";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  return "Needs Polish";
}

function qualityClass(status) {
  if (status === "Excellent")
    return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
  if (status === "Good")
    return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
  if (status === "Pending")
    return "bg-slate-500/10 border-slate-500/30 text-slate-300";
  return "bg-red-500/10 border-red-500/30 text-red-500";
}

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllRows, setShowAllRows] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [rewriteText, setRewriteText] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/resume/all");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const rows = await res.json();
        setResumes(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setError(e.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const normalized = useMemo(() => {
    return resumes
      .map((r) => {
        const analysis = parseAnalysis(r.analysis);
        const score = scoreFromResume(r);
        return {
          ...r,
          analysis,
          score,
          createdAt: r.created_at ? new Date(r.created_at) : null,
        };
      })
      .sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.getTime() : 0;
        const tb = b.createdAt ? b.createdAt.getTime() : 0;
        return tb - ta;
      });
  }, [resumes]);

  const analyzed = useMemo(
    () => normalized.filter((r) => typeof r.score === "number"),
    [normalized]
  );

  const averageScore = useMemo(() => {
    if (!analyzed.length) return 0;
    const sum = analyzed.reduce((acc, r) => acc + r.score, 0);
    return Math.round(sum / analyzed.length);
  }, [analyzed]);

  const pendingCount = useMemo(
    () => normalized.filter((r) => r.score == null).length,
    [normalized]
  );

  const latest = normalized[0] || null;

  const alerts = useMemo(() => {
    const a = latest?.analysis;
    if (!a) return [];
    const items = [
      ...(Array.isArray(a.weaknesses) ? a.weaknesses.slice(0, 2) : []),
      ...(Array.isArray(a.formattingTips) ? a.formattingTips.slice(0, 1) : []),
    ];
    return items.filter(Boolean);
  }, [latest]);

  const tipsCount = useMemo(() => {
    if (!latest?.analysis) return 0;
    const a = latest.analysis;
    return (
      (Array.isArray(a.missingKeywords) ? a.missingKeywords.length : 0) +
      (Array.isArray(a.weaknesses) ? a.weaknesses.length : 0) +
      (Array.isArray(a.formattingTips) ? a.formattingTips.length : 0)
    );
  }, [latest]);

  const trendData = useMemo(() => {
    const last = analyzed.slice(0, 7).reverse();
    return last.map((r) => ({
      name: r.createdAt ? dayFmt.format(r.createdAt) : "N/A",
      score: r.score ?? 0,
    }));
  }, [analyzed]);

  const rowsForTable = showAllRows ? normalized : normalized.slice(0, 5);

  const optimizeBlurb = useMemo(() => {
    const missing = latest?.analysis?.missingKeywords?.[0];
    if (missing)
      return `Add "${missing}" to your resume where relevant to improve ATS match quality.`;
    if (latest?.analysis?.formattingTips?.[0]) return latest.analysis.formattingTips[0];
    return "Run a new audit to get specific, personalized optimization tips.";
  }, [latest]);

  const generateRewrite = () => {
    const a = latest?.analysis;
    if (!a) {
      setRewriteText("No analyzed resume yet. Upload and run an audit first.");
      return;
    }
    const weakness = a.weaknesses?.[0] || "bullet clarity can be improved";
    const keyword = a.missingKeywords?.[0] || "role-specific keyword";
    setRewriteText(
      `Rewrite suggestion: Start bullets with strong action verbs, add measurable impact, and include "${keyword}" naturally where experience supports it. Focus area: ${weakness}.`
    );
  };

  const goNewAudit = () => navigate("/analyzer");

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Resume Insights <span className="text-indigo-400">•</span>
          </h1>
          <p className="text-slate-400 font-medium">
            {latest
              ? `Loaded ${normalized.length} real resume records from your archive.`
              : "Upload a resume and run audit to start seeing genuine analytics."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAllRows((v) => !v)}
            className="bg-white/5 border border-white/10 text-slate-300 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <History className="size-4" />
            {showAllRows ? "Recent Only" : "History"}
          </button>
          <button
            onClick={goNewAudit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus className="size-4" /> New Audit
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Analyzed",
            value: loading ? "..." : String(normalized.length),
            icon: FileText,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
            footer: `${analyzed.length} scored resumes`,
          },
          {
            label: "Avg. Match Score",
            value: loading ? "..." : `${averageScore}%`,
            icon: BarChart3,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
            footer: analyzed.length ? "based on real audits" : "no scored audits yet",
          },
          {
            label: "Pending Audits",
            value: loading ? "..." : String(pendingCount),
            icon: Clock,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            footer: "uploaded but not analyzed",
          },
          {
            label: "Optimization Tips",
            value: loading ? "..." : String(tipsCount),
            icon: CheckCircle2,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
            footer: "from latest analysis",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-6 rounded-3xl glass-light group hover:border-indigo-500/30 transition-all relative overflow-hidden"
          >
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
                {stat.label}
              </p>
              <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                <TrendingUp className="size-3" /> {stat.footer}
              </div>
            </div>
            <div
              className={`absolute top-4 right-4 size-10 ${stat.bg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}
            >
              <stat.icon className={`size-5 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 rounded-[32px] glass flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold mb-1 tracking-tight">Performance Trends</h3>
              <p className="text-sm text-slate-500">
                ATS score trend from your recent analyzed resumes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 bg-indigo-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Score
              </span>
            </div>
          </div>
          <div className="h-[320px] w-full">
            {trendData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.03)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    dy={16}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "16px",
                      backdropFilter: "blur(12px)",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                No analyzed resumes yet. Run an audit to generate trend data.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-[32px] bg-indigo-600 shadow-2xl shadow-indigo-500/40 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 size-40 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000" />
            <h3 className="text-xl font-black mb-1 relative z-10 uppercase italic tracking-tighter">
              Optimize Now
            </h3>
            <p className="text-indigo-100 text-xs mb-6 relative z-10 leading-relaxed font-medium">
              {optimizeBlurb}
            </p>
            <button
              onClick={generateRewrite}
              className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all relative z-10 shadow-lg flex items-center justify-center gap-2"
            >
              <WandSparkles className="size-4" />
              Generate Rewrite
            </button>
            {rewriteText ? (
              <p className="mt-4 text-[11px] leading-relaxed text-white/90 bg-black/15 p-3 rounded-xl relative z-10">
                {rewriteText}
              </p>
            ) : null}
          </div>

          <div className="p-8 rounded-[32px] glass-light space-y-6">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-400">
              <AlertCircle className="size-4 text-amber-500" /> Analysis Alerts
            </h3>
            <div className="space-y-3">
              {alerts.length ? (
                alerts.map((item, i) => (
                  <div
                    key={`${item}-${i}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="size-2 bg-amber-400 rounded-full shrink-0" />
                    <span className="text-xs font-bold text-slate-300">{item}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-xs text-slate-400">
                  No alerts yet. Analyze a resume to see real findings.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-10 rounded-[40px] glass">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-bold mb-1 tracking-tight">
              Recent Resumes <span className="text-indigo-400">•</span>
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Live archive from your uploaded resumes.
            </p>
          </div>
          <button
            onClick={() => setShowAllRows((v) => !v)}
            className="text-indigo-400 text-xs font-black uppercase tracking-widest hover:text-indigo-300 transition-colors"
          >
            {showAllRows ? "Show Recent" : "View All Archive"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em] pl-6">
                  Document Name
                </th>
                <th className="pb-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                  ATS Score
                </th>
                <th className="pb-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                  Analysis Date
                </th>
                <th className="pb-6 font-black text-slate-500 uppercase text-[10px] tracking-[0.2em]">
                  Match Quality
                </th>
                <th className="pb-6 text-right pr-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rowsForTable.length ? (
                rowsForTable.map((row) => {
                  const status = qualityFromScore(row.score);
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-6 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="size-11 rounded-xl glass flex items-center justify-center transition-transform group-hover:scale-105">
                            <FileText className="size-5 text-slate-400" />
                          </div>
                          <span className="font-bold text-slate-200">
                            {row.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black">
                            {row.score ?? "--"}
                          </span>
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.score == null
                                  ? "bg-slate-500"
                                  : row.score > 80
                                    ? "bg-emerald-500"
                                    : row.score > 70
                                      ? "bg-indigo-500"
                                      : "bg-amber-500"
                              }`}
                              style={{ width: `${row.score ?? 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {row.createdAt ? dateFmt.format(row.createdAt) : "N/A"}
                      </td>
                      <td className="py-6">
                        <span
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${qualityClass(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-6 text-right pr-6">
                        <button
                          onClick={() => setSelectedResume(row)}
                          className="size-8 glass-light rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:border-white/20 transition-all"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-10 pl-6 text-slate-500 text-sm" colSpan={5}>
                    No resumes yet. Click <span className="text-slate-300 font-semibold">New Audit</span> to upload and analyze your first resume.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl glass border border-white/10 p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold">{selectedResume.filename}</h3>
                <p className="text-slate-400 text-sm mt-1">
                  ATS Score: {selectedResume.score ?? "Pending"}
                </p>
              </div>
              <button
                onClick={() => setSelectedResume(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Summary:</span>{" "}
                {selectedResume.analysis?.summary ||
                  "No analysis summary available yet."}
              </p>
              {selectedResume.analysis?.missingKeywords?.length ? (
                <p>
                  <span className="text-slate-400">Top Missing Keywords:</span>{" "}
                  {selectedResume.analysis.missingKeywords.slice(0, 6).join(", ")}
                </p>
              ) : null}
              {selectedResume.analysis?.strengths?.length ? (
                <p>
                  <span className="text-slate-400">Top Strength:</span>{" "}
                  {selectedResume.analysis.strengths[0]}
                </p>
              ) : null}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => navigate("/analyzer")}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                Open Analyzer
              </button>
              <button
                onClick={() => setSelectedResume(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
