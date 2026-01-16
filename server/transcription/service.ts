import type { TranscriptionProvider, WhisperModelSize, TranscriptSegment } from "@shared/schema";
import { transcribeWithGemini } from "./providers/gemini";
import { transcribeWithWhisper, getSupportedLanguages } from "./providers/whisper";
import { transcribeWithSelfHosted, isSelfHostedConfigured } from "./providers/self-hosted";

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

export interface TranscriptionOptions {
  provider?: TranscriptionProvider;
  language?: string;
  modelSize?: WhisperModelSize;
  selfHostedEndpoint?: string;
}

export interface TranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number;
  confidence?: number;
  provider: TranscriptionProvider;
  modelSize?: WhisperModelSize;
}

export function validateAudioFile(mimeType: string, size: number): { valid: boolean; error?: string } {
  if (!SUPPORTED_AUDIO_TYPES.includes(mimeType) && !mimeType.startsWith("audio/")) {
    return { 
      valid: false, 
      error: `Unsupported audio format: ${mimeType}. Supported formats: MP3, WAV, WebM, OGG, M4A.` 
    };
  }
  if (size > MAX_AUDIO_SIZE) {
    return { valid: false, error: `File too large. Maximum size is 25MB.` };
  }
  return { valid: true };
}

export async function transcribe(
  audioBuffer: Buffer,
  mimeType: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const { provider = "gemini", language, modelSize = "base", selfHostedEndpoint } = options;

  try {
    switch (provider) {
      case "whisper": {
        const result = await transcribeWithWhisper(audioBuffer, mimeType, {
          language,
          modelSize,
          responseFormat: "verbose_json",
        });
        return {
          ...result,
          provider: "whisper",
          modelSize,
          confidence: 0.95,
        };
      }

      case "whisper-self-hosted": {
        const result = await transcribeWithSelfHosted(audioBuffer, mimeType, {
          language,
          modelSize,
          endpoint: selfHostedEndpoint,
        });
        return {
          ...result,
          provider: "whisper-self-hosted",
          modelSize,
          confidence: 0.9,
        };
      }

      case "gemini":
      default: {
        const result = await transcribeWithGemini(audioBuffer, mimeType, { language });
        return {
          ...result,
          provider: "gemini",
          confidence: result.confidence,
        };
      }
    }
  } catch (error: any) {
    console.error(`[Transcription] Error with provider ${provider}:`, error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "shall", "can", "need", "dare", "ought", "used",
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her",
    "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs",
    "themselves", "what", "which", "who", "whom", "this", "that", "these", "those",
    "am", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if",
    "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
    "about", "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "each", "few", "more", "most", "other", "some", "such",
    "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s",
    "t", "can", "will", "just", "don", "should", "now", "d", "ll", "m", "o", "re",
    "ve", "y", "ain", "aren", "couldn", "didn", "doesn", "hadn", "hasn", "haven",
    "isn", "ma", "mightn", "mustn", "needn", "shan", "shouldn", "wasn", "weren",
    "won", "wouldn", "yeah", "yes", "okay", "ok", "um", "uh", "like", "know",
    "think", "going", "get", "got", "go", "come", "want", "gonna", "really",
    "thing", "things", "something", "anything", "everything", "nothing",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  const sorted = Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return sorted;
}

export function generateSRT(segments: TranscriptSegment[]): string {
  if (!segments || segments.length === 0) {
    return "";
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.round((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${millis.toString().padStart(3, "0")}`;
  };

  return segments
    .map((seg, index) => {
      return `${index + 1}\n${formatTime(seg.start)} --> ${formatTime(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

export function generateTXT(text: string, metadata?: { title?: string; date?: Date; duration?: number }): string {
  let output = "";

  if (metadata?.title) {
    output += `Title: ${metadata.title}\n`;
  }
  if (metadata?.date) {
    output += `Date: ${metadata.date.toISOString().split("T")[0]}\n`;
  }
  if (metadata?.duration) {
    const mins = Math.floor(metadata.duration / 60);
    const secs = metadata.duration % 60;
    output += `Duration: ${mins}:${secs.toString().padStart(2, "0")}\n`;
  }
  if (output) {
    output += "\n---\n\n";
  }

  output += text;

  return output;
}

export function getAvailableProviders(): { id: TranscriptionProvider; name: string; available: boolean; description: string }[] {
  const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL);
  const hasGemini = !!(process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL);
  const hasSelfHosted = isSelfHostedConfigured();

  return [
    {
      id: "gemini",
      name: "Gemini Flash",
      available: hasGemini,
      description: "Fast and accurate. Good for most use cases.",
    },
    {
      id: "whisper",
      name: "Whisper (OpenAI)",
      available: hasOpenAI,
      description: "Industry-standard accuracy. 97+ languages supported.",
    },
    {
      id: "whisper-self-hosted",
      name: "Whisper (Self-Hosted)",
      available: hasSelfHosted,
      description: "Full privacy control. Requires your own Whisper server.",
    },
  ];
}

export { getSupportedLanguages };
