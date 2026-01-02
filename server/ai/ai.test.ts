import { describe, it, expect } from 'vitest';
import { 
  extractionOutputSchema, 
  draftOutputSchema, 
  mapConfidenceToStatus, 
  hashInput,
  generateMockExtraction,
  generateMockDrafts
} from './index';

describe('AI Module', () => {
  describe('extractionOutputSchema', () => {
    it('validates valid extraction output', () => {
      const validOutput = {
        summary: "Meeting summary",
        decisions: [{ text: "Decision 1" }],
        actionItems: [{
          text: "Action item",
          ownerName: "John",
          confidenceOwner: 0.9,
          confidenceDueDate: 0.5
        }],
        risks: [{ text: "Risk", severity: "medium" }],
        clarifyingQuestions: [],
        qualityFlags: []
      };
      
      const result = extractionOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid severity', () => {
      const invalidOutput = {
        summary: "Meeting summary",
        decisions: [],
        actionItems: [],
        risks: [{ text: "Risk", severity: "critical" }],
        clarifyingQuestions: [],
        qualityFlags: []
      };
      
      const result = extractionOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('rejects too many clarifying questions', () => {
      const invalidOutput = {
        summary: "Meeting summary",
        decisions: [],
        actionItems: [],
        risks: [],
        clarifyingQuestions: [
          { text: "Q1" },
          { text: "Q2" },
          { text: "Q3" },
          { text: "Q4" }
        ],
        qualityFlags: []
      };
      
      const result = extractionOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('rejects confidence outside 0-1 range', () => {
      const invalidOutput = {
        summary: "Meeting summary",
        decisions: [],
        actionItems: [{
          text: "Action",
          confidenceOwner: 1.5,
          confidenceDueDate: 0.5
        }],
        risks: [],
        clarifyingQuestions: [],
        qualityFlags: []
      };
      
      const result = extractionOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('draftOutputSchema', () => {
    it('validates valid draft output', () => {
      const validOutput = {
        drafts: [{
          type: "group",
          subject: "Meeting Follow-up",
          body: "Thanks for attending"
        }]
      };
      
      const result = draftOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('rejects invalid draft type', () => {
      const invalidOutput = {
        drafts: [{
          type: "personal",
          subject: "Subject",
          body: "Body"
        }]
      };
      
      const result = draftOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('mapConfidenceToStatus', () => {
    it('returns needs_review when owner confidence is below threshold', () => {
      expect(mapConfidenceToStatus(0.5, 0.8)).toBe('needs_review');
    });

    it('returns needs_review when due date confidence is below threshold', () => {
      expect(mapConfidenceToStatus(0.8, 0.5)).toBe('needs_review');
    });

    it('returns needs_review when both are below threshold', () => {
      expect(mapConfidenceToStatus(0.3, 0.3)).toBe('needs_review');
    });

    it('returns open when both are at or above threshold', () => {
      expect(mapConfidenceToStatus(0.65, 0.65)).toBe('open');
    });

    it('returns open when both are well above threshold', () => {
      expect(mapConfidenceToStatus(0.9, 0.9)).toBe('open');
    });
  });

  describe('hashInput', () => {
    it('returns consistent hash for same input', () => {
      const input = "test input string";
      expect(hashInput(input)).toBe(hashInput(input));
    });

    it('returns different hash for different input', () => {
      expect(hashInput("input1")).not.toBe(hashInput("input2"));
    });

    it('returns 16 character hash', () => {
      expect(hashInput("test")).toHaveLength(16);
    });
  });

  describe('generateMockExtraction', () => {
    it('extracts action items from notes with action keywords', () => {
      const notes = "TODO: Review the document\n@John will complete the report";
      const result = generateMockExtraction(notes);
      
      expect(result.actionItems.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
    });

    it('returns at least one action item for empty notes', () => {
      const notes = "";
      const result = generateMockExtraction(notes);
      
      expect(result.actionItems.length).toBe(1);
    });

    it('adds quality flag for short notes', () => {
      const notes = "Short note\nAnother line";
      const result = generateMockExtraction(notes);
      
      expect(result.qualityFlags).toContain("Notes appear incomplete");
    });
  });

  describe('generateMockDrafts', () => {
    it('generates at least one group draft', () => {
      const result = generateMockDrafts(
        "Test Meeting",
        "Test summary",
        [{ text: "Action 1", ownerName: "John" }],
        ["John"]
      );
      
      const groupDraft = result.drafts.find(d => d.type === "group");
      expect(groupDraft).toBeDefined();
    });

    it('generates individual draft per owner', () => {
      const result = generateMockDrafts(
        "Test Meeting",
        "Test summary",
        [
          { text: "Action 1", ownerName: "John" },
          { text: "Action 2", ownerName: "Jane" }
        ],
        ["John", "Jane"]
      );
      
      const individualDrafts = result.drafts.filter(d => d.type === "individual");
      expect(individualDrafts.length).toBe(2);
    });
  });
});
