import { GoogleGenAI } from "@google/genai";

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

export const SUPPORTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/m4a",
  "audio/mp4",
  "audio/x-m4a",
];

export const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  duration?: number;
}

export function validateAudioFile(mimeType: string, size: number): { valid: boolean; error?: string } {
  if (!SUPPORTED_AUDIO_TYPES.includes(mimeType) && !mimeType.startsWith("audio/")) {
    return { valid: false, error: `Unsupported audio format: ${mimeType}. Supported formats: MP3, WAV, WebM, OGG, M4A.` };
  }
  if (size > MAX_AUDIO_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 25MB.` };
  }
  return { valid: true };
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
  const ai = getGeminiClient();
  const base64Audio = audioBuffer.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          { text: `Please transcribe this audio recording accurately. 

Output ONLY the transcription text, nothing else. Do not add any commentary, labels, or formatting.
If the audio contains multiple speakers, just transcribe what they say in order.
If you cannot understand something, indicate it with [inaudible].
If the audio is silent or contains no speech, respond with "[No speech detected]".` },
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

  // Extract text from response - the SDK uses a getter property for text
  let text = "[No speech detected]";
  try {
    // response.text is a getter in @google/genai that extracts text from candidates
    const responseText = response.text;
    if (responseText && typeof responseText === "string") {
      text = responseText.trim() || "[No speech detected]";
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      // Fallback to extracting from candidates directly
      const candidateText = response.candidates[0].content.parts[0].text;
      if (typeof candidateText === "string") {
        text = candidateText.trim() || "[No speech detected]";
      }
    }
  } catch (e) {
    console.error("[Transcription] Error extracting text from response:", e);
  }

  return {
    text,
    confidence: text !== "[No speech detected]" && text !== "[inaudible]" ? 0.9 : 0.5,
  };
}
