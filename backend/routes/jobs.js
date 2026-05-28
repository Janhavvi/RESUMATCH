import express from "express";
import { JobApplication, Resume, JobMatch } from "../lib/models.js";
import { runJobMatch } from "../services/ai.js";

const router = express.Router();

// Get all job applications for user
router.get("/applications", async (req, res) => {
  try {
    const userId = req.user?.id || "000000000000000000000001"; // Default to test user
    
    const applications = await JobApplication.find({ userId })
      .populate("resumeId")
      .sort({ createdAt: -1 });
    
    res.json({ applications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get job application by ID
router.get("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "000000000000000000000001";
    
    const application = await JobApplication.findOne({ _id: id, userId })
      .populate("resumeId");
    
    if (!application) {
      return res.status(404).json({ error: "Job application not found" });
    }
    
    res.json({ application });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Create new job application
router.post("/applications", async (req, res) => {
  try {
    const { resumeId, jobTitle, company, jobUrl, jobDescription, notes } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    if (!jobTitle || !company || !jobUrl) {
      return res.status(400).json({ 
        error: "jobTitle, company, and jobUrl are required" 
      });
    }

    // If resumeId provided, verify it belongs to user
    let matchRate = null;
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(400).json({ error: "Resume not found" });
      }

      // Calculate match rate if job description provided
      if (jobDescription && resume.content) {
        try {
          const matchResult = await runJobMatch(resume.content, jobDescription);
          matchRate = matchResult?.score || null;
        } catch (matchError) {
          console.warn("Could not calculate match rate:", matchError.message);
        }
      }
    }

    const application = new JobApplication({
      userId,
      resumeId: resumeId || null,
      jobTitle,
      company,
      jobUrl,
      jobDescription,
      matchRate,
      notes,
      appliedDate: new Date(),
      status: "applied",
    });

    await application.save();
    res.json({ application, message: "Job application added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update job application
router.put("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, matchRate } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    const application = await JobApplication.findOne({ _id: id, userId });
    if (!application) {
      return res.status(404).json({ error: "Job application not found" });
    }

    if (status) application.status = status;
    if (notes !== undefined) application.notes = notes;
    if (matchRate !== undefined) application.matchRate = matchRate;

    await application.save();
    res.json({ application, message: "Job application updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Delete job application
router.delete("/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "000000000000000000000001";

    const application = await JobApplication.findOneAndDelete({ _id: id, userId });
    if (!application) {
      return res.status(404).json({ error: "Job application not found" });
    }

    res.json({ message: "Job application deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get job application analytics/dashboard
router.get("/analytics/dashboard", async (req, res) => {
  try {
    const userId = req.user?.id || "000000000000000000000001";

    const applications = await JobApplication.find({ userId });

    const stats = {
      totalApplications: applications.length,
      byStatus: {
        applied: applications.filter(a => a.status === "applied").length,
        interviewing: applications.filter(a => a.status === "interviewing").length,
        rejected: applications.filter(a => a.status === "rejected").length,
        offer: applications.filter(a => a.status === "offer").length,
      },
      averageMatchRate: applications.length > 0
        ? Math.round(
            applications.reduce((sum, a) => sum + (a.matchRate || 0), 0) / applications.length
          )
        : 0,
      recentApplications: applications.slice(0, 5),
      topCompanies: [...new Set(applications.map(a => a.company))].slice(0, 5),
    };

    res.json({ stats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get match rate trends over time for a resume
router.get("/trends/:resumeId", async (req, res) => {
  try {
    const { resumeId } = req.params;
    const userId = req.user?.id || "000000000000000000000001";

    const applications = await JobApplication.find({ resumeId, userId })
      .sort({ createdAt: 1 });

    const trends = applications.map(app => ({
      date: app.createdAt,
      matchRate: app.matchRate,
      jobTitle: app.jobTitle,
      company: app.company,
    }));

    res.json({ trends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
