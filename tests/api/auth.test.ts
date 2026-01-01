import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
});

describe('Auth API - Schema Validation', () => {
  describe('Login Request Schema', () => {
    it('should validate valid login request', () => {
      const validRequest = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const result = loginRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
        password: 'password123',
      };
      
      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const invalidRequest = {
        email: 'test@example.com',
        password: '',
      };
      
      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const invalidRequest = {
        password: 'password123',
      };
      
      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const invalidRequest = {
        email: 'test@example.com',
      };
      
      const result = loginRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('User Response Schema', () => {
    it('should validate valid user response', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        name: 'Test User',
      };
      
      const result = userResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should allow null name', () => {
      const validResponse = {
        id: '123',
        email: 'user@example.com',
        name: null,
      };
      
      const result = userResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should allow missing name', () => {
      const validResponse = {
        id: '123',
        email: 'user@example.com',
      };
      
      const result = userResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });
});

describe('Auth Logic', () => {
  describe('Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    it('should accept valid email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('user+tag@company.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
