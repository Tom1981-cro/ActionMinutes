import { describe, it, expect } from 'vitest';
import { insertMeetingSchema } from '@shared/schema';

describe('Meetings API - Schema Validation (shared/schema.ts)', () => {
  describe('Meeting Insert Schema', () => {
    it('should validate valid meeting with all fields', () => {
      const validMeeting = {
        title: 'Q4 Roadmap Sync',
        userId: 'user-123',
        date: new Date(),
        rawNotes: 'Meeting notes here...',
        location: 'Conference Room A',
        duration: '60',
      };
      
      const result = insertMeetingSchema.safeParse(validMeeting);
      expect(result.success).toBe(true);
    });

    it('should require title field', () => {
      const noTitle = {
        userId: 'user-123',
        date: new Date(),
        rawNotes: 'Some notes',
      };
      
      const result = insertMeetingSchema.safeParse(noTitle);
      expect(result.success).toBe(false);
    });

    it('should require userId field', () => {
      const noUserId = {
        title: 'Meeting Title',
        date: new Date(),
        rawNotes: 'Some notes',
      };
      
      const result = insertMeetingSchema.safeParse(noUserId);
      expect(result.success).toBe(false);
    });

    it('should require date field', () => {
      const noDate = {
        title: 'Quick Sync',
        userId: 'user-456',
        rawNotes: 'Notes',
      };
      
      const result = insertMeetingSchema.safeParse(noDate);
      expect(result.success).toBe(false);
    });

    it('should require rawNotes field', () => {
      const noNotes = {
        title: 'Quick Sync',
        userId: 'user-456',
        date: new Date(),
      };
      
      const result = insertMeetingSchema.safeParse(noNotes);
      expect(result.success).toBe(false);
    });

    it('should accept date as Date object', () => {
      const meetingWithDate = {
        title: 'Dated Meeting',
        userId: 'user-123',
        date: new Date('2025-01-15T10:00:00Z'),
        rawNotes: 'Notes here',
      };
      
      const result = insertMeetingSchema.safeParse(meetingWithDate);
      expect(result.success).toBe(true);
    });

    it('should coerce string dates', () => {
      const meetingWithStringDate = {
        title: 'Meeting',
        userId: 'user-123',
        date: '2025-01-15T10:00:00Z',
        rawNotes: 'Notes here',
      };
      
      const result = insertMeetingSchema.safeParse(meetingWithStringDate);
      expect(result.success).toBe(true);
    });

    it('should accept optional location', () => {
      const meetingWithLocation = {
        title: 'Meeting',
        userId: 'user-123',
        date: new Date(),
        rawNotes: 'Notes',
        location: 'Virtual - Zoom',
      };
      
      const result = insertMeetingSchema.safeParse(meetingWithLocation);
      expect(result.success).toBe(true);
    });

    it('should accept optional workspaceId', () => {
      const teamMeeting = {
        title: 'Team Meeting',
        userId: 'user-123',
        workspaceId: 'workspace-456',
        date: new Date(),
        rawNotes: 'Team notes',
      };
      
      const result = insertMeetingSchema.safeParse(teamMeeting);
      expect(result.success).toBe(true);
    });
  });
});

describe('Meeting Parse State Logic', () => {
  const validTransitions: Record<string, string[]> = {
    draft: ['processing'],
    processing: ['parsed', 'error'],
    parsed: ['finalized', 'processing'],
    finalized: [],
    error: ['processing'],
  };

  const canTransition = (from: string, to: string): boolean => {
    return validTransitions[from]?.includes(to) ?? false;
  };

  it('should allow draft -> processing', () => {
    expect(canTransition('draft', 'processing')).toBe(true);
  });

  it('should allow processing -> parsed', () => {
    expect(canTransition('processing', 'parsed')).toBe(true);
  });

  it('should allow processing -> error', () => {
    expect(canTransition('processing', 'error')).toBe(true);
  });

  it('should allow parsed -> finalized', () => {
    expect(canTransition('parsed', 'finalized')).toBe(true);
  });

  it('should allow parsed -> processing (re-extraction)', () => {
    expect(canTransition('parsed', 'processing')).toBe(true);
  });

  it('should allow error -> processing (retry)', () => {
    expect(canTransition('error', 'processing')).toBe(true);
  });

  it('should not allow finalized -> any', () => {
    expect(canTransition('finalized', 'draft')).toBe(false);
    expect(canTransition('finalized', 'processing')).toBe(false);
    expect(canTransition('finalized', 'parsed')).toBe(false);
    expect(canTransition('finalized', 'error')).toBe(false);
  });

  it('should not allow draft -> parsed directly', () => {
    expect(canTransition('draft', 'parsed')).toBe(false);
  });

  it('should not allow draft -> finalized directly', () => {
    expect(canTransition('draft', 'finalized')).toBe(false);
  });
});
