import { GoogleGenAI } from "@google/genai";
import type { TranscriptSegment } from "@shared/schema";

export interface GeminiTranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
  confidence?: number;
}

export interface GeminiOptions {
  language?: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

  if (!apiKey || !baseUrl) {
    throw new Error("Gemini AI integration not configured. Missing API credentials.");
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      apiVersion: "",
      baseUrl,
    },
  });
}

export async function transcribeWithGemini(
  audioBuffer: Buffer,
  mimeType: string,
  options: GeminiOptions = {}
): Promise<GeminiTranscriptionResult> {
  const ai = getGeminiClient();
  const base64Audio = audioBuffer.toString("base64");
  const { language } = options;

  const languageInstruction = language && language !== "en"
    ? `The audio is in ${language}. Please transcribe in the original language.`
    : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Please transcribe this audio recording accurately. ${languageInstruction}

Output ONLY the transcription text, nothing else. Do not add any commentary, labels, or formatting.
If the audio contains multiple speakers, just transcribe what they say in order.
If you cannot understand something, indicate it with [inaudible].
If the audio is silent or contains no speech, respond with "[No speech detected]".`,
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
  });

  let text = "[No speech detected]";
  try {
    const responseText = response.text;
    if (responseText && typeof responseText === "string") {
      text = responseText.trim() || "[No speech detected]";
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      const candidateText = response.candidates[0].content.parts[0].text;
      if (typeof candidateText === "string") {
        text = candidateText.trim() || "[No speech detected]";
      }
    }
  } catch (e) {
    console.error("[Transcription] Error extracting text from Gemini response:", e);
  }

  return {
    text,
    confidence: text !== "[No speech detected]" && text !== "[inaudible]" ? 0.9 : 0.5,
  };
}
