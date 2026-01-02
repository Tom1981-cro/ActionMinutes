import OpenAI from "openai";
import { z } from "zod";
import { detectSignals, detectSafetyRisk, selectPromptsForSignals, type SmartPrompt } from "./prompts";
import type { EntrySignal } from "../../shared/schema";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!openaiClient) {
    try {
      openaiClient = new OpenAI();
    } catch (error) {
      console.error('[JournalAI] Failed to initialize OpenAI client:', error);
      return null;
    }
  }
  return openaiClient;
}

export const JOURNAL_PROMPT_VERSION = "v1.0.0";

export const journalSummarySchema = z.object({
  summary: z.string().describe("A 1-2 sentence summary of the entry's main theme"),
  top3: z.array(z.string()).max(3).describe("Top 3 key points or takeaways from the entry"),
  nextSteps: z.array(z.string()).max(3).describe("1-3 actionable next steps based on the entry"),
  detectedTone: z.enum(['productive', 'reflective', 'stressed', 'neutral']).describe("Overall tone of the entry"),
});

export type JournalSummary = z.infer<typeof journalSummarySchema>;

export interface JournalAnalysis {
  signals: EntrySignal[];
  prompts: SmartPrompt[];
  safetyRisk: boolean;
  summary?: JournalSummary;
}

const SYSTEM_PROMPT = `You are a helpful productivity assistant analyzing personal journal entries.
Your job is to extract key insights and actionable next steps from the user's writing.

IMPORTANT GUIDELINES:
- Be action-oriented and practical, not therapeutic
- Focus on work, productivity, and personal effectiveness
- Keep summaries concise and focused
- Suggest concrete, specific next steps
- Do not offer emotional advice or therapy-style responses
- If the entry is short or lacks content, provide brief but helpful analysis

Respond ONLY with valid JSON matching this structure:
{
  "summary": "1-2 sentence summary of the main theme",
  "top3": ["key point 1", "key point 2", "key point 3"],
  "nextSteps": ["action 1", "action 2", "action 3"],
  "detectedTone": "productive|reflective|stressed|neutral"
}`;

export async function analyzeJournalEntry(
  rawText: string,
  excludePromptIds: string[] = []
): Promise<JournalAnalysis> {
  const signals = detectSignals(rawText);
  const safetyRisk = detectSafetyRisk(rawText);
  const prompts = selectPromptsForSignals(signals, 3, excludePromptIds);
  
  return {
    signals,
    prompts,
    safetyRisk,
  };
}

export async function summarizeJournalEntry(
  rawText: string,
  aiEnabled: boolean = true
): Promise<JournalSummary | null> {
  if (!aiEnabled) {
    return null;
  }
  
  if (!rawText || rawText.trim().length < 20) {
    return null;
  }
  
  try {
    const openai = getOpenAI();
    if (!openai) {
      console.error('[JournalAI] OpenAI client not available');
      return null;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Please analyze this journal entry:\n\n${rawText}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[JournalAI] Empty response from OpenAI');
      return null;
    }
    
    const parsed = JSON.parse(content);
    const validated = journalSummarySchema.safeParse(parsed);
    
    if (!validated.success) {
      console.error('[JournalAI] Schema validation failed:', validated.error);
      return null;
    }
    
    return validated.data;
  } catch (error) {
    console.error('[JournalAI] Error summarizing entry:', error);
    return null;
  }
}

export function getMockSummary(rawText: string): JournalSummary {
  const words = rawText.split(/\s+/).length;
  return {
    summary: words > 10 
      ? "This entry covers several thoughts and priorities for the day."
      : "Brief note captured.",
    top3: [
      "Key focus area identified",
      "Progress made on ongoing work",
      "Next steps outlined"
    ].slice(0, Math.min(3, Math.ceil(words / 20))),
    nextSteps: [
      "Review priorities for tomorrow",
      "Follow up on key items"
    ].slice(0, Math.min(2, Math.ceil(words / 30))),
    detectedTone: 'neutral',
  };
}

export { detectSignals, detectSafetyRisk, selectPromptsForSignals, PROMPT_LIBRARY } from "./prompts";
