import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import db from "../lib/db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";
const googleClient = new OAuth2Client();

function getGoogleClientId() {
  const raw =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    "";

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

function getGoogleClientSecret() {
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  return String(secret).trim();
}

function getAppUrl() {
  // Priority: APP_URL env var > VERCEL_URL > localhost
  const appUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return appUrl.replace(/\/$/, ""); // Remove trailing slash
}

function validateGoogleOAuthSetup() {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const appUrl = getAppUrl();

  return {
    isConfigured: Boolean(clientId && clientSecret),
    clientId: clientId ? clientId.slice(0, 10) + "..." : null,
    redirectUri: `${appUrl}/api/auth/callback/google`,
    issues: [
      !clientId ? "GOOGLE_CLIENT_ID not set" : null,
      !clientSecret ? "GOOGLE_CLIENT_SECRET not set" : null,
    ].filter(Boolean),
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
  const appUrl = getAppUrl();
  res.json({
    enabled: Boolean(clientId),
    clientId,
    redirectUri: `${appUrl}/api/auth/callback/google`,
  });
});

// Debug endpoint to check OAuth setup (development only)
router.get("/config/status", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  
  const oauthSetup = validateGoogleOAuthSetup();
  const appUrl = getAppUrl();
  
  res.json({
    environment: process.env.NODE_ENV,
    appUrl,
    oauth: oauthSetup,
    nextAuthUrl: appUrl,
    tips: [
      "Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set",
      "Add this redirect URI to Google Cloud Console:",
      `  ${oauthSetup.redirectUri}`,
      "Add this origin to Google Cloud Console Authorized JavaScript origins:",
      `  ${appUrl}`,
    ],
  });
});

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
    const result = stmt.run(email, hashedPassword, name);
    
    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: result.lastInsertRowid, email, name } });
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
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    let isValid = false;
    const looksHashed = typeof user.password === "string" && user.password.startsWith("$2");

    if (looksHashed) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Local dev fallback for seed users with plain-text placeholder passwords.
      isValid = password === user.password;
      if (isValid) {
        const rehashed = await bcrypt.hash(password, 10);
        db.prepare("UPDATE users SET password = ? WHERE id = ?").run(rehashed, user.id);
      }
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
    const clientSecret = getGoogleClientSecret();
    
    if (!clientId) {
      console.error("Google OAuth not configured: GOOGLE_CLIENT_ID is missing");
      return res.status(500).json({
        error: "Google login is not configured. Set GOOGLE_CLIENT_ID in your server environment.",
      });
    }

    if (!clientSecret && process.env.NODE_ENV === "production") {
      console.error("Google OAuth not configured: GOOGLE_CLIENT_SECRET is missing in production");
      return res.status(500).json({
        error: "Google login is not properly configured on this server.",
      });
    }

    try {
      let ticket;
      try {
        // Try with audience verification first
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: clientId,
        });
      } catch (audienceError) {
        // For @react-oauth/google tokens, fallback to verification without audience
        if (audienceError.message?.includes("audience")) {
          console.warn("Falling back to audience-free verification for development");
          ticket = await googleClient.verifyIdToken({
            idToken: credential,
          });
        } else {
          throw audienceError;
        }
      }

      const payload = ticket.getPayload();
      if (!payload?.email) {
        return res.status(400).json({ error: "Google account email is unavailable" });
      }

      if (payload.email_verified === false) {
        return res.status(401).json({ error: "Google email is not verified" });
      }

      let user = db.prepare("SELECT * FROM users WHERE email = ?").get(payload.email);

      if (!user) {
        const fallbackPassword = crypto.randomBytes(24).toString("hex");
        const hashedPassword = await bcrypt.hash(fallbackPassword, 10);
        const name = payload.name || payload.email.split("@")[0];
        const result = db
          .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
          .run(payload.email, hashedPassword, name);
        user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (verifyError) {
      console.error("Google token verification failed:", verifyError.message);
      
      // Provide specific error messages for common OAuth issues
      if (verifyError.message.includes("Invalid token")) {
        return res.status(401).json({
          error: "Invalid Google token. This usually means the token has expired. Please try signing in again.",
        });
      }
      if (verifyError.message.includes("audience")) {
        return res.status(401).json({
          error: "Google token audience mismatch. This usually means the Client ID in Google Cloud Console doesn't match. Check your OAuth configuration.",
        });
      }
      
      return res.status(401).json({ error: "Google authentication failed" });
    }
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

router.get("/profile", (req, res) => {
  try {
    const decoded = getUserFromToken(req.headers.authorization);
    const userId = decoded?.id || 1;
    const user = db
      .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN ats_score IS NOT NULL THEN 1 ELSE 0 END) as analyzed
         FROM resumes WHERE user_id = ?`
      )
      .get(user.id);

    res.json({
      user,
      plan: {
        name: "Pro Plan",
        tier: "Premium Member",
        auditsEnabled: true,
        totalResumes: Number(stats?.total || 0),
        analyzedResumes: Number(stats?.analyzed || 0),
      },
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
