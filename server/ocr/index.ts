import Tesseract from "tesseract.js";

export interface OcrResult {
  text: string;
  confidence?: number;
  warnings?: string[];
}

export type OcrProvider = "tesseract" | "cloud";

const OCR_PROVIDER = (process.env.OCR_PROVIDER as OcrProvider) || "tesseract";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: { mimetype: string; size: number }): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: "Unsupported format. Use JPG or PNG." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Image too large. Please use a smaller photo (max 10MB)." };
  }
  return { valid: true };
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<OcrResult> {
  if (OCR_PROVIDER === "cloud") {
    return cloudOcr(imageBuffer);
  }
  return tesseractOcr(imageBuffer);
}

async function tesseractOcr(imageBuffer: Buffer): Promise<OcrResult> {
  try {
    const result = await Tesseract.recognize(imageBuffer, "eng", {
      logger: () => {},
    });

    const text = result.data.text.trim();
    const confidence = result.data.confidence;
    const warnings: string[] = [];

    if (!text) {
      warnings.push("No text detected in the image.");
    } else if (confidence < 50) {
      warnings.push("Low confidence. Text may be inaccurate.");
    }

    return {
      text,
      confidence: Math.round(confidence),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("[OCR Error]", error);
    throw new Error("OCR failed. Try again or type notes manually.");
  }
}

async function cloudOcr(_imageBuffer: Buffer): Promise<OcrResult> {
  throw new Error("Cloud OCR not implemented. Set OCR_PROVIDER=tesseract or implement cloud provider.");
}

export { MAX_FILE_SIZE, ALLOWED_MIME_TYPES };
