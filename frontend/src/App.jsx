/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { JobMatcherPage } from './pages/JobMatcherPage';
import { ResumeBuilderPage } from './pages/ResumeBuilderPage';
import { AIInterviewPage } from './pages/AIInterviewPage';
import { JobApplicationDashboard } from './pages/JobApplicationDashboard';
import { VoiceInterviewPage } from './pages/VoiceInterviewPage';
import { PrivacyScannerPage } from './pages/PrivacyScannerPage';
import { SkillRoadmapPage } from './pages/SkillRoadmapPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Router>
      <MainLayout>
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
      </MainLayout>
    </Router>
  );
}

