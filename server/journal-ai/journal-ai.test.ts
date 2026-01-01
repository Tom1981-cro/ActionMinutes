import { describe, it, expect, vi, beforeAll } from 'vitest';
import { 
  detectSignals, 
  detectSafetyRisk, 
  selectPromptsForSignals,
  PROMPT_LIBRARY,
  SIGNAL_KEYWORDS,
  SAFETY_KEYWORDS
} from './prompts';
import type { EntrySignal } from '../../shared/schema';

const mockCreate = vi.fn().mockResolvedValue({
  choices: [{
    message: {
      content: JSON.stringify({
        summary: "Test summary",
        top3: ["Point 1", "Point 2"],
        nextSteps: ["Action 1"],
        detectedTone: "neutral"
      })
    }
  }]
});

class MockOpenAI {
  chat = {
    completions: {
      create: mockCreate
    }
  };
}

vi.mock('openai', () => {
  return {
    default: MockOpenAI
  };
});

describe('Journal AI - Signal Detection', () => {
  it('should detect overwhelm signals', () => {
    const signals = detectSignals('I feel so stressed and overwhelmed with everything piling up');
    expect(signals).toContain('overwhelm');
  });

  it('should detect deadline signals', () => {
    const signals = detectSignals('This is urgent and due by Friday, need to finish ASAP');
    expect(signals).toContain('deadlines');
  });

  it('should detect conflict signals', () => {
    const signals = detectSignals('I had an argument with my coworker and there is tension');
    expect(signals).toContain('conflict');
  });

  it('should detect decision signals', () => {
    const signals = detectSignals('Should I take the new job? I am weighing my options');
    expect(signals).toContain('decision');
  });

  it('should detect avoidance signals', () => {
    const signals = detectSignals('I keep putting off this task and procrastinating');
    expect(signals).toContain('avoidance');
  });

  it('should detect multiple signals in one entry', () => {
    const signals = detectSignals('I am stressed about the deadline and keep avoiding the work');
    expect(signals).toContain('overwhelm');
    expect(signals).toContain('deadlines');
    expect(signals).toContain('avoidance');
  });

  it('should return empty array for neutral text', () => {
    const signals = detectSignals('Today was a normal day. I went to work and had lunch.');
    expect(signals).toHaveLength(0);
  });

  it('should be case insensitive', () => {
    const signals = detectSignals('I AM SO OVERWHELMED AND STRESSED');
    expect(signals).toContain('overwhelm');
  });
});

describe('Journal AI - Safety Risk Detection', () => {
  it('should detect self-harm keywords', () => {
    expect(detectSafetyRisk('I want to hurt myself')).toBe(true);
    expect(detectSafetyRisk('thinking about suicide')).toBe(true);
    expect(detectSafetyRisk('self-harm')).toBe(true);
    expect(detectSafetyRisk('I want to die')).toBe(true);
    expect(detectSafetyRisk('better off dead')).toBe(true);
  });

  it('should not trigger on normal stressful text', () => {
    expect(detectSafetyRisk('I feel overwhelmed and stressed')).toBe(false);
    expect(detectSafetyRisk('This deadline is killing me')).toBe(false);
    expect(detectSafetyRisk('I want to quit my job')).toBe(false);
    expect(detectSafetyRisk('I hate Mondays')).toBe(false);
  });

  it('should detect subtle concerning phrases', () => {
    expect(detectSafetyRisk("no point in living anymore")).toBe(true);
    expect(detectSafetyRisk("I don't want to be here")).toBe(true);
  });

  it('should handle empty and short text', () => {
    expect(detectSafetyRisk('')).toBe(false);
    expect(detectSafetyRisk('hi')).toBe(false);
  });
});

describe('Journal AI - Prompt Selection', () => {
  it('should return prompts matching detected signals', () => {
    const prompts = selectPromptsForSignals(['overwhelm', 'deadlines']);
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts.length).toBeLessThanOrEqual(3);
    
    const matchesSignal = prompts.every(p => 
      p.signals.includes('overwhelm') || p.signals.includes('deadlines')
    );
    expect(matchesSignal).toBe(true);
  });

  it('should return default prompts when no signals detected', () => {
    const prompts = selectPromptsForSignals([]);
    expect(prompts.length).toBeGreaterThan(0);
    
    const isReflectOrPlan = prompts.every(p => 
      p.intent === 'reflect' || p.intent === 'plan'
    );
    expect(isReflectOrPlan).toBe(true);
  });

  it('should respect maxPrompts parameter', () => {
    const prompts = selectPromptsForSignals(['overwhelm', 'deadlines', 'conflict'], 2);
    expect(prompts.length).toBeLessThanOrEqual(2);
  });

  it('should exclude prompts by ID', () => {
    const allPrompts = selectPromptsForSignals(['overwhelm'], 10, []);
    const excludeFirst = selectPromptsForSignals(['overwhelm'], 10, [allPrompts[0]?.id || '']);
    
    if (allPrompts.length > 0) {
      expect(excludeFirst.find(p => p.id === allPrompts[0].id)).toBeUndefined();
    }
  });

  it('should prefer variety in intents', () => {
    const prompts = selectPromptsForSignals(['overwhelm', 'avoidance', 'decision'], 4);
    const intents = new Set(prompts.map(p => p.intent));
    
    expect(intents.size).toBeGreaterThan(1);
  });

  it('should handle single signal correctly', () => {
    const prompts = selectPromptsForSignals(['decision']);
    expect(prompts.length).toBeGreaterThan(0);
    
    const hasDecision = prompts.some(p => p.signals.includes('decision'));
    expect(hasDecision).toBe(true);
  });
});

describe('Journal AI - Prompt Library', () => {
  it('should have exactly 25 prompts', () => {
    expect(PROMPT_LIBRARY).toHaveLength(25);
  });

  it('should have 5 prompts per intent', () => {
    const intents = ['clarify', 'prioritize', 'unblock', 'reflect', 'plan'];
    
    for (const intent of intents) {
      const count = PROMPT_LIBRARY.filter(p => p.intent === intent).length;
      expect(count).toBe(5);
    }
  });

  it('should have unique IDs for all prompts', () => {
    const ids = PROMPT_LIBRARY.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid signal arrays for all prompts', () => {
    const validSignals: EntrySignal[] = ['overwhelm', 'deadlines', 'conflict', 'decision', 'avoidance'];
    
    for (const prompt of PROMPT_LIBRARY) {
      expect(prompt.signals.length).toBeGreaterThan(0);
      expect(prompt.signals.every(s => validSignals.includes(s))).toBe(true);
    }
  });

  it('should cover all signals across the library', () => {
    const allSignals = new Set<EntrySignal>();
    for (const prompt of PROMPT_LIBRARY) {
      prompt.signals.forEach(s => allSignals.add(s));
    }
    
    expect(allSignals.size).toBe(5);
    expect(allSignals.has('overwhelm')).toBe(true);
    expect(allSignals.has('deadlines')).toBe(true);
    expect(allSignals.has('conflict')).toBe(true);
    expect(allSignals.has('decision')).toBe(true);
    expect(allSignals.has('avoidance')).toBe(true);
  });
});

describe('Journal AI - Summary Schema Validation', () => {
  it('should validate correct summary structure', async () => {
    const { journalSummarySchema } = await import('./index');
    const validSummary = {
      summary: 'A brief summary of the entry.',
      top3: ['Point 1', 'Point 2', 'Point 3'],
      nextSteps: ['Action 1', 'Action 2'],
      detectedTone: 'productive',
    };
    
    const result = journalSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', async () => {
    const { journalSummarySchema } = await import('./index');
    const missingSummary = {
      top3: ['Point 1'],
      nextSteps: [],
      detectedTone: 'neutral',
    };
    
    const result = journalSummarySchema.safeParse(missingSummary);
    expect(result.success).toBe(false);
  });

  it('should reject invalid detectedTone values', async () => {
    const { journalSummarySchema } = await import('./index');
    const invalidTone = {
      summary: 'Summary',
      top3: [],
      nextSteps: [],
      detectedTone: 'happy',
    };
    
    const result = journalSummarySchema.safeParse(invalidTone);
    expect(result.success).toBe(false);
  });

  it('should accept all valid tone values', async () => {
    const { journalSummarySchema } = await import('./index');
    const tones = ['productive', 'reflective', 'stressed', 'neutral'];
    
    for (const tone of tones) {
      const summary = {
        summary: 'Test',
        top3: [],
        nextSteps: [],
        detectedTone: tone,
      };
      
      const result = journalSummarySchema.safeParse(summary);
      expect(result.success).toBe(true);
    }
  });

  it('should validate top3 has max 3 items', async () => {
    const { journalSummarySchema } = await import('./index');
    const tooManyItems = {
      summary: 'Test',
      top3: ['1', '2', '3', '4', '5'],
      nextSteps: [],
      detectedTone: 'neutral',
    };
    
    const result = journalSummarySchema.safeParse(tooManyItems);
    expect(result.success).toBe(false);
  });

  it('should validate nextSteps has max 3 items', async () => {
    const { journalSummarySchema } = await import('./index');
    const tooManySteps = {
      summary: 'Test',
      top3: [],
      nextSteps: ['1', '2', '3', '4'],
      detectedTone: 'neutral',
    };
    
    const result = journalSummarySchema.safeParse(tooManySteps);
    expect(result.success).toBe(false);
  });
});

describe('Journal AI - Mock Summary', () => {
  it('should return valid summary for long text', async () => {
    const { getMockSummary } = await import('./index');
    const longText = 'Today I worked on several important projects and made good progress on the quarterly report. I also had a productive meeting with the team.';
    const summary = getMockSummary(longText);
    
    expect(summary.summary).toBeDefined();
    expect(summary.top3.length).toBeGreaterThan(0);
    expect(summary.nextSteps.length).toBeGreaterThan(0);
    expect(summary.detectedTone).toBe('neutral');
  });

  it('should return minimal summary for short text', async () => {
    const { getMockSummary } = await import('./index');
    const shortText = 'Quick note.';
    const summary = getMockSummary(shortText);
    
    expect(summary.summary).toBe('Brief note captured.');
    expect(summary.detectedTone).toBe('neutral');
  });

  it('should scale content based on word count', async () => {
    const { getMockSummary } = await import('./index');
    const short = getMockSummary('one two');
    const medium = getMockSummary('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty');
    
    expect(short.top3.length).toBeLessThanOrEqual(medium.top3.length);
  });
});

describe('Journal AI - Analyze Entry Integration', () => {
  it('should return complete analysis for text with signals', async () => {
    const { analyzeJournalEntry } = await import('./index');
    const analysis = await analyzeJournalEntry('I feel overwhelmed with deadlines and stressed about everything piling up');
    
    expect(analysis.signals).toContain('overwhelm');
    expect(analysis.signals).toContain('deadlines');
    expect(analysis.prompts.length).toBeGreaterThan(0);
    expect(analysis.safetyRisk).toBe(false);
  });

  it('should return empty signals for neutral text', async () => {
    const { analyzeJournalEntry } = await import('./index');
    const analysis = await analyzeJournalEntry('Had a regular day at work today.');
    
    expect(analysis.signals).toHaveLength(0);
    expect(analysis.prompts.length).toBeGreaterThan(0);
    expect(analysis.safetyRisk).toBe(false);
  });

  it('should detect safety risk in concerning text', async () => {
    const { analyzeJournalEntry } = await import('./index');
    const analysis = await analyzeJournalEntry('I feel like there is no point in living anymore');
    
    expect(analysis.safetyRisk).toBe(true);
  });

  it('should exclude previously shown prompts', async () => {
    const { analyzeJournalEntry } = await import('./index');
    const firstAnalysis = await analyzeJournalEntry('I am overwhelmed', []);
    const firstPromptId = firstAnalysis.prompts[0]?.id;
    
    if (firstPromptId) {
      const secondAnalysis = await analyzeJournalEntry('I am overwhelmed', [firstPromptId]);
      const hasExcluded = secondAnalysis.prompts.some(p => p.id === firstPromptId);
      expect(hasExcluded).toBe(false);
    }
  });
});

describe('Journal AI - Summarize Entry with AI', () => {
  it('should call OpenAI and return validated summary', async () => {
    const { summarizeJournalEntry } = await import('./index');
    const summary = await summarizeJournalEntry('I had a productive day working on multiple projects and meeting with the team.');
    
    expect(summary).not.toBeNull();
    expect(summary?.summary).toBeDefined();
    expect(summary?.top3).toBeDefined();
    expect(summary?.nextSteps).toBeDefined();
    expect(summary?.detectedTone).toBeDefined();
  });

  it('should return null when AI is disabled', async () => {
    const { summarizeJournalEntry } = await import('./index');
    const summary = await summarizeJournalEntry('Test entry', false);
    
    expect(summary).toBeNull();
  });

  it('should return null for very short text', async () => {
    const { summarizeJournalEntry } = await import('./index');
    const summary = await summarizeJournalEntry('Hi', true);
    
    expect(summary).toBeNull();
  });
});

describe('Journal AI - Version Tracking', () => {
  it('should have a valid version string', async () => {
    const { JOURNAL_PROMPT_VERSION } = await import('./index');
    expect(JOURNAL_PROMPT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });

  it('should be at version 1.0.0', async () => {
    const { JOURNAL_PROMPT_VERSION } = await import('./index');
    expect(JOURNAL_PROMPT_VERSION).toBe('v1.0.0');
  });
});

describe('Journal AI - Signal Keywords Coverage', () => {
  it('should have patterns for all signal types', () => {
    const signalTypes: EntrySignal[] = ['overwhelm', 'deadlines', 'conflict', 'decision', 'avoidance'];
    
    for (const signal of signalTypes) {
      expect(SIGNAL_KEYWORDS[signal]).toBeDefined();
      expect(SIGNAL_KEYWORDS[signal].length).toBeGreaterThan(0);
    }
  });

  it('should have valid regex patterns', () => {
    for (const [signal, patterns] of Object.entries(SIGNAL_KEYWORDS)) {
      for (const pattern of patterns) {
        expect(pattern).toBeInstanceOf(RegExp);
        expect(() => pattern.test('test')).not.toThrow();
      }
    }
  });
});

describe('Journal AI - Safety Keywords', () => {
  it('should have multiple safety patterns', () => {
    expect(SAFETY_KEYWORDS.length).toBeGreaterThan(5);
  });

  it('should have valid regex patterns', () => {
    for (const pattern of SAFETY_KEYWORDS) {
      expect(pattern).toBeInstanceOf(RegExp);
      expect(() => pattern.test('test')).not.toThrow();
    }
  });
});
