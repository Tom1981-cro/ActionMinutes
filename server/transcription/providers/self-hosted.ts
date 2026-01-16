import type { WhisperModelSize, TranscriptSegment } from "@shared/schema";

export interface SelfHostedTranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];
  language?: string;
  duration?: number;
}

export interface SelfHostedOptions {
  language?: string;
  modelSize?: WhisperModelSize;
  endpoint?: string;
}

export async function transcribeWithSelfHosted(
  audioBuffer: Buffer,
  mimeType: string,
  options: SelfHostedOptions = {}
): Promise<SelfHostedTranscriptionResult> {
  const endpoint = options.endpoint || process.env.WHISPER_SELF_HOSTED_ENDPOINT;

  if (!endpoint) {
    throw new Error(
      "Self-hosted Whisper endpoint not configured. Set WHISPER_SELF_HOSTED_ENDPOINT environment variable or provide endpoint in options."
    );
  }

  const formData = new FormData();
  const ext = mimeType.includes("mp3") ? "mp3"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("webm") ? "webm"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("m4a") || mimeType.includes("mp4") ? "m4a"
    : "mp3";

  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append("file", blob, `audio.${ext}`);

  if (options.language) {
    formData.append("language", options.language);
  }
  if (options.modelSize) {
    formData.append("model", options.modelSize);
  }
  formData.append("response_format", "verbose_json");

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Self-hosted Whisper request failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  return {
    text: result.text || "",
    segments: result.segments?.map((seg: any) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
    })),
    language: result.language,
    duration: result.duration,
  };
}

export function isSelfHostedConfigured(): boolean {
  return !!process.env.WHISPER_SELF_HOSTED_ENDPOINT;
}
