import OpenAI, { toFile } from "openai";
import type { WhisperModelSize, TranscriptSegment } from "@shared/schema";

const WHISPER_MODEL_MAP: Record<WhisperModelSize, string> = {
  tiny: "whisper-1",
  base: "whisper-1",
  small: "whisper-1",
  medium: "whisper-1",
  large: "whisper-1",
};

const SUPPORTED_LANGUAGES = [
  "en", "zh", "de", "es", "ru", "ko", "fr", "ja", "pt", "tr", "pl", "ca", "nl",
  "ar", "sv", "it", "id", "hi", "fi", "vi", "he", "uk", "el", "ms", "cs", "ro",
  "da", "hu", "ta", "no", "th", "ur", "hr", "bg", "lt", "la", "mi", "ml", "cy",
  "sk", "te", "fa", "lv", "bn", "sr", "az", "sl", "kn", "et", "mk", "br", "eu",
  "is", "hy", "ne", "mn", "bs", "kk", "sq", "sw", "gl", "mr", "pa", "si", "km",
  "sn", "yo", "so", "af", "oc", "ka", "be", "tg", "sd", "gu", "am", "yi", "lo",
  "uz", "fo", "ht", "ps", "tk", "nn", "mt", "sa", "lb", "my", "bo", "tl", "mg",
  "as", "tt", "haw", "ln", "ha", "ba", "jw", "su",
];

export interface WhisperTranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number;
}

export interface WhisperOptions {
  language?: string;
  modelSize?: WhisperModelSize;
  responseFormat?: "json" | "text" | "srt" | "vtt" | "verbose_json";
  temperature?: number;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error("OpenAI AI integration not configured. Missing API credentials.");
  }

  return new OpenAI({ apiKey, baseURL });
}

export async function transcribeWithWhisper(
  audioBuffer: Buffer,
  mimeType: string,
  options: WhisperOptions = {}
): Promise<WhisperTranscriptionResult> {
  const client = getOpenAIClient();
  const { language, modelSize = "base", responseFormat = "verbose_json" } = options;

  const ext = mimeType.includes("mp3") ? "mp3" 
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("m4a") || mimeType.includes("mp4") ? "m4a"
    : "mp3";

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL_MAP[modelSize],
    response_format: responseFormat,
    language: language && SUPPORTED_LANGUAGES.includes(language) ? language : undefined,
    timestamp_granularities: responseFormat === "verbose_json" ? ["segment"] : undefined,
  } as any);

  if (responseFormat === "verbose_json" && typeof transcription === "object") {
    const verboseResult = transcription as any;
    return {
      text: verboseResult.text || "",
      segments: verboseResult.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
      language: verboseResult.language,
      duration: verboseResult.duration,
    };
  }

  return {
    text: typeof transcription === "string" ? transcription : (transcription as any).text || "",
  };
}

export function getSupportedLanguages(): string[] {
  return SUPPORTED_LANGUAGES;
}

export function getModelSizeDescription(size: WhisperModelSize): { name: string; description: string } {
  const descriptions: Record<WhisperModelSize, { name: string; description: string }> = {
    tiny: { name: "Tiny", description: "Fastest, lower accuracy. Good for quick drafts." },
    base: { name: "Base", description: "Balanced speed and accuracy. Recommended." },
    small: { name: "Small", description: "Better accuracy, moderate speed." },
    medium: { name: "Medium", description: "High accuracy, slower processing." },
    large: { name: "Large", description: "Best accuracy, slowest. For critical transcripts." },
  };
  return descriptions[size];
}
