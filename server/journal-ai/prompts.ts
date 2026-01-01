import type { PromptIntent, EntrySignal } from '../../shared/schema';

export interface SmartPrompt {
  id: string;
  intent: PromptIntent;
  text: string;
  signals: EntrySignal[];
}

export const PROMPT_LIBRARY: SmartPrompt[] = [
  // CLARIFY - Help clarify unclear situations
  { id: 'c1', intent: 'clarify', text: "What's the one thing that's most unclear right now?", signals: ['decision', 'conflict'] },
  { id: 'c2', intent: 'clarify', text: "If you had to explain this to someone else, what would you say?", signals: ['decision', 'conflict'] },
  { id: 'c3', intent: 'clarify', text: "What information would help you move forward?", signals: ['avoidance', 'decision'] },
  { id: 'c4', intent: 'clarify', text: "What's the real question you're trying to answer?", signals: ['conflict', 'decision'] },
  { id: 'c5', intent: 'clarify', text: "What would 'done' look like for this situation?", signals: ['overwhelm', 'avoidance'] },
  
  // PRIORITIZE - Help focus on what matters most
  { id: 'p1', intent: 'prioritize', text: "What's the most important thing to tackle first?", signals: ['overwhelm', 'deadlines'] },
  { id: 'p2', intent: 'prioritize', text: "If you could only do one thing today, what would it be?", signals: ['overwhelm', 'deadlines'] },
  { id: 'p3', intent: 'prioritize', text: "What would have the biggest impact if you finished it?", signals: ['overwhelm', 'avoidance'] },
  { id: 'p4', intent: 'prioritize', text: "Which of these can wait until next week?", signals: ['deadlines', 'overwhelm'] },
  { id: 'p5', intent: 'prioritize', text: "What's urgent vs. what's important here?", signals: ['deadlines', 'decision'] },
  
  // UNBLOCK - Help overcome obstacles
  { id: 'u1', intent: 'unblock', text: "What's the smallest next step you could take right now?", signals: ['avoidance', 'overwhelm'] },
  { id: 'u2', intent: 'unblock', text: "What's stopping you from starting?", signals: ['avoidance', 'conflict'] },
  { id: 'u3', intent: 'unblock', text: "Who could help you move this forward?", signals: ['conflict', 'avoidance'] },
  { id: 'u4', intent: 'unblock', text: "What would make this easier to tackle?", signals: ['avoidance', 'overwhelm'] },
  { id: 'u5', intent: 'unblock', text: "What's the worst that could happen if you just tried?", signals: ['avoidance', 'decision'] },
  
  // REFLECT - Help process and learn
  { id: 'r1', intent: 'reflect', text: "What worked well today that you could do more of?", signals: ['overwhelm', 'conflict'] },
  { id: 'r2', intent: 'reflect', text: "What would you do differently next time?", signals: ['conflict', 'decision'] },
  { id: 'r3', intent: 'reflect', text: "What did you learn from this experience?", signals: ['conflict', 'decision'] },
  { id: 'r4', intent: 'reflect', text: "What are you proud of accomplishing?", signals: ['overwhelm', 'deadlines'] },
  { id: 'r5', intent: 'reflect', text: "What's one thing you're grateful for right now?", signals: ['overwhelm', 'conflict'] },
  
  // PLAN - Help create forward momentum
  { id: 'pl1', intent: 'plan', text: "What are your top 3 priorities for tomorrow?", signals: ['deadlines', 'overwhelm'] },
  { id: 'pl2', intent: 'plan', text: "What would make tomorrow a successful day?", signals: ['avoidance', 'deadlines'] },
  { id: 'pl3', intent: 'plan', text: "What deadline should you focus on first?", signals: ['deadlines', 'overwhelm'] },
  { id: 'pl4', intent: 'plan', text: "What's the first thing you'll do when you start?", signals: ['avoidance', 'decision'] },
  { id: 'pl5', intent: 'plan', text: "What support or resources do you need to succeed?", signals: ['overwhelm', 'avoidance'] },
];

export const SIGNAL_KEYWORDS: Record<EntrySignal, RegExp[]> = {
  overwhelm: [
    /too much/i, /overwhelm/i, /can't handle/i, /stressed/i, /swamped/i,
    /drowning/i, /exhausted/i, /burnt out/i, /burnout/i, /so many/i,
    /everything at once/i, /piling up/i, /never-ending/i, /impossible/i
  ],
  deadlines: [
    /deadline/i, /due (date|by|soon|tomorrow)/i, /time is running out/i,
    /by (monday|tuesday|wednesday|thursday|friday|end of|eod|eow)/i,
    /urgent/i, /asap/i, /running out of time/i, /behind schedule/i,
    /need to finish/i, /have to complete/i, /must be done/i
  ],
  conflict: [
    /disagree/i, /argument/i, /conflict/i, /tension/i, /frustrated with/i,
    /upset with/i, /angry at/i, /difficult person/i, /not getting along/i,
    /don't like/i, /annoyed/i, /they won't/i, /pushback/i, /blocked by/i
  ],
  decision: [
    /should I/i, /decide/i, /choice/i, /option/i, /not sure (if|whether)/i,
    /can't choose/i, /torn between/i, /weighing/i, /considering/i,
    /pros and cons/i, /dilemma/i, /which (one|way|path)/i, /uncertain/i
  ],
  avoidance: [
    /putting off/i, /procrastinat/i, /avoiding/i, /don't want to/i,
    /keep postponing/i, /haven't started/i, /dreading/i, /scared to/i,
    /can't bring myself/i, /keep delaying/i, /ignoring/i, /don't feel like/i
  ],
};

export const SAFETY_KEYWORDS = [
  /want to (die|end it|hurt myself|kill myself)/i,
  /suicid/i,
  /self.?harm/i,
  /don't want to (be here|live|exist)/i,
  /better off (dead|without me)/i,
  /end my life/i,
  /no point in living/i,
  /no reason to (go on|continue|live)/i,
];

export function detectSignals(text: string): EntrySignal[] {
  const signals: EntrySignal[] = [];
  
  for (const [signal, patterns] of Object.entries(SIGNAL_KEYWORDS)) {
    if (patterns.some(pattern => pattern.test(text))) {
      signals.push(signal as EntrySignal);
    }
  }
  
  return signals;
}

export function detectSafetyRisk(text: string): boolean {
  return SAFETY_KEYWORDS.some(pattern => pattern.test(text));
}

export function selectPromptsForSignals(
  signals: EntrySignal[],
  maxPrompts: number = 3,
  excludeIds: string[] = []
): SmartPrompt[] {
  if (signals.length === 0) {
    // Default prompts when no signals detected
    return PROMPT_LIBRARY
      .filter(p => !excludeIds.includes(p.id))
      .filter(p => p.intent === 'reflect' || p.intent === 'plan')
      .slice(0, maxPrompts);
  }
  
  // Score prompts based on signal matches
  const scored = PROMPT_LIBRARY
    .filter(p => !excludeIds.includes(p.id))
    .map(prompt => {
      const matchCount = prompt.signals.filter(s => signals.includes(s)).length;
      return { prompt, score: matchCount };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Get top prompts, ensuring variety of intents
  const selected: SmartPrompt[] = [];
  const usedIntents = new Set<PromptIntent>();
  
  for (const { prompt } of scored) {
    if (selected.length >= maxPrompts) break;
    
    // Prefer variety in intents if we have room
    if (selected.length < 2 || !usedIntents.has(prompt.intent)) {
      selected.push(prompt);
      usedIntents.add(prompt.intent);
    }
  }
  
  // Fill remaining slots if needed
  for (const { prompt } of scored) {
    if (selected.length >= maxPrompts) break;
    if (!selected.includes(prompt)) {
      selected.push(prompt);
    }
  }
  
  return selected;
}
