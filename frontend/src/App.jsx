/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage').then((module) => ({ default: module.ResumeAnalyzerPage })));
const JobMatcherPage = lazy(() => import('./pages/JobMatcherPage').then((module) => ({ default: module.JobMatcherPage })));
const ResumeBuilderPage = lazy(() => import('./pages/ResumeBuilderPage').then((module) => ({ default: module.ResumeBuilderPage })));
const AIInterviewPage = lazy(() => import('./pages/AIInterviewPage').then((module) => ({ default: module.AIInterviewPage })));
const JobApplicationDashboard = lazy(() => import('./pages/JobApplicationDashboard').then((module) => ({ default: module.JobApplicationDashboard })));
const VoiceInterviewPage = lazy(() => import('./pages/VoiceInterviewPage').then((module) => ({ default: module.VoiceInterviewPage })));
const PrivacyScannerPage = lazy(() => import('./pages/PrivacyScannerPage').then((module) => ({ default: module.PrivacyScannerPage })));
const SkillRoadmapPage = lazy(() => import('./pages/SkillRoadmapPage').then((module) => ({ default: module.SkillRoadmapPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <MainLayout>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analyzer" element={<ResumeAnalyzerPage />} />
            <Route path="/ats-checker" element={<ResumeAnalyzerPage />} />
            <Route path="/job-match" element={<JobMatcherPage />} />
            <Route path="/builder" element={<ResumeBuilderPage />} />
            <Route path="/interview" element={<AIInterviewPage />} />
            <Route path="/voice-interview" element={<VoiceInterviewPage />} />
            <Route path="/applications" element={<JobApplicationDashboard />} />
            <Route path="/privacy-scanner" element={<PrivacyScannerPage />} />
            <Route path="/skill-roadmap" element={<SkillRoadmapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </Router>
  );
}

