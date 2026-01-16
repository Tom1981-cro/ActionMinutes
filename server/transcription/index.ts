export {
  transcribe,
  validateAudioFile,
  extractKeywords,
  generateSRT,
  generateTXT,
  getAvailableProviders,
  getSupportedLanguages,
  SUPPORTED_AUDIO_TYPES,
  MAX_AUDIO_SIZE,
  type TranscriptionOptions,
  type TranscriptionResult,
} from "./service";

export { transcribeWithWhisper, getModelSizeDescription } from "./providers/whisper";
export { transcribeWithGemini } from "./providers/gemini";
export { transcribeWithSelfHosted, isSelfHostedConfigured } from "./providers/self-hosted";
