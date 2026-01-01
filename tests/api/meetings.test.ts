import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const meetingRequestSchema = z.object({
  title: z.string().min(1),
  date: z.string().optional(),
  rawNotes: z.string().optional(),
  location: z.string().optional(),
  duration: z.number().optional(),
});

const parseStateSchema = z.enum(['draft', 'processing', 'parsed', 'finalized', 'error']);

describe('Meetings API - Schema Validation', () => {
  describe('Meeting Request Schema', () => {
    it('should validate valid meeting request', () => {
      const validRequest = {
        title: 'Q4 Roadmap Sync',
        date: new Date().toISOString(),
        rawNotes: 'Meeting notes here...',
      };
      
      const result = meetingRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const invalidRequest = {
        rawNotes: 'Some notes',
      };
      
      const result = meetingRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty title', () => {
      const invalidRequest = {
        title: '',
        rawNotes: 'Some notes',
      };
      
      const result = meetingRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const minimalRequest = {
        title: 'Quick Sync',
      };
      
      const result = meetingRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });

    it('should validate optional location', () => {
      const requestWithLocation = {
        title: 'Meeting',
        location: 'Conference Room A',
      };
      
      const result = meetingRequestSchema.safeParse(requestWithLocation);
      expect(result.success).toBe(true);
    });
  });

  describe('Parse State Schema', () => {
    it('should validate all valid parse states', () => {
      const validStates = ['draft', 'processing', 'parsed', 'finalized', 'error'];
      
      validStates.forEach(state => {
        const result = parseStateSchema.safeParse(state);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid parse states', () => {
      const invalidStates = ['pending', 'complete', 'cancelled', 'unknown'];
      
      invalidStates.forEach(state => {
        const result = parseStateSchema.safeParse(state);
        expect(result.success).toBe(false);
      });
    });
  });
});

describe('Meeting Logic', () => {
  describe('Parse State Machine', () => {
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
  });

  describe('Meeting Duration Calculation', () => {
    const calculateDuration = (startTime: Date, endTime: Date): number => {
      return Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)));
    };

    it('should calculate duration in minutes', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const end = new Date('2025-01-15T11:30:00Z');
      
      expect(calculateDuration(start, end)).toBe(90);
    });

    it('should return 0 for invalid range', () => {
      const start = new Date('2025-01-15T12:00:00Z');
      const end = new Date('2025-01-15T10:00:00Z');
      
      expect(calculateDuration(start, end)).toBe(0);
    });
  });
});
