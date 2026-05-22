import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import {
  createUser,
  getResumesByUserId,
  getUserByEmail,
  getUserById,
} from "../lib/db-adapter.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
const googleClient = new OAuth2Client();
let googleCertWarmup = null;

function getGoogleClientId() {
  const raw = process.env.GOOGLE_CLIENT_ID || "";

  const value = String(raw || "").trim();
  if (!value) return "";

  // Ignore template placeholders.
  const lower = value.toLowerCase();
  if (
    lower.includes("your_google_oauth_web_client_id") ||
    lower.includes("my_google_client_id") ||
    lower.includes("example") ||
    !value.endsWith(".apps.googleusercontent.com")
  ) {
    return "";
  }

  return value;
}

function warmGoogleVerificationCerts() {
  if (!getGoogleClientId()) return Promise.resolve();
  if (!googleCertWarmup) {
    googleCertWarmup = googleClient.getFederatedSignonCertsAsync().catch((error) => {
      googleCertWarmup = null;
      console.debug("Google cert warmup failed:", error.message);
    });
  }
  return googleCertWarmup;
}

async function issueGoogleSession(payload) {
  if (!payload?.email) {
    throw new Error("Google account email is unavailable");
  }

  if (payload.email_verified === false) {
    const error = new Error("Google email is not verified");
    error.status = 401;
    throw error;
  }

  const email = payload.email.toLowerCase();
  let user = await getUserByEmail(email);

  if (!user) {
    const fallbackPassword = crypto.randomBytes(24).toString("hex");
    const hashedPassword = await bcrypt.hash(fallbackPassword, 10);
    const name = payload.name || email.split("@")[0];
    user = await createUser(email, hashedPassword, name);
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

function getUserFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

router.get("/google/config", (req, res) => {
  const clientId = getGoogleClientId();
  if (clientId) warmGoogleVerificationCerts();
  res.json({
    enabled: Boolean(clientId),
  });
});

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(email, hashedPassword, name);
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return res.status(400).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    let isValid = false;
    const looksHashed = typeof user.password === "string" && user.password.startsWith("$2");

    if (looksHashed) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Local dev fallback for seed users with plain-text placeholder passwords.
      isValid = password === user.password;
    }

    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email, name: user.name } });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const clientId = getGoogleClientId();
    if (!clientId) {
      return res.status(500).json({
        error: "Google login is not configured. Set GOOGLE_CLIENT_ID in your server environment.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const session = await issueGoogleSession(ticket.getPayload());

    res.json(session);
  } catch (error) {
    console.error("Google auth error:", error.message || error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const decoded = getUserFromToken(req.headers.authorization);
    const userId = decoded?.id || 1;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const resumes = await getResumesByUserId(user.id);
    const analyzedResumes = resumes.filter((resume) => resume.ats_score != null || resume.atsScore != null).length;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at || user.createdAt,
      },
      plan: {
        name: "Pro Plan",
        tier: "Premium Member",
        auditsEnabled: true,
        totalResumes: resumes.length,
        analyzedResumes,
      },
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
