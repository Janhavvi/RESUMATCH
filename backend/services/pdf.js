import PDFDocument from "pdfkit";
import { Readable } from "stream";

/**
 * Helper to check if a value is filled (non-empty)
 */
function isFilled(value) {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((v) => isFilled(v));
  if (typeof value === "object") {
    return Object.values(value).some((v) => isFilled(v));
  }
  return true;
}

/**
 * Helper to get non-empty array items
 */
function getFilledItems(arr) {
  return arr ? arr.filter((item) => isFilled(item)) : [];
}

/**
 * Helper to check if an object has any filled values
 */
function hasFilledValues(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some((val) => isFilled(val));
}

/**
 * Generate PDF from resume data - only includes filled sections
 */
export async function generateResumePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 46,
        bufferPages: true,
        size: "A4"
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", reject);

      const page = {
        left: doc.page.margins.left,
        right: doc.page.width - doc.page.margins.right,
        bottom: doc.page.height - doc.page.margins.bottom,
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      };

      const colors = {
        accent: "#2563eb",
        accentSoft: "#dbeafe",
        text: "#111827",
        muted: "#5b677a",
        rule: "#cbd5e1",
      };

      const clean = (value) => String(value || "").trim();
      const ensureSpace = (height = 70) => {
        if (doc.y + height > page.bottom) doc.addPage();
      };
      const splitLines = (value) =>
        clean(value)
          .split(/\r?\n|•/g)
          .map((item) => item.trim())
          .filter(Boolean);

      const addSectionTitle = (title) => {
        ensureSpace(44);
        doc.moveDown(0.55);
        doc
          .lineWidth(0.8)
          .strokeColor(colors.rule)
          .moveTo(page.left, doc.y)
          .lineTo(page.right, doc.y)
          .stroke();
        doc.moveDown(0.25);
        doc
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(colors.accent)
          .text(title.toUpperCase(), {
            characterSpacing: 0.7,
          });
        doc.moveDown(0.35);
      };

      const addParagraph = (text) => {
        if (!isFilled(text)) return;
        ensureSpace(36);
        doc
          .font("Helvetica")
          .fontSize(10.2)
          .fillColor(colors.text)
          .text(clean(text), {
            width: page.width,
            lineGap: 2.2,
          });
      };

      const addBullet = (text) => {
        if (!isFilled(text)) return;
        ensureSpace(26);
        const y = doc.y + 4;
        doc
          .circle(page.left + 3, y, 1.6)
          .fill(colors.accent);
        doc
          .font("Helvetica")
          .fontSize(9.6)
          .fillColor(colors.text)
          .text(clean(text), page.left + 14, doc.y, {
            width: page.width - 14,
            lineGap: 1.8,
          });
        doc.moveDown(0.15);
      };

      const addLabelValue = (label, value) => {
        if (!isFilled(value)) return;
        ensureSpace(24);
        const y = doc.y;
        doc
          .font("Helvetica-Bold")
          .fontSize(9.6)
          .fillColor(colors.text)
          .text(`${label}:`, page.left, y, { continued: true });
        doc
          .font("Helvetica")
          .fillColor(colors.muted)
          .text(` ${clean(value)}`, {
            width: page.width,
            lineGap: 1.5,
          });
      };

      // === HEADER ===
      if (isFilled(data.name)) {
        doc
          .font("Helvetica-Bold")
          .fontSize(25)
          .fillColor(colors.text)
          .text(clean(data.name), {
            width: page.width,
            align: "left",
          });
      }

      const contactInfo = [];
      if (isFilled(data.email)) contactInfo.push(data.email);
      if (isFilled(data.phone)) contactInfo.push(data.phone);
      if (isFilled(data.linkedIn)) contactInfo.push(data.linkedIn);
      if (isFilled(data.portfolio)) contactInfo.push(data.portfolio);

      if (contactInfo.length > 0) {
        doc
          .moveDown(0.2)
          .font("Helvetica-Bold")
          .fontSize(9.5)
          .fillColor(colors.muted)
          .text(contactInfo.map(clean).join("  |  "), {
            width: page.width,
          });
      }
      doc
        .moveDown(0.45)
        .lineWidth(1.2)
        .strokeColor(colors.accent)
        .moveTo(page.left, doc.y)
        .lineTo(page.right, doc.y)
        .stroke();
      doc.moveDown(0.35);

      // === PROFESSIONAL SUMMARY ===
      if (isFilled(data.summary)) {
        addSectionTitle("PROFESSIONAL SUMMARY");
        addParagraph(data.summary);
      }

      // === OBJECTIVE ===
      if (isFilled(data.objective)) {
        addSectionTitle("OBJECTIVE");
        addParagraph(data.objective);
      }

      // === WORK EXPERIENCE ===
      const filledExperience = getFilledItems(data.workExperience);
      if (filledExperience.length > 0) {
        addSectionTitle("WORK EXPERIENCE");
        filledExperience.forEach((job, idx) => {
          if (isFilled(job.company) || isFilled(job.role)) {
            if (idx > 0) doc.moveDown(0.25);
            ensureSpace(62);

            const title = [job.role, job.company].filter(isFilled).map(clean).join(" - ");
            doc
              .font("Helvetica-Bold")
              .fontSize(10.8)
              .fillColor(colors.text)
              .text(title || clean(job.company) || clean(job.role), page.left, doc.y, {
                width: page.width - 105,
                continued: isFilled(job.duration),
              });

            if (isFilled(job.duration)) {
              doc
                .font("Helvetica")
                .fontSize(9)
                .fillColor(colors.muted)
                .text(clean(job.duration), {
                  align: "right",
                  width: 105,
                });
            }

            if (isFilled(job.responsibilities)) {
              splitLines(job.responsibilities).forEach(addBullet);
            }

            if (isFilled(job.achievements)) {
              splitLines(job.achievements).forEach(addBullet);
            }
          }
        });
      }

      // === EDUCATION ===
      const filledEducation = getFilledItems(data.education);
      if (filledEducation.length > 0) {
        addSectionTitle("EDUCATION");
        filledEducation.forEach((edu, idx) => {
          if (isFilled(edu.degree) || isFilled(edu.university)) {
            if (idx > 0) doc.moveDown(0.25);
            ensureSpace(42);

            doc
              .font("Helvetica-Bold")
              .fontSize(10.8)
              .fillColor(colors.text)
              .text(clean(edu.degree) || clean(edu.university));

            if (isFilled(edu.university) && clean(edu.university) !== clean(edu.degree)) {
              doc
                .font("Helvetica")
                .fontSize(9.6)
                .fillColor(colors.muted)
                .text(clean(edu.university), { continued: isFilled(edu.cgpa) || isFilled(edu.year) });
            }

            if (isFilled(edu.cgpa) || isFilled(edu.year)) {
              const details = [
                edu.cgpa ? `CGPA: ${clean(edu.cgpa)}` : "",
                edu.year ? `Year: ${clean(edu.year)}` : "",
              ]
                .filter(Boolean)
                .join(" | ");
              doc
                .font("Helvetica")
                .fontSize(9.6)
                .fillColor(colors.muted)
                .text(isFilled(edu.university) ? ` | ${details}` : details);
            }
          }
        });
      }

      // === TECHNICAL SKILLS ===
      if (hasFilledValues(data.technicalSkills)) {
        addSectionTitle("TECHNICAL SKILLS");
        const skills = data.technicalSkills;
        addLabelValue("Languages", skills.programmingLanguages);
        addLabelValue("Frameworks", skills.frameworks);
        addLabelValue("Databases", skills.databases);
        addLabelValue("Tools", skills.tools);
      }

      // === PROJECTS ===
      const filledProjects = getFilledItems(data.projects);
      if (filledProjects.length > 0) {
        addSectionTitle("PROJECTS");
        filledProjects.forEach((project, idx) => {
          if (isFilled(project.name) || isFilled(project.details)) {
            if (idx > 0) doc.moveDown(0.25);
            ensureSpace(52);
            doc
              .font("Helvetica-Bold")
              .fontSize(10.8)
              .fillColor(colors.text)
              .text(clean(project.name) || "Project");

            if (isFilled(project.technologies)) {
              doc
                .font("Helvetica")
                .fontSize(9.4)
                .fillColor(colors.muted)
                .text(`Tech: ${clean(project.technologies)}`);
            }

            if (isFilled(project.details)) {
              splitLines(project.details).forEach(addBullet);
            }
          }
        });
      }

      // === CERTIFICATIONS ===
      const filledCertifications = getFilledItems(data.certifications);
      if (filledCertifications.length > 0) {
        addSectionTitle("CERTIFICATIONS");
        filledCertifications.forEach(addBullet);
      }

      // === ACHIEVEMENTS ===
      const filledAchievements = [
        ...getFilledItems(data.featureAchievements),
        ...getFilledItems(data.achievements),
      ];
      if (filledAchievements.length > 0) {
        addSectionTitle("ACHIEVEMENTS");
        filledAchievements.forEach(addBullet);
      }

      // === SOFT SKILLS ===
      const filledSoftSkills = getFilledItems(data.softSkills);
      if (filledSoftSkills.length > 0) {
        addSectionTitle("SOFT SKILLS");
        doc
          .font("Helvetica")
          .fontSize(9.8)
          .fillColor(colors.text)
          .text(filledSoftSkills.map(clean).join(", "), { width: page.width, lineGap: 1.5 });
      }

      // === LANGUAGES ===
      const filledLanguages = getFilledItems(data.languagesKnown);
      if (filledLanguages.length > 0) {
        addSectionTitle("LANGUAGES");
        doc
          .font("Helvetica")
          .fontSize(9.8)
          .fillColor(colors.text)
          .text(filledLanguages.map(clean).join(", "), { width: page.width, lineGap: 1.5 });
      }

      // === EXTRACURRICULAR ===
      const filledExtracurricular = getFilledItems(data.extracurricular);
      if (filledExtracurricular.length > 0) {
        addSectionTitle("EXTRACURRICULAR ACTIVITIES");
        filledExtracurricular.forEach(addBullet);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
