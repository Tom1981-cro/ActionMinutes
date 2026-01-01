import { describe, it, expect } from 'vitest';
import { 
  draftOutputSchema, 
  generateMockDrafts 
} from '../../server/ai/index';

describe('Drafts API - Mock Mode', () => {
  describe('Mock Draft Generation', () => {
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

    it('should include group draft', () => {
      const result = generateMockDrafts(
        "Team Sync",
        "Summary",
        [],
        []
      );
      
      const groupDraft = result.drafts.find(d => d.type === "group");
      expect(groupDraft).toBeDefined();
      expect(groupDraft?.subject).toContain("Team Sync");
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
        [{ text: "Fix the bug", ownerName: "Dev" }],
        ["Dev"]
      );
      
      const devDraft = result.drafts.find(d => d.recipientName === "Dev");
      expect(devDraft?.body).toContain("Fix the bug");
    });
  });

  describe('Draft Schema Validation', () => {
    it('should accept valid draft types', () => {
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

    it('should require subject and body', () => {
      const missingSubject = {
        drafts: [{ type: "group", body: "Body" }],
      };
      const missingBody = {
        drafts: [{ type: "group", subject: "Subject" }],
      };
      
      expect(draftOutputSchema.safeParse(missingSubject).success).toBe(false);
      expect(draftOutputSchema.safeParse(missingBody).success).toBe(false);
    });
  });
});
