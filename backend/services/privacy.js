/**
 * Enterprise privacy scanning service to detect and redact sensitive resume data.
 * Uses deterministic regex/context rules and returns structured data for UI redaction controls.
 */

const SEVERITY_WEIGHT = {
  high: 18,
  medium: 10,
  low: 5,
};

const RISK_COPY = {
  email: {
    label: "Email Address",
    severity: "medium",
    replacement: "[EMAIL REDACTED]",
    whyRisky: "Public email exposure can lead to spam, phishing, credential stuffing, and unwanted contact.",
    recommendedAction: "Use it only in recruiter-facing versions or replace it with a protected contact method for public uploads.",
  },
  phone: {
    label: "Phone Number",
    severity: "medium",
    replacement: "[PHONE REDACTED]",
    whyRisky: "Phone numbers can be scraped from public resumes and used for spam, impersonation, or social engineering.",
    recommendedAction: "Hide your number in public versions and share it only after recruiter verification.",
  },
  emergency_contact: {
    label: "Emergency Contact",
    severity: "high",
    replacement: "[EMERGENCY CONTACT REDACTED]",
    whyRisky: "Emergency contacts expose another person's private details without their consent.",
    recommendedAction: "Remove emergency contacts from every resume version.",
  },
  full_address: {
    label: "Full Address",
    severity: "high",
    replacement: "[ADDRESS REDACTED]",
    whyRisky: "A full home address enables precise location tracking and personal safety risks.",
    recommendedAction: "Use only city or region when a location signal is needed.",
  },
  city_state_pincode: {
    label: "Address / Location",
    severity: "medium",
    replacement: "[ADDRESS REDACTED]",
    whyRisky: "City, state, and pincode combinations can narrow your physical location.",
    recommendedAction: "Generalize to a city or country for public versions.",
  },
  exact_location: {
    label: "Address / Location",
    severity: "high",
    replacement: "[ADDRESS REDACTED]",
    whyRisky: "Exact location data can reveal home, school, or workplace patterns.",
    recommendedAction: "Remove precise location references before posting publicly.",
  },
  date_of_birth: {
    label: "Date of Birth",
    severity: "high",
    replacement: "[DOB REDACTED]",
    whyRisky: "Birth dates are commonly used for identity verification and fraud attempts.",
    recommendedAction: "Remove date of birth. Recruiters generally do not need it.",
  },
  age: {
    label: "Age",
    severity: "medium",
    replacement: "[AGE REDACTED]",
    whyRisky: "Age can enable discrimination and unnecessary personal profiling.",
    recommendedAction: "Remove age unless a specific, lawful application requires it.",
  },
  aadhaar: {
    label: "Aadhaar Number",
    severity: "high",
    replacement: "[AADHAAR REDACTED]",
    whyRisky: "Aadhaar is a highly sensitive government identifier and should never appear on a resume.",
    recommendedAction: "Remove Aadhaar from all versions immediately.",
  },
  pan: {
    label: "PAN Number",
    severity: "high",
    replacement: "[PAN REDACTED]",
    whyRisky: "PAN can be misused for financial profiling and identity fraud.",
    recommendedAction: "Remove PAN from all resume versions.",
  },
  passport: {
    label: "Passport Number",
    severity: "high",
    replacement: "[PASSPORT REDACTED]",
    whyRisky: "Passport numbers are government identifiers and create identity theft risk.",
    recommendedAction: "Remove passport details unless requested in a secure hiring portal.",
  },
  ssn: {
    label: "SSN",
    severity: "high",
    replacement: "[SSN REDACTED]",
    whyRisky: "SSNs are critical identity credentials and must never be shared in resumes.",
    recommendedAction: "Remove SSN immediately from every version.",
  },
  driving_license: {
    label: "Driving License Number",
    severity: "high",
    replacement: "[DRIVING LICENSE REDACTED]",
    whyRisky: "Driving license numbers are government IDs that can support identity fraud.",
    recommendedAction: "Remove license numbers unless explicitly required through a secure channel.",
  },
  linkedin: {
    label: "LinkedIn URL",
    severity: "low",
    replacement: "[LINKEDIN REDACTED]",
    whyRisky: "LinkedIn is usually acceptable for recruiters, but it can reveal your network and activity.",
    recommendedAction: "Keep it for recruiter versions. Hide it for anonymous public versions.",
  },
  github: {
    label: "GitHub URL",
    severity: "low",
    replacement: "[GITHUB REDACTED]",
    whyRisky: "GitHub profiles can expose email addresses, location, commit history, or private project hints.",
    recommendedAction: "Keep only if the profile is curated for hiring.",
  },
  portfolio: {
    label: "Portfolio / Personal Website",
    severity: "low",
    replacement: "[PORTFOLIO REDACTED]",
    whyRisky: "Personal websites can reveal analytics IDs, contact forms, photos, or personal location clues.",
    recommendedAction: "Use a professional portfolio for recruiter versions and hide it for anonymous sharing.",
  },
  school_id: {
    label: "School ID",
    severity: "medium",
    replacement: "[SCHOOL ID REDACTED]",
    whyRisky: "School IDs can expose institutional records or student identity.",
    recommendedAction: "Remove school IDs from resumes.",
  },
  roll_number: {
    label: "College Roll Number",
    severity: "medium",
    replacement: "[ROLL NUMBER REDACTED]",
    whyRisky: "Roll numbers can expose academic records or institutional identity.",
    recommendedAction: "Remove roll numbers unless a specific campus process requires them.",
  },
  employee_id: {
    label: "Employee ID",
    severity: "medium",
    replacement: "[EMPLOYEE ID REDACTED]",
    whyRisky: "Employee IDs can expose internal company identity and enable impersonation.",
    recommendedAction: "Remove employee IDs from all public versions.",
  },
  family_information: {
    label: "Family Information",
    severity: "medium",
    replacement: "[FAMILY INFORMATION REDACTED]",
    whyRisky: "Family details reveal unnecessary personal context and can support social engineering.",
    recommendedAction: "Remove family information from all resume versions.",
  },
};

const INDIAN_STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat",
  "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh",
  "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
  "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh",
  "uttarakhand", "west bengal", "delhi", "jammu and kashmir", "ladakh", "india"
];

const COMMON_CITY_HINTS = [
  "mumbai", "delhi", "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "kolkata",
  "ahmedabad", "jaipur", "ranchi", "jamshedpur", "bokaro", "steel city", "noida", "gurgaon",
  "gurugram", "lucknow", "bhopal", "indore", "patna", "surat", "nagpur", "vadodara"
];

const ADDRESS_WORDS = [
  "house", "flat", "apartment", "apt", "building", "tower", "block", "sector", "colony",
  "nagar", "road", "street", "lane", "avenue", "near", "district", "city", "state",
  "pincode", "pin code", "po box", "post office", "village", "town", "address"
];

const ID_TYPES = new Set(["ssn", "aadhaar", "pan", "passport", "driving_license", "school_id", "roll_number", "employee_id", "emergency_contact", "family_information", "date_of_birth", "age"]);
const REDACTION_TYPE_PRIORITY = {
  email: 1,
  phone: 2,
  ssn: 3,
  aadhaar: 3,
  pan: 3,
  passport: 3,
  driving_license: 3,
  school_id: 3,
  roll_number: 3,
  employee_id: 3,
  emergency_contact: 3,
  family_information: 3,
  date_of_birth: 3,
  age: 3,
  full_address: 4,
  city_state_pincode: 4,
  exact_location: 4,
  linkedin: 5,
  github: 5,
  portfolio: 5,
};

const PATTERN_DEFINITIONS = [
  { type: "email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: "phone", regex: /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b|(?:\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { type: "ssn", regex: /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g },
  { type: "aadhaar", regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g },
  { type: "pan", regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g },
  { type: "passport", regex: /\b[A-PR-WYa-pr-wy][0-9]{7}\b/g },
  { type: "driving_license", regex: /\b[A-Z]{2}[\s-]?\d{2}[\s-]?\d{4}[\s-]?\d{7}\b/gi },
  { type: "date_of_birth", regex: /\b(?:DOB|D\.O\.B|date of birth|born)[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/gi },
  { type: "age", regex: /\b(?:age|aged)[:\s-]*(\d{1,2})\b/gi },
  { type: "linkedin", regex: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+|(?:www\.)?linkedin\.com\/[^\s)]+/gi },
  { type: "github", regex: /https?:\/\/(?:www\.)?github\.com\/[^\s)]+|(?:www\.)?github\.com\/[^\s)]+/gi },
  { type: "portfolio", regex: /https?:\/\/(?![^/\s]*linkedin\.com)(?![^/\s]*github\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s)]*|\b(?:portfolio|website)[:\s-]+[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s)]*/gi },
  { type: "school_id", regex: /\b(?:school id|student id)[:\s-]*[A-Z0-9-]{4,20}\b/gi },
  { type: "roll_number", regex: /\b(?:roll(?: no| number)?|reg(?:istration)? no)[:\s-]*[A-Z0-9/-]{4,24}\b/gi },
  { type: "employee_id", regex: /\b(?:employee id|emp id|staff id)[:\s-]*[A-Z0-9-]{4,20}\b/gi },
  { type: "emergency_contact", regex: /\b(?:emergency contact|alternate contact)[:\s-]*(?:\+?\d[\d\s().-]{7,}\d)\b/gi },
  { type: "family_information", regex: /\b(?:father(?:'s)? name|mother(?:'s)? name|spouse(?:'s)? name|parent(?:'s)? name)[:\s-]+[A-Za-z][A-Za-z\s.'-]{2,60}\b/gi },
  { type: "exact_location", regex: /\b(?:latitude|longitude|lat|long|geo location|current address|permanent address)[:\s-]+[A-Za-z0-9.,\s/-]{8,80}\b/gi },
];

const REDACTION_PROFILES = {
  recruiter: ["full_address", "city_state_pincode", "exact_location", "aadhaar", "pan", "ssn", "passport", "driving_license", "school_id", "roll_number", "employee_id", "emergency_contact", "family_information", "date_of_birth", "age"],
  public: ["email", "phone", "full_address", "city_state_pincode", "exact_location", "date_of_birth", "age", "aadhaar", "pan", "ssn", "passport", "driving_license", "school_id", "roll_number", "employee_id", "emergency_contact", "family_information", "linkedin", "github", "portfolio"],
  anonymous: Object.keys(RISK_COPY),
};

function normalizeValue(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function riskId(type, value, index) {
  return `${type}-${index}-${normalizeValue(value).slice(0, 24).replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
}

function createRisk(type, match, index) {
  const copy = RISK_COPY[type] || RISK_COPY.portfolio;
  const originalValue = normalizeValue(match[0]);
  return {
    id: riskId(type, originalValue, index ?? 0),
    type,
    label: copy.label,
    severity: copy.severity,
    location: `Character position ${index ?? 0}`,
    start: index ?? 0,
    end: (index ?? 0) + match[0].length,
    originalValue,
    redactedValue: copy.replacement,
    replacement: copy.replacement,
    confidence: 1,
    suggestion: copy.recommendedAction,
    whyRisky: copy.whyRisky,
    recommendedAction: copy.recommendedAction,
  };
}

function addressSignals(value) {
  const lower = String(value || "").toLowerCase();
  const signals = [];
  if (/\b\d{6}\b/.test(lower)) signals.push("6 digit pincode");
  if (INDIAN_STATES.some((state) => lower.includes(state))) signals.push("state/country name");
  if (COMMON_CITY_HINTS.some((city) => lower.includes(city))) signals.push("city name");
  if (ADDRESS_WORDS.some((word) => lower.includes(word))) signals.push("address keyword");
  if (/,/.test(value) && /[A-Za-z]/.test(value)) signals.push("comma-separated location format");
  if (/\b(?:house|flat|apartment|apt|plot|door)\s*(?:no\.?)?\s*[A-Z0-9-]+\b/i.test(value)) signals.push("house/flat number");
  return signals;
}

function createAddressRisk(value, start) {
  const signals = addressSignals(value);
  const hasStrongSignal = signals.includes("6 digit pincode") || signals.includes("house/flat number");
  const confidence = Math.min(0.98, (signals.length * 0.24) + (hasStrongSignal ? 0.22 : 0));

  if (signals.length < 2 || confidence < 0.75) return null;

  const lower = String(value || "").toLowerCase();
  const hasResidentialSignal = signals.includes("house/flat number")
    || /\b(?:house|flat|apartment|apt|plot|door|building|tower|block|sector|colony|nagar|road|street|lane|avenue|near|district)\b/.test(lower);
  const type = hasResidentialSignal
    ? "full_address"
    : "city_state_pincode";
  const copy = RISK_COPY[type];
  const originalValue = normalizeValue(value);

  return {
    id: riskId(type, originalValue, start),
    type,
    label: copy.label,
    severity: copy.severity,
    location: `Character position ${start}`,
    start,
    end: start + value.length,
    originalValue,
    redactedValue: copy.replacement,
    replacement: copy.replacement,
    confidence: Math.round(confidence * 100) / 100,
    addressSignals: signals,
    suggestion: copy.recommendedAction,
    whyRisky: copy.whyRisky,
    recommendedAction: copy.recommendedAction,
  };
}

function findAddressRisks(content) {
  const risks = [];
  const lines = String(content || "").split(/\r?\n/);
  let offset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    const lineStart = offset + line.indexOf(trimmed);
    if (trimmed.length >= 8 && trimmed.length <= 140) {
      const labeledAddress = trimmed.match(/\b(?:address|current address|permanent address)[:\s-]+(.{8,120})/i);
      const candidate = labeledAddress ? labeledAddress[0] : trimmed;
      const candidateStart = labeledAddress ? lineStart + labeledAddress.index : lineStart;
      const risk = createAddressRisk(candidate, candidateStart);
      if (risk) risks.push(risk);
    }

    const inlineLocationRegex = /\b[A-Z][A-Za-z .'-]{2,35},\s*(?:[A-Z][A-Za-z .'-]{2,35},?\s*)?(?:India|[A-Z][A-Za-z .'-]{2,35})?\s*\d{6}\b/g;
    for (const match of trimmed.matchAll(inlineLocationRegex)) {
      const risk = createAddressRisk(match[0], lineStart + match.index);
      if (risk) risks.push(risk);
    }

    offset += line.length + 1;
  }

  return risks;
}

function dedupeRisks(risks) {
  const seen = new Set();
  return risks.filter((risk) => {
    const key = `${risk.type}:${risk.start}:${risk.originalValue.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectNonOverlappingRisks(risks) {
  const severityRank = { high: 3, medium: 2, low: 1 };
  const sorted = [...risks].sort((a, b) => {
    const priorityDiff = (REDACTION_TYPE_PRIORITY[a.type] || 9) - (REDACTION_TYPE_PRIORITY[b.type] || 9);
    if (a.start !== b.start && !(a.start < b.end && a.end > b.start)) return a.start - b.start;
    if (priorityDiff !== 0) return priorityDiff;
    const severityDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0);
    if (severityDiff !== 0) return severityDiff;
    return (b.end - b.start) - (a.end - a.start);
  });

  const selected = [];
  for (const risk of sorted) {
    const overlaps = selected.some((item) => risk.start < item.end && risk.end > item.start);
    if (!overlaps) selected.push(risk);
  }
  return selected;
}

function applyRedactions(content, risks, enabledTypes = Object.keys(RISK_COPY)) {
  const enabled = new Set(enabledTypes);
  const selected = selectNonOverlappingRisks(risks.filter((risk) => enabled.has(risk.type))).sort((a, b) => b.start - a.start);
  let output = content;
  for (const risk of selected) {
    output = `${output.slice(0, risk.start)}${risk.replacement}${output.slice(risk.end)}`;
  }
  return output;
}

function scoreFromRisks(risks) {
  const exposure = Math.min(100, risks.reduce((sum, risk) => sum + (SEVERITY_WEIGHT[risk.severity] || 6), 0));
  const privacyScore = Math.max(0, 100 - exposure);
  let riskLevel = "Safe to Share";
  if (privacyScore < 40) riskLevel = "High Privacy Risks";
  else if (privacyScore < 70) riskLevel = "Moderate Privacy Risks";
  else if (privacyScore < 90) riskLevel = "Minor Privacy Risks";
  return { exposure, privacyScore, riskLevel };
}

function buildInsights(risks) {
  const count = (predicate) => risks.filter(predicate).length;
  return {
    personalDataFound: count((risk) => ["date_of_birth", "age", "family_information", "exact_location"].includes(risk.type)),
    contactInformationFound: count((risk) => ["email", "phone", "emergency_contact"].includes(risk.type)),
    governmentIdsFound: count((risk) => ["aadhaar", "pan", "ssn", "passport", "driving_license"].includes(risk.type)),
    linksFound: count((risk) => ["linkedin", "github", "portfolio"].includes(risk.type)),
    locationDataFound: count((risk) => ["full_address", "city_state_pincode", "exact_location"].includes(risk.type)),
  };
}

function buildAdvisorMessages(risks, score) {
  const messages = [];
  if (risks.some((risk) => risk.type === "phone")) {
    messages.push("Your phone number is exposed. Consider sharing it only after recruiter verification.");
  }
  if (risks.some((risk) => ["aadhaar", "pan", "ssn", "passport"].includes(risk.type))) {
    messages.push("Government identifiers should never be present in a resume. Remove them from every sharing version.");
  }
  if (risks.some((risk) => risk.type === "full_address")) {
    messages.push("Recruiters do not need your full address. City or remote preference is usually enough.");
  }
  if (risks.some((risk) => ["linkedin", "github", "portfolio"].includes(risk.type))) {
    messages.push("Public profile links are useful, but review them for exposed email addresses, locations, or personal projects.");
  }
  if (score.privacyScore >= 90) {
    messages.push("This resume is in a strong privacy posture for sharing. Keep checking versions before public uploads.");
  }
  return messages.length ? messages : ["No major sensitive data was detected. Keep public resumes minimal and recruiter-ready."];
}

export function createRedactionVersions(content, risks) {
  return {
    recruiter: applyRedactions(content, risks, REDACTION_PROFILES.recruiter),
    public: applyRedactions(content, risks, REDACTION_PROFILES.public),
    anonymous: applyRedactions(content, risks, REDACTION_PROFILES.anonymous),
  };
}

export async function scanPrivacyRisks(resumeContent) {
  const content = String(resumeContent || "");
  const risks = [];

  for (const pattern of PATTERN_DEFINITIONS) {
    const matches = content.matchAll(pattern.regex);
    for (const match of matches) {
      risks.push(createRisk(pattern.type, match, match.index));
    }
  }
  risks.push(...findAddressRisks(content));

  const dedupedRisks = dedupeRisks(risks).sort((a, b) => a.start - b.start);
  const counts = {
    high: dedupedRisks.filter((risk) => risk.severity === "high").length,
    medium: dedupedRisks.filter((risk) => risk.severity === "medium").length,
    low: dedupedRisks.filter((risk) => risk.severity === "low").length,
  };
  const score = scoreFromRisks(dedupedRisks);
  const redactedContent = applyRedactions(content, dedupedRisks, REDACTION_PROFILES.public);
  const versions = createRedactionVersions(content, dedupedRisks);
  const insights = buildInsights(dedupedRisks);

  return {
    risks: dedupedRisks,
    privacyScore: score.privacyScore,
    riskScore: score.exposure,
    exposureScore: score.exposure,
    riskLevel: score.riskLevel,
    totalRisks: dedupedRisks.length,
    highRiskCount: counts.high,
    mediumRiskCount: counts.medium,
    lowRiskCount: counts.low,
    redactedContent,
    versions,
    insights: {
      ...insights,
      overallExposureScore: score.exposure,
    },
    advisorMessages: buildAdvisorMessages(dedupedRisks, score),
    simulator: {
      exposed: dedupedRisks.filter((risk) => ["email", "phone", "full_address", "city_state_pincode", "date_of_birth", "aadhaar", "pan", "ssn", "passport", "driving_license"].includes(risk.type)),
      protectedVersion: versions.public,
    },
    auditLog: [
      { event: "Scan completed", at: new Date().toISOString(), detail: `${dedupedRisks.length} risks detected` },
      { event: "Public redaction generated", at: new Date().toISOString(), detail: `${REDACTION_PROFILES.public.length} rule categories evaluated` },
    ],
  };
}

export function generatePrivacySummary(risks) {
  const highSeverity = risks.filter((risk) => risk.severity === "high").length;
  const mediumSeverity = risks.filter((risk) => risk.severity === "medium").length;
  const lowSeverity = risks.filter((risk) => risk.severity === "low").length;
  const recommendations = [];

  if (highSeverity > 0) recommendations.push("Address high-severity identity and location risks immediately.");
  if (risks.some((risk) => risk.type === "phone")) recommendations.push("Hide phone numbers in public resume versions.");
  if (risks.some((risk) => ["aadhaar", "pan", "ssn"].includes(risk.type))) recommendations.push("Remove government IDs from all versions.");
  if (risks.some((risk) => risk.type === "full_address")) recommendations.push("Replace full addresses with a generalized location.");
  if (risks.some((risk) => risk.type === "email")) recommendations.push("Use a professional email only in recruiter-facing versions.");

  return { highSeverity, mediumSeverity, lowSeverity, recommendations };
}
