import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";

function normalizeMimeType(mimeType, filename, buffer) {
  if (mimeType && mimeType !== "application/octet-stream") return mimeType;

  const ext = path.extname(filename || "").toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".doc") return "application/msword";
  if (ext === ".txt") return "text/plain";

  // Magic bytes fallback for PDFs.
  if (buffer?.subarray(0, 5).toString("utf8") === "%PDF-") {
    return "application/pdf";
  }

  return mimeType;
}

export async function parseResume(filePath, mimeType, filename = "") {
  const buffer = await fs.readFile(filePath);
  const resolvedMimeType = normalizeMimeType(mimeType, filename, buffer);
  
  if (resolvedMimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const data = await parser.getText();
      return data.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    resolvedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    resolvedMimeType === "application/msword"
  ) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  } else if (resolvedMimeType === "text/plain") {
    return buffer.toString("utf8");
  } else {
    throw new Error("Unsupported file type: " + (resolvedMimeType || mimeType));
  }
}
