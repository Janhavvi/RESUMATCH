import db from "./db.js";
import { connectMongoDB } from "./mongodb.js";
import { User, Resume, JobMatch } from "./models.js";

let mongoConnection = null;

export async function initializeDatabase() {
  const dbType = process.env.DB_TYPE || "sqlite";
  console.log(`📊 Using ${dbType.toUpperCase()} database`);

  if (dbType === "mongodb") {
    mongoConnection = await connectMongoDB();
    if (!mongoConnection) {
      console.log("🔄 MongoDB unavailable, falling back to SQLite");
    }
  }
}

export function isMongoDBAvailable() {
  return mongoConnection && mongoConnection.readyState === 1;
}

// ============ USERS ============

export async function createUser(email, password, name) {
  if (isMongoDBAvailable()) {
    const user = await User.create({ email, password, name });
    return { id: user._id.toString(), email: user.email, name: user.name };
  }
  const result = db
    .prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)")
    .run(email, password, name);
  return { id: result.lastInsertRowid, email, name };
}

export async function getUserByEmail(email) {
  if (isMongoDBAvailable()) {
    const user = await User.findOne({ email });
    return user ? { id: user._id.toString(), ...user.toObject() } : null;
  }
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export async function getUserById(id) {
  if (isMongoDBAvailable()) {
    const user = await User.findById(id);
    return user ? { id: user._id.toString(), ...user.toObject() } : null;
  }
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

// ============ RESUMES ============

export async function createResume(userId, filename, content, blobUrl = null) {
  if (isMongoDBAvailable()) {
    const resume = await Resume.create({
      userId,
      filename,
      content,
      blobUrl,
    });
    return { id: resume._id.toString(), ...resume.toObject() };
  }
  const result = db
    .prepare(
      "INSERT INTO resumes (user_id, filename, content, blob_url) VALUES (?, ?, ?, ?)"
    )
    .run(userId, filename, content, blobUrl);
  return { id: result.lastInsertRowid, user_id: userId, filename, content, blob_url: blobUrl };
}

export async function getResumesByUserId(userId) {
  if (isMongoDBAvailable()) {
    const resumes = await Resume.find({ userId });
    return resumes.map((r) => ({ id: r._id.toString(), ...r.toObject() }));
  }
  return db.prepare("SELECT * FROM resumes WHERE user_id = ?").all(userId);
}

export async function getResumeById(id) {
  if (isMongoDBAvailable()) {
    const resume = await Resume.findById(id);
    return resume ? { id: resume._id.toString(), ...resume.toObject() } : null;
  }
  return db.prepare("SELECT * FROM resumes WHERE id = ?").get(id);
}

export async function updateResumeAnalysis(id, analysis, atsScore) {
  if (isMongoDBAvailable()) {
    const resume = await Resume.findByIdAndUpdate(
      id,
      { analysis, atsScore },
      { new: true }
    );
    return resume ? { id: resume._id.toString(), ...resume.toObject() } : null;
  }
  db.prepare("UPDATE resumes SET analysis = ?, ats_score = ? WHERE id = ?").run(
    analysis,
    atsScore,
    id
  );
  return getResumeById(id);
}

// ============ JOB MATCHES ============

export async function createJobMatch(userId, resumeId, jobDescription) {
  if (isMongoDBAvailable()) {
    const match = await JobMatch.create({
      userId,
      resumeId,
      jobDescription,
    });
    return { id: match._id.toString(), ...match.toObject() };
  }
  const result = db
    .prepare(
      "INSERT INTO job_matches (user_id, resume_id, job_description) VALUES (?, ?, ?)"
    )
    .run(userId, resumeId, jobDescription);
  return {
    id: result.lastInsertRowid,
    user_id: userId,
    resume_id: resumeId,
    job_description: jobDescription,
  };
}

export async function getJobMatchesByUserId(userId) {
  if (isMongoDBAvailable()) {
    const matches = await JobMatch.find({ userId }).populate("resumeId");
    return matches.map((m) => ({ id: m._id.toString(), ...m.toObject() }));
  }
  return db.prepare("SELECT * FROM job_matches WHERE user_id = ?").all(userId);
}

export async function updateJobMatchScore(id, matchScore, recommendations) {
  if (isMongoDBAvailable()) {
    const match = await JobMatch.findByIdAndUpdate(
      id,
      { matchScore, recommendations },
      { new: true }
    );
    return match ? { id: match._id.toString(), ...match.toObject() } : null;
  }
  db.prepare(
    "UPDATE job_matches SET match_score = ?, recommendations = ? WHERE id = ?"
  ).run(matchScore, recommendations, id);
  return getJobMatchesByUserId(id);
}

export default {
  initializeDatabase,
  isMongoDBAvailable,
  createUser,
  getUserByEmail,
  getUserById,
  createResume,
  getResumesByUserId,
  getResumeById,
  updateResumeAnalysis,
  createJobMatch,
  getJobMatchesByUserId,
  updateJobMatchScore,
};
