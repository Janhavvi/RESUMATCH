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

const jobApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    jobTitle: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    jobUrl: {
      type: String,
      required: true,
    },
    jobDescription: String,
    matchRate: Number,
    status: {
      type: String,
      enum: ["applied", "interviewing", "rejected", "offer"],
      default: "applied",
    },
    notes: String,
    appliedDate: Date,
  },
  { timestamps: true }
);

const interviewQuestionSchema = new mongoose.Schema(
  {
    question: String,
    sampleAnswer: String,
    category: String,
    difficulty: String,
    type: String,
    company: String,
    answer: String,
    grounding: String,
    userAnswer: String,
    audioUrl: String,
    score: Number,
    feedback: String,
    fillerWords: [String],
    strengths: [String],
    weaknesses: [String],
    missingInformation: [String],
    betterAnswer: String,
    followUpQuestion: String,
    dimensions: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    resumeName: String,
    resumeText: String,
    role: String,
    interviewType: String,
    difficulty: String,
    strictMode: Boolean,
    askedQuestions: [String],
    questions: [interviewQuestionSchema],
    overallScore: Number,
    status: {
      type: String,
      enum: ["Completed", "Incomplete"],
      default: "Incomplete",
    },
    completedAt: Date,
    duration: Number, // in seconds
  },
  { timestamps: true }
);

const privacyReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    risks: [
      {
        type: {
          type: String,
          enum: ["email", "phone", "address", "ssn", "date_of_birth", "reference_contact"],
        },
        severity: {
          type: String,
          enum: ["high", "medium", "low"],
        },
        location: String,
        originalValue: String,
        redactedValue: String,
        suggestion: String,
      },
    ],
    riskScore: Number,
    privacyScore: Number,
    riskLevel: String,
    versions: Object,
    insights: Object,
    advisorMessages: [String],
    auditLog: [Object],
    redactedContent: String,
    reviewedAt: Date,
  },
  { timestamps: true }
);

const skillRoadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobMatch",
    },
    missingSkills: [
      {
        skill: String,
        proficiency: String,
        importance: String,
        whyItMatters: String,
        targetOutcome: String,
        prerequisites: [String],
        learningResources: [
          {
            title: String,
            description: String,
            url: String,
            provider: String,
            difficulty: String,
            duration: String,
            type: String,
            pricing: String,
          },
        ],
        certifications: [
          {
            name: String,
            provider: String,
            cost: String,
            recognition: String,
            link: String,
          },
        ],
        milestones: [
          {
            week: String,
            title: String,
            goals: [String],
            practiceTasks: [String],
            deliverables: [String],
            estimatedHours: Number,
            learningResources: [
              {
                title: String,
                description: String,
                url: String,
                provider: String,
                difficulty: String,
                duration: String,
                type: String,
                pricing: String,
              },
            ],
            projects: [
              {
                name: String,
                description: String,
                timeframe: String,
                technologies: [String],
                acceptanceCriteria: [String],
                portfolioProof: String,
                resumeBullet: String,
                stretchGoal: String,
                estimatedHours: Number,
              },
            ],
          },
        ],
        projects: [
          {
            name: String,
            description: String,
            timeframe: String, // e.g., "weekend", "1 week"
            technologies: [String],
            learningResources: [String],
            acceptanceCriteria: [String],
            portfolioProof: String,
            resumeBullet: String,
            stretchGoal: String,
            estimatedHours: Number,
          },
        ],
      },
    ],
    createdFor: String, // job title or role
    sourceSummary: String,
    detectedSkills: [String],
    inferredSkills: [String],
    addedSkills: [String],
    targetCompletionDate: Date,
  },
  { timestamps: true }
);

// Create models
const User = mongoose.model("User", userSchema);
const Resume = mongoose.model("Resume", resumeSchema);
const JobMatch = mongoose.model("JobMatch", jobMatchSchema);
const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);
const InterviewSession = mongoose.model("InterviewSession", interviewSessionSchema);
const PrivacyReport = mongoose.model("PrivacyReport", privacyReportSchema);
const SkillRoadmap = mongoose.model("SkillRoadmap", skillRoadmapSchema);

export { User, Resume, JobMatch, JobApplication, InterviewSession, PrivacyReport, SkillRoadmap };
