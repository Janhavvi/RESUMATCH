import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), "data.db");
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    blob_url TEXT,
    analysis TEXT,
    ats_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS job_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    resume_id INTEGER NOT NULL,
    job_description TEXT NOT NULL,
    match_score INTEGER,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(resume_id) REFERENCES resumes(id)
  );
`);

// Run migrations for existing databases
try {
  // Add blob_url column if it doesn't exist
  const columns = db.prepare("PRAGMA table_info(resumes)").all();
  const hasBlobUrl = columns.some(col => col.name === 'blob_url');
  if (!hasBlobUrl) {
    console.log("📦 Running migration: Adding blob_url column to resumes table...");
    db.exec("ALTER TABLE resumes ADD COLUMN blob_url TEXT;");
  }
} catch (error) {
  // Migration errors are non-fatal (column might already exist)
  console.debug("Migration info:", error.message);
}

// Ensure local development always has a default user for FK-linked data.
db.prepare(`
  INSERT OR IGNORE INTO users (id, email, password, name)
  VALUES (1, 'demo@local', 'local-dev-user', 'Demo User')
`).run();

export default db;
