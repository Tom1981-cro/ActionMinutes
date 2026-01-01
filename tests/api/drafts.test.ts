import { describe, it, expect } from 'vitest';
import { 
  draftOutputSchema, 
  generateMockDrafts 
} from '../../server/ai/index';

describe('Drafts - Schema Validation (from server/ai/index.ts)', () => {
  describe('draftOutputSchema', () => {
    it('should accept valid group draft', () => {
      const valid = {
        drafts: [
          { type: "group", subject: "Follow-up: Team Sync", body: "Hi team, here's the recap..." },
        ],
      };
      
      const result = draftOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept valid individual draft', () => {
      const valid = {
        drafts: [
          { type: "individual", recipientName: "John", subject: "Your Action Items", body: "Hi John..." },
        ],
      };
      
      const result = draftOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept mixed draft types', () => {
      const valid = {
        drafts: [
          { type: "group", subject: "Subject", body: "Body" },
          { type: "individual", recipientName: "John", subject: "Subject", body: "Body" },
        ],
      };
      
      const result = draftOutputSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid draft types', () => {
      const invalid = {
        drafts: [
          { type: "personal", subject: "Subject", body: "Body" },
        ],
      };
      
      const result = draftOutputSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require subject field', () => {
      const missingSubject = {
        drafts: [{ type: "group", body: "Body" }],
      };
      
      const result = draftOutputSchema.safeParse(missingSubject);
      expect(result.success).toBe(false);
    });

    it('should require body field', () => {
      const missingBody = {
        drafts: [{ type: "group", subject: "Subject" }],
      };
      
      const result = draftOutputSchema.safeParse(missingBody);
      expect(result.success).toBe(false);
    });
  });
});

describe('Drafts - Mock Generation (from server/ai/index.ts)', () => {
  describe('generateMockDrafts', () => {
    it('should generate valid draft output', () => {
      const result = generateMockDrafts(
        "Team Sync",
        "Meeting summary about project updates",
        [{ text: "Complete report", ownerName: "John" }],
        ["John", "Jane"]
      );
      
      const validation = draftOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });

    it('should include group draft with meeting title', () => {
      const result = generateMockDrafts(
        "Q4 Review",
        "Summary",
        [],
        []
      );
      
      const groupDraft = result.drafts.find(d => d.type === "group");
      expect(groupDraft).toBeDefined();
      expect(groupDraft?.subject).toContain("Q4 Review");
    });

    it('should generate individual drafts per owner', () => {
      const result = generateMockDrafts(
        "Project Review",
        "Summary",
        [
          { text: "Task 1", ownerName: "Alice" },
          { text: "Task 2", ownerName: "Bob" },
        ],
        ["Alice", "Bob"]
      );
      
      const individualDrafts = result.drafts.filter(d => d.type === "individual");
      expect(individualDrafts.length).toBe(2);
      
      const aliceDraft = individualDrafts.find(d => d.recipientName === "Alice");
      const bobDraft = individualDrafts.find(d => d.recipientName === "Bob");
      expect(aliceDraft).toBeDefined();
      expect(bobDraft).toBeDefined();
    });

    it('should include action items in individual drafts', () => {
      const result = generateMockDrafts(
        "Sprint Planning",
        "Summary",
        [{ text: "Fix the critical bug", ownerName: "Dev" }],
        ["Dev"]
      );
      
      const devDraft = result.drafts.find(d => d.recipientName === "Dev");
      expect(devDraft?.body).toContain("Fix the critical bug");
    });

    it('should handle empty action items', () => {
      const result = generateMockDrafts(
        "Status Update",
        "Brief summary",
        [],
        []
      );
      
      expect(result.drafts.length).toBeGreaterThan(0);
      const validation = draftOutputSchema.safeParse(result);
      expect(validation.success).toBe(true);
    });
  });
});
