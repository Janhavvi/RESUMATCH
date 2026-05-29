import express from "express";
import { SkillRoadmap, Resume, JobMatch } from "../lib/models.js";
import { generateSkillRoadmap, inferSkillGapsFromResume } from "../services/ai.js";

const router = express.Router();

// Generate skill roadmap for missing skills
router.post("/generate", async (req, res) => {
  try {
    const { resumeId, jobId, missingSkills, targetRole } = req.body;
    const userId = req.user?.id || "000000000000000000000001";
    const role = String(targetRole || "").trim();

    if (!role) {
      return res.status(400).json({ 
        error: "Choose a target role first." 
      });
    }

    const normalizedMissingSkills = Array.isArray(missingSkills)
      ? missingSkills.map((skill) => String(skill || "").trim()).filter(Boolean)
      : [];

    // If resumeId provided, verify it belongs to user
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
    }

    // Generate roadmap with projects for each skill
    const roadmapData = await generateSkillRoadmap(normalizedMissingSkills, role);

    const roadmapPayload = {
      userId,
      resumeId: resumeId || null,
      jobId: jobId || null,
      missingSkills: roadmapData.skills,
      createdFor: role,
      targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    };

    let roadmap = roadmapPayload;
    try {
      if (SkillRoadmap.db.readyState !== 1) {
        throw new Error("MongoDB is not connected");
      }
      const savedRoadmap = new SkillRoadmap(roadmapPayload);
      await savedRoadmap.save();
      roadmap = savedRoadmap;
    } catch (saveError) {
      console.warn("Could not save generated roadmap, returning unsaved roadmap:", saveError.message);
    }

    res.json({ 
      roadmap,
      message: "Skill roadmap generated successfully" 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Generate skill roadmap from uploaded resume text plus optional extra skills
router.post("/generate-from-resume", async (req, res) => {
  try {
    const { resumeId, resumeText, extraSkills = [], targetRole } = req.body;
    const userId = req.user?.id || "000000000000000000000001";
    const role = String(targetRole || "").trim();

    const normalizedExtras = Array.isArray(extraSkills)
      ? extraSkills.map((skill) => String(skill || "").trim()).filter(Boolean)
      : [];

    if (!role) {
      return res.status(400).json({
        error: "Choose a target role first.",
      });
    }

    const skillGapResult = await inferSkillGapsFromResume(
      resumeText || "",
      role,
      normalizedExtras
    );

    const combinedSkills = [
      ...(skillGapResult.inferredSkills || []),
      ...(skillGapResult.addedSkills || normalizedExtras),
    ]
      .map((skill) => String(skill || "").trim())
      .filter(Boolean);

    const missingSkills = [...new Set(combinedSkills)];

    if (missingSkills.length === 0) {
      return res.status(400).json({
        error: "Could not identify roadmap skills. Add one or more extra skills manually.",
      });
    }

    const roadmapData = await generateSkillRoadmap(missingSkills, role);
    const roadmapPayload = {
      userId,
      resumeId: resumeId || null,
      jobId: null,
      missingSkills: roadmapData.skills || [],
      createdFor: role,
      targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sourceSummary: skillGapResult.sourceSummary,
      detectedSkills: skillGapResult.detectedSkills || [],
      inferredSkills: skillGapResult.inferredSkills || [],
      addedSkills: skillGapResult.addedSkills || normalizedExtras,
    };

    let roadmap = roadmapPayload;
    try {
      if (SkillRoadmap.db.readyState !== 1) {
        throw new Error("MongoDB is not connected");
      }
      const savedRoadmap = new SkillRoadmap(roadmapPayload);
      await savedRoadmap.save();
      roadmap = savedRoadmap;
    } catch (saveError) {
      console.warn("Could not save generated roadmap, returning unsaved roadmap:", saveError.message);
    }

    res.json({
      roadmap,
      detectedSkills: skillGapResult.detectedSkills || [],
      inferredSkills: skillGapResult.inferredSkills || [],
      addedSkills: skillGapResult.addedSkills || normalizedExtras,
      sourceSummary: skillGapResult.sourceSummary,
      message: "Skill roadmap generated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get skill roadmaps for user
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id || "000000000000000000000001";

    const roadmaps = await SkillRoadmap.find({ userId })
      .populate("resumeId")
      .populate("jobId")
      .sort({ createdAt: -1 });

    res.json({ roadmaps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific skill roadmap
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "000000000000000000000001";

    const roadmap = await SkillRoadmap.findOne({ _id: id, userId })
      .populate("resumeId")
      .populate("jobId");

    if (!roadmap) {
      return res.status(404).json({ error: "Skill roadmap not found" });
    }

    res.json({ roadmap });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Update skill roadmap
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { targetCompletionDate, missingSkills } = req.body;
    const userId = req.user?.id || "000000000000000000000001";

    const roadmap = await SkillRoadmap.findOne({ _id: id, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Skill roadmap not found" });
    }

    if (targetCompletionDate) roadmap.targetCompletionDate = targetCompletionDate;
    if (missingSkills) roadmap.missingSkills = missingSkills;

    await roadmap.save();

    res.json({ roadmap, message: "Skill roadmap updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Delete skill roadmap
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const roadmap = await SkillRoadmap.findOneAndDelete({ _id: id, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Skill roadmap not found" });
    }

    res.json({ message: "Skill roadmap deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Get skill roadmap with project recommendations
router.get("/:id/projects", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const roadmap = await SkillRoadmap.findOne({ _id: id, userId });

    if (!roadmap) {
      return res.status(404).json({ error: "Skill roadmap not found" });
    }

    const projects = [];
    roadmap.missingSkills.forEach(skill => {
      skill.projects.forEach(project => {
        projects.push({
          skill: skill.skill,
          ...project,
        });
      });
    });

    res.json({ 
      projects,
      totalProjects: projects.length,
      estimatedTotalHours: projects.reduce((sum, p) => sum + (p.estimatedHours || 0), 0),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
