import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

export const JobApplicationDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    jobUrl: '',
    jobDescription: '',
    resumeId: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appRes, statsRes] = await Promise.all([
        apiFetch('/api/jobs/applications'),
        apiFetch('/api/jobs/analytics/dashboard'),
      ]);

      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData.applications || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load job applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/jobs/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to add job application');
      }

      setFormData({
        jobTitle: '',
        company: '',
        jobUrl: '',
        jobDescription: '',
        resumeId: '',
        notes: '',
      });
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error('Error adding job application:', error);
      alert('Failed to add job application');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;

    try {
      const response = await apiFetch(`/api/jobs/applications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete application');
      }

      await loadData();
    } catch (error) {
      console.error('Error deleting application:', error);
      alert('Failed to delete application');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'applied':
        return <Clock className="size-5 text-blue-400" />;
      case 'interviewing':
        return <TrendingUp className="size-5 text-yellow-400" />;
      case 'rejected':
        return <XCircle className="size-5 text-red-400" />;
      case 'offer':
        return <Award className="size-5 text-green-400" />;
      default:
        return <Briefcase className="size-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-500/10 text-blue-200 border-blue-300/20';
      case 'interviewing':
        return 'bg-yellow-500/10 text-yellow-200 border-yellow-300/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-200 border-red-300/20';
      case 'offer':
        return 'bg-green-500/10 text-green-200 border-green-300/20';
      default:
        return 'bg-slate-500/10 text-slate-200 border-slate-300/20';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-700/50 rounded-lg" />
          <div className="h-40 bg-slate-700/50 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-200 font-bold text-xs uppercase tracking-widest border border-cyan-300/20"
        >
          <Briefcase className="size-4" /> Job Application Tracker
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          Application <span className="text-cyan-300">Health Dashboard</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Track your job applications and monitor match rates across different resume versions.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
        >
          <div className="p-4 rounded-2xl glass border border-white/10 text-center">
            <p className="text-slate-400 text-sm font-medium">Total</p>
            <p className="text-3xl font-bold text-cyan-300 mt-2">{stats.totalApplications}</p>
          </div>
          <div className="p-4 rounded-2xl glass border border-white/10 text-center">
            <p className="text-slate-400 text-sm font-medium">Applied</p>
            <p className="text-3xl font-bold text-blue-300 mt-2">{stats.byStatus.applied}</p>
          </div>
          <div className="p-4 rounded-2xl glass border border-white/10 text-center">
            <p className="text-slate-400 text-sm font-medium">Interviewing</p>
            <p className="text-3xl font-bold text-yellow-300 mt-2">{stats.byStatus.interviewing}</p>
          </div>
          <div className="p-4 rounded-2xl glass border border-white/10 text-center">
            <p className="text-slate-400 text-sm font-medium">Offers</p>
            <p className="text-3xl font-bold text-green-300 mt-2">{stats.byStatus.offer}</p>
          </div>
          <div className="p-4 rounded-2xl glass border border-white/10 text-center">
            <p className="text-slate-400 text-sm font-medium">Avg Match</p>
            <p className="text-3xl font-bold text-purple-300 mt-2">{stats.averageMatchRate}%</p>
          </div>
        </motion.div>
      )}

      {/* Add Application Button */}
      <motion.button
        onClick={() => setShowForm(!showForm)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all"
      >
        <Plus className="size-5" />
        Add Job Application
      </motion.button>

      {/* Add Application Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl glass border border-cyan-300/20 space-y-4"
        >
          <h3 className="text-xl font-bold">New Job Application</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Job Title *"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40"
              />
              <input
                type="text"
                placeholder="Company *"
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40"
              />
            </div>
            <input
              type="url"
              placeholder="Job URL *"
              required
              value={formData.jobUrl}
              onChange={(e) => setFormData({ ...formData, jobUrl: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40"
            />
            <textarea
              placeholder="Job Description (paste here for match analysis)"
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40 h-24 resize-none"
            />
            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300/40 h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all"
              >
                Add Application
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Applications List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Applications</h2>
        {applications.length === 0 ? (
          <div className="p-8 rounded-2xl glass border border-white/10 text-center text-slate-400">
            No job applications yet. Add one to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <motion.div
                key={app._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 rounded-xl glass border border-white/10 hover:border-cyan-300/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{app.jobTitle}</h3>
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{app.company}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        <span className="capitalize">{app.status}</span>
                      </div>
                      {app.matchRate && (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-200 border border-purple-300/20 text-sm font-medium">
                          <TrendingUp className="size-4" />
                          {app.matchRate}% Match
                        </div>
                      )}
                      {app.notes && (
                        <p className="text-xs text-slate-400">Note: {app.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(app._id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-all text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
