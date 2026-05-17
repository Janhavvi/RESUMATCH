import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import net from "net";
import resumeRoutes from "./routes/resume.js";
import authRoutes from "./routes/auth.js";
import { initializeDatabase } from "./lib/db-adapter.js";

// Load environment variables from root directory
dotenv.config({ path: "../.env" });
// Local convenience fallback when .env is missing
dotenv.config({ path: "../.env.example", override: false });

// Ensure uploads directory exists. Render can mount this path on a persistent disk.
const uploadsDir = process.env.UPLOAD_DIR || "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortAvailable(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester
      .once("error", (err) => {
        if (err.code === "EADDRINUSE" || err.code === "EACCES") {
          resolve(false);
          return;
        }
        resolve(false);
      })
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

async function findAvailablePort(startPort, host = "0.0.0.0") {
  let port = startPort;
  while (!(await isPortAvailable(port, host))) {
    port += 1;
  }
  return port;
}

async function startServer() {
  const app = express();
  const preferredPort = Number(process.env.PORT || 3000);
  const preferredHmrPort = Number(process.env.HMR_PORT || 24678);

  const PORT = await findAvailablePort(preferredPort);
  const hmrPort = await findAvailablePort(preferredHmrPort, "127.0.0.1");

  if (PORT !== preferredPort) {
    console.warn(`Port ${preferredPort} is busy, using ${PORT} instead.`);
  }

  if (hmrPort !== preferredHmrPort) {
    console.warn(`HMR port ${preferredHmrPort} is busy, using ${hmrPort} instead.`);
  }

  // Initialize database (MongoDB or SQLite)
  await initializeDatabase();

  app.use(cors());
  
  // Configure JSON/URL-encoded body size limits
  // Vercel's serverless function limit: 4.5MB for entire request
  // We use 3MB as a safe buffer
  const bodySizeLimit = process.env.NODE_ENV === "production" ? "3mb" : "50mb";
  app.use(express.json({ limit: bodySizeLimit }));
  app.use(express.urlencoded({ limit: bodySizeLimit, extended: true }));

  // Error handling middleware for request size exceeded
  app.use((err, req, res, next) => {
    if (err.status === 413 || err.message.includes("too large")) {
      return res.status(413).json({
        error: "Request body too large. For large file uploads, please use smaller files or upload directly to cloud storage.",
      });
    }
    next(err);
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/resume", resumeRoutes);
  app.use("/api/auth", authRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        root: path.join(__dirname, "../frontend"),
        server: {
          middlewareMode: true,
          hmr: {
            host: "127.0.0.1",
            port: hmrPort,
            protocol: "ws",
          },
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("✓ Vite middleware initialized");
    } catch (viteError) {
      console.warn("⚠️  Vite middleware failed, using static fallback:", viteError.message);
      // Continue without Vite if it fails
    }
  } else {
    const distPath = path.join(__dirname, "../frontend/dist");
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      app.get("*", (req, res) => {
        res.status(404).json({ error: "Frontend is deployed separately. Use /api routes on this service." });
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Global error handlers
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
