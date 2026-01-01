import { describe, it, expect } from 'vitest';
import { 
  extractionOutputSchema, 
  generateMockExtraction,
  mapConfidenceToStatus 
} from '../../server/ai/index';
import { TEST_MEETING } from '../test-utils';

describe('Extraction - Schema Validation (from server/ai/index.ts)', () => {
  describe('extractionOutputSchema', () => {
    it('should validate complete extraction output', () => {
      const validOutput = {
        summary: "Team discussed Q4 roadmap",
        decisions: [{ text: "Delay mobile launch by 2 weeks" }],
        actionItems: [
          { text: "Fix auth bug", ownerName: "Mike", dueDate: "Thursday", confidenceOwner: 0.95, confidenceDueDate: 0.90 }
        ],
        risks: [{ text: "API integration blocked", severity: "high" }],
        clarifyingQuestions: [],
        qualityFlags: [],
      };
      
      const result = extractionOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity values', () => {
      const invalidOutput = {
        summary: "Test",
        decisions: [],
        actionItems: [],
        risks: [{ text: "Risk", severity: "critical" }],
        clarifyingQuestions: [],
        qualityFlags: [],
      };
      
      const result = extractionOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should accept all valid severity values', () => {
      const validOutput = {
        summary: "Test",
        decisions: [],
        actionItems: [],
        risks: [
          { text: "Low risk", severity: "low" },
          { text: "Medium risk", severity: "medium" },
          { text: "High risk", severity: "high" },
        ],
        clarifyingQuestions: [],
        qualityFlags: [],
      };
      
      const result = extractionOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should require summary field', () => {
      const noSummary = {
        decisions: [],
        actionItems: [],
        risks: [],
        clarifyingQuestions: [],
        qualityFlags: [],
      };
      
      const result = extractionOutputSchema.safeParse(noSummary);
      expect(result.success).toBe(false);
    });
  });
});

describe('Extraction - Mock Generation (from server/ai/index.ts)', () => {
  describe('generateMockExtraction', () => {
    it('should generate valid extraction output from notes', () => {
      const result = generateMockExtraction(TEST_MEETING.rawNotes);
      
      const validation = extractionOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('should extract action items with TODO keyword', () => {
      const notes = "TODO: Complete the report by Friday";
      const result = generateMockExtraction(notes);
      
      expect(result.actionItems.length).toBeGreaterThan(0);
      expect(result.actionItems[0].text).toContain("Complete the report");
    });

    it('should extract action items with @mention', () => {
      const notes = "@John please review the document";
      const result = generateMockExtraction(notes);
      
      expect(result.actionItems.length).toBeGreaterThan(0);
      const johnAction = result.actionItems.find(a => a.ownerName === "John");
      expect(johnAction).toBeDefined();
    });

    it('should include summary in extraction', () => {
      const result = generateMockExtraction(TEST_MEETING.rawNotes);
      
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should validate confidence scores are in range', () => {
      const result = generateMockExtraction(TEST_MEETING.rawNotes);
      
      for (const action of result.actionItems) {
        expect(action.confidenceOwner).toBeGreaterThanOrEqual(0);
        expect(action.confidenceOwner).toBeLessThanOrEqual(1);
        expect(action.confidenceDueDate).toBeGreaterThanOrEqual(0);
        expect(action.confidenceDueDate).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('Extraction - Confidence Mapping (from server/ai/index.ts)', () => {
  describe('mapConfidenceToStatus', () => {
    it('should map low owner confidence to needs_review', () => {
      expect(mapConfidenceToStatus(0.4, 0.8)).toBe('needs_review');
    });

    it('should map low due date confidence to needs_review', () => {
      expect(mapConfidenceToStatus(0.8, 0.4)).toBe('needs_review');
    });

    it('should map high confidence to pending', () => {
      expect(mapConfidenceToStatus(0.7, 0.8)).toBe('pending');
      expect(mapConfidenceToStatus(0.9, 0.9)).toBe('pending');
    });

    it('should use 0.65 as threshold boundary', () => {
      expect(mapConfidenceToStatus(0.64, 0.65)).toBe('needs_review');
      expect(mapConfidenceToStatus(0.65, 0.65)).toBe('pending');
    });
  });
});
