import { mongoose } from "./mongodb.js";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: String,
    googleId: String,
    name: String,
    avatar: String,
  },
  { timestamps: true }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    blobUrl: String,
    analysis: String,
    atsScore: Number,
  },
  { timestamps: true }
);

const jobMatchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
    },
    jobDescription: {
      type: String,
      required: true,
    },
    matchScore: Number,
    recommendations: String,
  },
  { timestamps: true }
);

// Create models
const User = mongoose.model("User", userSchema);
const Resume = mongoose.model("Resume", resumeSchema);
const JobMatch = mongoose.model("JobMatch", jobMatchSchema);

export { User, Resume, JobMatch };
