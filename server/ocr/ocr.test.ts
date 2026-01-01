import { describe, it, expect } from 'vitest';
import { validateImageFile, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from './index';

describe('OCR Module', () => {
  describe('validateImageFile', () => {
    it('accepts valid JPEG file', () => {
      const result = validateImageFile({ mimetype: 'image/jpeg', size: 1024 * 1024 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('accepts valid PNG file', () => {
      const result = validateImageFile({ mimetype: 'image/png', size: 5 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });

    it('accepts valid WebP file', () => {
      const result = validateImageFile({ mimetype: 'image/webp', size: 2 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });

    it('rejects unsupported file types', () => {
      const result = validateImageFile({ mimetype: 'image/gif', size: 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });

    it('rejects PDF files', () => {
      const result = validateImageFile({ mimetype: 'application/pdf', size: 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported format');
    });

    it('rejects files larger than 10MB', () => {
      const result = validateImageFile({ mimetype: 'image/jpeg', size: 11 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('accepts files at exactly 10MB', () => {
      const result = validateImageFile({ mimetype: 'image/jpeg', size: 10 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });

    it('accepts small files', () => {
      const result = validateImageFile({ mimetype: 'image/png', size: 100 });
      expect(result.valid).toBe(true);
    });
  });

  describe('Constants', () => {
    it('MAX_FILE_SIZE is 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('ALLOWED_MIME_TYPES includes expected types', () => {
      expect(ALLOWED_MIME_TYPES).toContain('image/jpeg');
      expect(ALLOWED_MIME_TYPES).toContain('image/png');
      expect(ALLOWED_MIME_TYPES).toContain('image/webp');
      expect(ALLOWED_MIME_TYPES).not.toContain('image/gif');
      expect(ALLOWED_MIME_TYPES).not.toContain('application/pdf');
    });
  });
});
