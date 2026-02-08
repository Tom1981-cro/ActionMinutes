import OpenAI from "openai";
import { z } from "zod";
import crypto from "crypto";
import { getAppConfig } from "../config";

export const PROMPT_VERSION = "v1.0.0";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export const extractionOutputSchema = z.object({
  summary: z.string(),
  decisions: z.array(z.object({
    text: z.string(),
  })),
  actionItems: z.array(z.object({
    text: z.string(),
    ownerName: z.string().nullable().optional(),
    ownerEmail: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    confidenceOwner: z.number().min(0).max(1),
    confidenceDueDate: z.number().min(0).max(1),
  })),
  risks: z.array(z.object({
    text: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })),
  clarifyingQuestions: z.array(z.object({
    text: z.string(),
    options: z.array(z.string()).nullable().optional(),
  })).max(3),
  qualityFlags: z.array(z.string()),
});

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

export const draftOutputSchema = z.object({
  drafts: z.array(z.object({
    type: z.enum(["group", "individual"]),
    recipientName: z.string().nullable().optional(),
    recipientEmail: z.string().nullable().optional(),
    subject: z.string(),
    body: z.string(),
  })),
});

export type DraftOutput = z.infer<typeof draftOutputSchema>;

export function hashInput(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function mapConfidenceToStatus(confidenceOwner: number, confidenceDueDate: number): string {
  if (confidenceOwner < 0.65 || confidenceDueDate < 0.65) {
    return "needs_review";
  }
  return "open";
}

export const VALID_ACTION_STATUSES = ["needs_review", "open", "waiting", "done", "pending"] as const;
export type ActionStatus = typeof VALID_ACTION_STATUSES[number];

export function isValidActionStatus(status: string): status is ActionStatus {
  return VALID_ACTION_STATUSES.includes(status as ActionStatus);
}

function getExtractionPrompt(meetingTitle: string, attendees: string[], rawNotes: string): string {
  return `You are an expert meeting analyzer. Extract structured information from the following meeting notes.

MEETING: ${meetingTitle}
ATTENDEES: ${attendees.join(", ")}

NOTES:
${rawNotes}

Return ONLY valid JSON with this exact structure (no additional text):
{
  "summary": "A concise 2-3 sentence summary of the meeting",
  "decisions": [{"text": "Decision made"}],
  "actionItems": [{
    "text": "Action item description",
    "ownerName": "Person's name or null if unclear",
    "ownerEmail": "Email if mentioned, otherwise null",
    "dueDate": "ISO date string if mentioned, otherwise null",
    "confidenceOwner": 0.0-1.0 (how confident you are about the owner),
    "confidenceDueDate": 0.0-1.0 (how confident you are about the due date)
  }],
  "risks": [{"text": "Risk description", "severity": "low|medium|high"}],
  "clarifyingQuestions": [{"text": "Question about ambiguous content", "options": ["Option 1", "Option 2"]}],
  "qualityFlags": ["Flag if notes are incomplete, unclear, or missing context"]
}

Rules:
- Extract ALL action items mentioned, even if owner/date is unclear
- Set confidenceOwner to 0.0 if no owner mentioned
- Set confidenceDueDate to 0.0 if no date mentioned  
- Include max 3 clarifying questions for the most ambiguous items
- Be concise and professional in the summary
- Return ONLY the JSON object, no markdown, no explanation`;
}

function getDraftPrompt(
  meetingTitle: string,
  summary: string,
  actionItems: { text?: string; title?: string; ownerName?: string }[],
  decisions: { text: string }[],
  owners: string[],
  userTone: string
): string {
  return `Generate follow-up email drafts for a meeting.

MEETING: ${meetingTitle}
SUMMARY: ${summary}

DECISIONS:
${decisions.map(d => `- ${d.text}`).join("\n")}

ACTION ITEMS:
${actionItems.map(a => `- ${a.text || a.title} (Owner: ${a.ownerName || "Unassigned"})`).join("\n")}

Generate these drafts:
1. One GROUP email to all attendees summarizing the meeting
2. One INDIVIDUAL email for each of these owners: ${owners.join(", ")}

TONE: ${userTone}

Return ONLY valid JSON:
{
  "drafts": [
    {
      "type": "group",
      "recipientName": null,
      "recipientEmail": null,
      "subject": "Meeting Follow-up: [Title]",
      "body": "Email body text"
    },
    {
      "type": "individual",
      "recipientName": "Owner Name",
      "recipientEmail": null,
      "subject": "Action Items from [Title]",
      "body": "Personalized email body"
    }
  ]
}

Rules:
- Keep emails under 150 words
- Be direct and professional
- Only mention facts from the meeting - do NOT invent details
- Include specific action items for individuals
- Return ONLY the JSON, no markdown or explanation`;
}

export function generateMockExtraction(rawNotes: string): ExtractionOutput {
  const lines = rawNotes.split("\n").filter(l => l.trim());
  const actionPattern = /(?:todo|action|task|@\w+|will|should|need to)/i;
  const decisionPattern = /(?:decided|agreed|confirmed|approved)/i;
  const riskPattern = /(?:risk|concern|issue|problem|blocker)/i;

  const actionItems: ExtractionOutput["actionItems"] = [];
  const decisions: ExtractionOutput["decisions"] = [];
  const risks: ExtractionOutput["risks"] = [];

  for (const line of lines) {
    if (actionPattern.test(line)) {
      const nameMatch = line.match(/@(\w+)/);
      actionItems.push({
        text: line.replace(/@\w+/, "").trim(),
        ownerName: nameMatch ? nameMatch[1] : undefined,
        confidenceOwner: nameMatch ? 0.8 : 0.3,
        confidenceDueDate: 0.2,
      });
    } else if (decisionPattern.test(line)) {
      decisions.push({ text: line.trim() });
    } else if (riskPattern.test(line)) {
      risks.push({ text: line.trim(), severity: "medium" });
    }
  }

  if (actionItems.length === 0) {
    actionItems.push({
      text: "Review meeting notes and identify next steps",
      ownerName: undefined,
      confidenceOwner: 0.1,
      confidenceDueDate: 0.1,
    });
  }

  return {
    summary: `Meeting notes contain ${lines.length} lines with ${actionItems.length} potential action items, ${decisions.length} decisions, and ${risks.length} risks identified.`,
    decisions,
    actionItems,
    risks,
    clarifyingQuestions: actionItems.length > 0 && !actionItems[0].ownerName 
      ? [{ text: "Who should be assigned to the first action item?", options: ["Team Lead", "Project Manager", "TBD"] }]
      : [],
    qualityFlags: lines.length < 5 ? ["Notes appear incomplete"] : [],
  };
}

export function generateMockDrafts(
  meetingTitle: string,
  summary: string,
  actionItems: { text?: string; title?: string; ownerName?: string }[],
  owners: string[]
): DraftOutput {
  const drafts: DraftOutput["drafts"] = [];

  drafts.push({
    type: "group",
    subject: `Follow-up: ${meetingTitle}`,
    body: `Hi team,\n\nThank you for attending today's meeting.\n\n${summary}\n\nKey action items:\n${actionItems.slice(0, 3).map(a => `- ${a.text || a.title}`).join("\n")}\n\nPlease let me know if you have any questions.\n\nBest regards`,
  });

  for (const owner of owners) {
    const ownerActions = actionItems.filter(a => a.ownerName === owner);
    if (ownerActions.length > 0) {
      drafts.push({
        type: "individual",
        recipientName: owner,
        subject: `Your Action Items from ${meetingTitle}`,
        body: `Hi ${owner},\n\nFollowing our meeting, here are your action items:\n\n${ownerActions.map(a => `- ${a.text || a.title}`).join("\n")}\n\nPlease reach out if you need any clarification.\n\nThanks`,
      });
    }
  }

  return { drafts };
}

export async function extractMeetingNotes(
  meetingTitle: string,
  attendees: string[],
  rawNotes: string
): Promise<{ output: ExtractionOutput; provider: string; model: string; inputHash: string; validJson: boolean; errorText?: string }> {
  const inputHash = hashInput(`${meetingTitle}|${attendees.join(",")}|${rawNotes}`);
  const config = getAppConfig();

  if (!config.features.aiEnabled || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return {
      output: generateMockExtraction(rawNotes),
      provider: "mock",
      model: "deterministic",
      inputHash,
      validJson: true,
    };
  }

  try {
    const prompt = getExtractionPrompt(meetingTitle, attendees, rawNotes);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2048,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const validated = extractionOutputSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        output: generateMockExtraction(rawNotes),
        provider: "openai",
        model: "gpt-4o-mini",
        inputHash,
        validJson: false,
        errorText: validated.error.message,
      };
    }

    return {
      output: validated.data,
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: true,
    };
  } catch (error) {
    return {
      output: generateMockExtraction(rawNotes),
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: false,
      errorText: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function generateFollowUpDrafts(
  meetingTitle: string,
  summary: string,
  actionItems: { text: string; ownerName?: string }[],
  decisions: { text: string }[],
  userTone: string
): Promise<{ output: DraftOutput; provider: string; model: string; inputHash: string; validJson: boolean; errorText?: string }> {
  const owners = Array.from(new Set(actionItems.filter(a => a.ownerName).map(a => a.ownerName!)));
  const inputHash = hashInput(`${meetingTitle}|${summary}|${owners.join(",")}`);
  const config = getAppConfig();

  if (!config.features.aiEnabled || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return {
      output: generateMockDrafts(meetingTitle, summary, actionItems, owners),
      provider: "mock",
      model: "deterministic",
      inputHash,
      validJson: true,
    };
  }

  try {
    const prompt = getDraftPrompt(meetingTitle, summary, actionItems, decisions, owners, userTone);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2048,
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const validated = draftOutputSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        output: generateMockDrafts(meetingTitle, summary, actionItems, owners),
        provider: "openai",
        model: "gpt-4o-mini",
        inputHash,
        validJson: false,
        errorText: validated.error.message,
      };
    }

    return {
      output: validated.data,
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: true,
    };
  } catch (error) {
    return {
      output: generateMockDrafts(meetingTitle, summary, actionItems, owners),
      provider: "openai",
      model: "gpt-4o-mini",
      inputHash,
      validJson: false,
      errorText: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
