import { describe, it, expect } from 'vitest';
import { insertUserSchema } from '@shared/schema';
import { z } from 'zod';

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

  describe('User Insert Schema (from shared/schema.ts)', () => {
    it('should validate valid user creation', () => {
      const validUser = {
        email: 'newuser@example.com',
        password: 'securepassword',
        name: 'Test User',
      };
      
      const result = insertUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should require name field', () => {
      const userWithoutName = {
        email: 'noname@example.com',
        password: 'password123',
      };
      
      const result = insertUserSchema.safeParse(userWithoutName);
      expect(result.success).toBe(false);
    });

    it('should require email field', () => {
      const noEmail = {
        password: 'password123',
      };
      
      const result = insertUserSchema.safeParse(noEmail);
      expect(result.success).toBe(false);
    });

    it('should require password field', () => {
      const noPassword = {
        email: 'test@example.com',
      };
      
      const result = insertUserSchema.safeParse(noPassword);
      expect(result.success).toBe(false);
    });
  });
});
