import { transcribe } from "../transcription";

export type VoiceCommand = 
  | "summarize"
  | "get_summary"
  | "list_tasks"
  | "list_decisions"
  | "show_keywords"
  | "analyze_sentiment"
  | "unknown";

export interface VoiceCommandResult {
  command: VoiceCommand;
  targetTranscriptId?: string;
  targetMeetingName?: string;
  confidence: number;
  rawText: string;
  parameters: Record<string, string>;
}

const COMMAND_PATTERNS: Array<{
  command: VoiceCommand;
  patterns: RegExp[];
  extractParams?: (text: string, match: RegExpMatchArray) => Record<string, string>;
}> = [
  {
    command: "summarize",
    patterns: [
      /summarize\s+(?:my\s+)?(?:last\s+)?(?:meeting|transcript|notes)/i,
      /give\s+(?:me\s+)?(?:a\s+)?summary/i,
      /what\s+(?:was|were)\s+(?:the\s+)?(?:main\s+)?(?:points|takeaways)/i,
      /create\s+(?:a\s+)?summary/i,
      /generate\s+(?:a\s+)?summary/i,
    ],
    extractParams: (text: string): Record<string, string> => {
      const meetingMatch = text.match(/(?:for|of)\s+(?:the\s+)?["']?([^"']+)["']?\s+meeting/i);
      return meetingMatch ? { meetingName: meetingMatch[1] } : {};
    },
  },
  {
    command: "get_summary",
    patterns: [
      /(?:read|show|get|display)\s+(?:me\s+)?(?:the\s+)?summary/i,
      /what\s+(?:is|was)\s+(?:the\s+)?summary/i,
    ],
  },
  {
    command: "list_tasks",
    patterns: [
      /(?:what\s+are|list|show|get)\s+(?:the\s+)?(?:action\s+)?(?:items|tasks|todos)/i,
      /what\s+do\s+(?:i|we)\s+need\s+to\s+do/i,
      /(?:who|what)\s+(?:is|are)\s+assigned/i,
    ],
  },
  {
    command: "list_decisions",
    patterns: [
      /(?:what\s+)?decisions\s+(?:were\s+)?(?:made|taken)/i,
      /(?:list|show|get)\s+(?:the\s+)?decisions/i,
      /what\s+(?:did\s+)?(?:we|they)\s+(?:decide|agree)/i,
    ],
  },
  {
    command: "show_keywords",
    patterns: [
      /(?:what\s+were\s+)?(?:the\s+)?(?:main\s+)?(?:topics|keywords|themes)/i,
      /what\s+(?:was|were)\s+(?:discussed|talked\s+about)/i,
    ],
  },
  {
    command: "analyze_sentiment",
    patterns: [
      /(?:what\s+was|analyze)\s+(?:the\s+)?(?:sentiment|mood|tone)/i,
      /how\s+(?:did\s+)?(?:the\s+meeting|it)\s+(?:go|feel)/i,
      /(?:was\s+it|was\s+the\s+meeting)\s+(?:positive|negative|productive)/i,
    ],
  },
];

export function parseVoiceCommand(text: string): VoiceCommandResult {
  const normalizedText = text.toLowerCase().trim();

  for (const { command, patterns, extractParams } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        const parameters = extractParams ? extractParams(text, match) : {};
        return {
          command,
          targetMeetingName: parameters.meetingName,
          confidence: 0.85,
          rawText: text,
          parameters,
        };
      }
    }
  }

  return {
    command: "unknown",
    confidence: 0,
    rawText: text,
    parameters: {},
  };
}

export async function processVoiceCommand(
  audioBuffer: Buffer,
  mimeType: string
): Promise<VoiceCommandResult> {
  const transcriptionResult = await transcribe(audioBuffer, mimeType, {
    provider: "gemini",
    language: "en",
  });

  const commandResult = parseVoiceCommand(transcriptionResult.text);
  
  return {
    ...commandResult,
    rawText: transcriptionResult.text,
    confidence: commandResult.confidence * (transcriptionResult.confidence || 1),
  };
}

export function generateVoiceResponse(command: VoiceCommand, success: boolean, data?: any): string {
  if (!success) {
    return "I'm sorry, I couldn't process that request. Please try again.";
  }

  switch (command) {
    case "summarize":
      return data?.summary 
        ? `Here's the summary: ${data.summary}` 
        : "I've generated a summary for you.";
    
    case "get_summary":
      return data?.summary 
        ? `The summary is: ${data.summary}` 
        : "No summary is available for this transcript.";
    
    case "list_tasks":
      if (!data?.tasks?.length) {
        return "No action items were found in this transcript.";
      }
      const taskCount = data.tasks.length;
      return `There are ${taskCount} action items. ${data.tasks.slice(0, 3).map((t: any, i: number) => `${i + 1}: ${t.text}`).join(". ")}`;
    
    case "list_decisions":
      if (!data?.decisions?.length) {
        return "No decisions were recorded in this transcript.";
      }
      return `${data.decisions.length} decisions were made. The first one is: ${data.decisions[0].text}`;
    
    case "show_keywords":
      if (!data?.topKeywords?.length) {
        return "No key topics were identified.";
      }
      return `The main topics discussed were: ${data.topKeywords.slice(0, 5).join(", ")}`;
    
    case "analyze_sentiment":
      if (!data?.sentiment) {
        return "Sentiment analysis is not available.";
      }
      const sentimentText = data.sentiment.overall === "positive" 
        ? "positive and productive"
        : data.sentiment.overall === "negative"
        ? "somewhat challenging"
        : data.sentiment.overall === "mixed"
        ? "mixed with both positive and negative elements"
        : "neutral";
      return `The overall sentiment of the meeting was ${sentimentText}.`;
    
    case "unknown":
    default:
      return "I didn't understand that command. You can ask me to summarize a meeting, list tasks, show decisions, or analyze the sentiment.";
  }
}

export const SUPPORTED_VOICE_COMMANDS = [
  {
    command: "summarize",
    examples: [
      "Summarize my last meeting",
      "Give me a summary",
      "What were the main points?",
    ],
    description: "Generate a concise summary of the transcript",
  },
  {
    command: "list_tasks",
    examples: [
      "What are the action items?",
      "List the tasks",
      "What do we need to do?",
    ],
    description: "List all actionable tasks extracted from the transcript",
  },
  {
    command: "list_decisions",
    examples: [
      "What decisions were made?",
      "Show me the decisions",
      "What did we decide?",
    ],
    description: "List all key decisions from the meeting",
  },
  {
    command: "show_keywords",
    examples: [
      "What were the main topics?",
      "Show keywords",
      "What was discussed?",
    ],
    description: "Display the main topics and keywords from the transcript",
  },
  {
    command: "analyze_sentiment",
    examples: [
      "How did the meeting go?",
      "What was the sentiment?",
      "Was it a productive meeting?",
    ],
    description: "Analyze the overall tone and sentiment of the meeting",
  },
];
