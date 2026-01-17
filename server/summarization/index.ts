import OpenAI from "openai";
import { z } from "zod";
import { getAppConfig } from "../config";
import crypto from "crypto";

export const SUMMARIZATION_PROMPT_VERSION = "v1.0.0";

const summaryOutputSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.object({
    text: z.string(),
    context: z.string().optional(),
  })),
  tasks: z.array(z.object({
    text: z.string(),
    assignee: z.string().nullable().optional(),
    assigneeEmail: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    dueDateConfidence: z.number().min(0).max(1).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    keywords: z.array(z.string()).optional(),
    context: z.string().optional(),
  })),
  sentiment: z.object({
    overall: z.enum(["positive", "negative", "neutral", "mixed"]),
    score: z.number().min(-1).max(1),
    details: z.object({
      positive: z.number().min(0).max(100),
      negative: z.number().min(0).max(100),
      neutral: z.number().min(0).max(100),
    }),
    reasoning: z.string().optional(),
  }),
  topKeywords: z.array(z.string()).max(15),
});

export type SummaryOutput = z.infer<typeof summaryOutputSchema>;

export interface SummarizationResult {
  output: SummaryOutput;
  provider: string;
  model: string;
  inputHash: string;
  validJson: boolean;
  errorText?: string;
  processingTimeMs: number;
}

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey || !baseURL) {
    throw new Error("OpenAI AI integration not configured. Missing API credentials.");
  }

  return new OpenAI({ apiKey, baseURL });
}

function hashInput(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function getSummarizationPrompt(transcriptText: string, title?: string): string {
  return `You are an expert meeting analyst. Analyze the following meeting transcript and extract structured information.

${title ? `MEETING TITLE: ${title}\n` : ""}
TRANSCRIPT:
${transcriptText}

Analyze this transcript and return ONLY valid JSON with this exact structure (no additional text):

{
  "summary": "A concise 2-4 sentence summary capturing the main discussion points and outcomes",
  "decisions": [
    {
      "text": "Clear statement of the decision made",
      "context": "Optional brief context from the transcript"
    }
  ],
  "tasks": [
    {
      "text": "Clear description of the action item or task",
      "assignee": "Person's name if mentioned, or null if unclear",
      "assigneeEmail": "Email if mentioned, otherwise null",
      "dueDate": "ISO date string (YYYY-MM-DD) if a deadline is mentioned, otherwise null",
      "dueDateConfidence": 0.0-1.0 (how confident you are about the due date),
      "priority": "low" | "medium" | "high" | "urgent" (inferred from context),
      "keywords": ["relevant", "topic", "keywords"],
      "context": "Brief quote or context from transcript showing where this task was mentioned"
    }
  ],
  "sentiment": {
    "overall": "positive" | "negative" | "neutral" | "mixed",
    "score": -1.0 to 1.0 (negative to positive scale),
    "details": {
      "positive": 0-100 (percentage of positive content),
      "negative": 0-100 (percentage of negative content),
      "neutral": 0-100 (percentage of neutral content)
    },
    "reasoning": "Brief explanation of the sentiment analysis"
  },
  "topKeywords": ["important", "topic", "keywords"] (up to 15 most relevant keywords/topics discussed)
}

IMPORTANT GUIDELINES:
1. Extract ALL actionable tasks, even implied ones
2. Look for patterns like "will do", "need to", "should", "action item", "@name", "by [date]"
3. Infer assignees from context (e.g., "John will handle..." means John is assigned)
4. Parse date references like "by Friday", "next week", "end of month" into ISO dates
5. Assess sentiment based on tone, word choice, and outcomes discussed
6. Keywords should be domain-specific terms and topics, not common words`;
}

function generateMockSummary(transcriptText: string): SummaryOutput {
  const lines = transcriptText.split("\n").filter(l => l.trim());
  const taskPattern = /(?:todo|action|task|@\w+|will|should|need to|going to)/i;
  const decisionPattern = /(?:decided|agreed|confirmed|approved|will|we're going)/i;

  const tasks: SummaryOutput["tasks"] = [];
  const decisions: SummaryOutput["decisions"] = [];

  for (const line of lines.slice(0, 20)) {
    if (taskPattern.test(line)) {
      const nameMatch = line.match(/@(\w+)/);
      tasks.push({
        text: line.replace(/@\w+/, "").trim().slice(0, 200),
        assignee: nameMatch ? nameMatch[1] : undefined,
        dueDateConfidence: 0.2,
        priority: "medium",
        keywords: [],
      });
    }
    if (decisionPattern.test(line)) {
      decisions.push({
        text: line.trim().slice(0, 200),
      });
    }
  }

  const wordCount = transcriptText.split(/\s+/).length;
  const summary = `Meeting transcript containing ${wordCount} words. ${tasks.length} potential action items and ${decisions.length} decisions were identified from the content.`;

  return {
    summary,
    decisions: decisions.slice(0, 5),
    tasks: tasks.slice(0, 10),
    sentiment: {
      overall: "neutral",
      score: 0,
      details: { positive: 33, negative: 33, neutral: 34 },
    },
    topKeywords: [],
  };
}

export async function summarizeTranscript(
  transcriptText: string,
  title?: string
): Promise<SummarizationResult> {
  const startTime = Date.now();
  const inputHash = hashInput(`${title || ""}|${transcriptText}`);
  const config = getAppConfig();

  if (!config.features.aiEnabled || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return {
      output: generateMockSummary(transcriptText),
      provider: "mock",
      model: "deterministic",
      inputHash,
      validJson: true,
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    const openai = getOpenAIClient();
    const prompt = getSummarizationPrompt(transcriptText, title);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI model");
    }

    const parsed = JSON.parse(content);
    const validated = summaryOutputSchema.safeParse(parsed);

    if (!validated.success) {
      console.error("[Summarization] Schema validation failed:", validated.error.errors);
      return {
        output: generateMockSummary(transcriptText),
        provider: "openai",
        model: "gpt-4o-mini",
        inputHash,
        validJson: false,
        errorText: `Schema validation failed: ${validated.error.message}`,
        processingTimeMs: Date.now() - startTime,
      };
    }

    return {
      output: validated.data,
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: true,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("[Summarization] Error:", error);
    return {
      output: generateMockSummary(transcriptText),
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: false,
      errorText: error.message,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

export function parseDueDateFromText(text: string): { date: Date | null; confidence: number } {
  const now = new Date();
  const patterns: Array<{ pattern: RegExp; handler: (match: RegExpMatchArray) => Date; confidence: number }> = [
    {
      pattern: /by\s+(\d{4}-\d{2}-\d{2})/i,
      handler: (m) => new Date(m[1]),
      confidence: 0.95,
    },
    {
      pattern: /by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      handler: (m) => {
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const targetDay = days.indexOf(m[1].toLowerCase());
        const currentDay = now.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
        const date = new Date(now);
        date.setDate(date.getDate() + daysUntil);
        return date;
      },
      confidence: 0.8,
    },
    {
      pattern: /by\s+end\s+of\s+(week|month|quarter|year)/i,
      handler: (m) => {
        const date = new Date(now);
        switch (m[1].toLowerCase()) {
          case "week":
            date.setDate(date.getDate() + (5 - date.getDay()));
            break;
          case "month":
            date.setMonth(date.getMonth() + 1, 0);
            break;
          case "quarter":
            date.setMonth(Math.ceil((date.getMonth() + 1) / 3) * 3, 0);
            break;
          case "year":
            date.setMonth(11, 31);
            break;
        }
        return date;
      },
      confidence: 0.7,
    },
    {
      pattern: /next\s+week/i,
      handler: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 7);
        return date;
      },
      confidence: 0.6,
    },
    {
      pattern: /tomorrow/i,
      handler: () => {
        const date = new Date(now);
        date.setDate(date.getDate() + 1);
        return date;
      },
      confidence: 0.9,
    },
    {
      pattern: /today/i,
      handler: () => new Date(now),
      confidence: 0.95,
    },
  ];

  for (const { pattern, handler, confidence } of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        return { date: handler(match), confidence };
      } catch {
        continue;
      }
    }
  }

  return { date: null, confidence: 0 };
}

export { summaryOutputSchema, SUMMARIZATION_PROMPT_VERSION as promptVersion };
