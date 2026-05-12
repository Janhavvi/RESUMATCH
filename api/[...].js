import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../routes/auth.js';
import resumeRoutes from '../routes/resume.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ limit: '3mb', extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/resume', resumeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Vercel serverless handler
export default app;

// Vercel configuration
export const config = {
  runtime: "nodejs"
}