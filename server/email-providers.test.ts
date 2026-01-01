import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  refreshGoogleToken,
  refreshMicrosoftToken,
  getGoogleUserInfo,
  getMicrosoftUserInfo,
  createGmailDraft,
  createOutlookDraft,
  prepareTokenForStorage,
  prepareTokenForUse,
} from './email-providers';
import { encryptToken, decryptToken, isEncryptionConfigured } from './crypto';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Email Providers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';
    process.env.MICROSOFT_CLIENT_ID = 'test-microsoft-client-id';
    process.env.MICROSOFT_CLIENT_SECRET = 'test-microsoft-secret';
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  describe('exchangeGoogleCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const result = await exchangeGoogleCode('test-code', 'http://localhost/callback');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code'),
      });

      await expect(exchangeGoogleCode('bad-code', 'http://localhost/callback'))
        .rejects.toThrow('Failed to exchange Google authorization code');
    });
  });

  describe('exchangeMicrosoftCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'microsoft-access-token',
        refresh_token: 'microsoft-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const result = await exchangeMicrosoftCode('test-code', 'http://localhost/callback');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw error on failed token exchange', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid code'),
      });

      await expect(exchangeMicrosoftCode('bad-code', 'http://localhost/callback'))
        .rejects.toThrow('Failed to exchange Microsoft authorization code');
    });
  });

  describe('refreshGoogleToken', () => {
    it('should refresh expired access token', async () => {
      const mockTokens = {
        access_token: 'new-google-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const result = await refreshGoogleToken('refresh-token');
      expect(result.access_token).toBe('new-google-access-token');
    });

    it('should throw error on failed refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Invalid refresh token'),
      });

      await expect(refreshGoogleToken('bad-refresh-token'))
        .rejects.toThrow('Failed to refresh Google token');
    });
  });

  describe('refreshMicrosoftToken', () => {
    it('should refresh expired access token', async () => {
      const mockTokens = {
        access_token: 'new-microsoft-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokens),
      });

      const result = await refreshMicrosoftToken('refresh-token');
      expect(result.access_token).toBe('new-microsoft-access-token');
    });
  });

  describe('getGoogleUserInfo', () => {
    it('should fetch user email from Google', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: 'user@gmail.com', name: 'Test User' }),
      });

      const result = await getGoogleUserInfo('access-token');
      expect(result.email).toBe('user@gmail.com');
      expect(result.name).toBe('Test User');
    });

    it('should throw error on failed user info fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(getGoogleUserInfo('bad-token'))
        .rejects.toThrow('Failed to get Google user info');
    });
  });

  describe('getMicrosoftUserInfo', () => {
    it('should fetch user email from Microsoft', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mail: 'user@outlook.com', displayName: 'Test User' }),
      });

      const result = await getMicrosoftUserInfo('access-token');
      expect(result.email).toBe('user@outlook.com');
      expect(result.name).toBe('Test User');
    });

    it('should fallback to userPrincipalName if mail is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ userPrincipalName: 'user@org.onmicrosoft.com', displayName: 'Test' }),
      });

      const result = await getMicrosoftUserInfo('access-token');
      expect(result.email).toBe('user@org.onmicrosoft.com');
    });
  });

  describe('createGmailDraft', () => {
    it('should create a draft in Gmail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'draft-123',
          message: { id: 'msg-456' },
        }),
      });

      const result = await createGmailDraft(
        'access-token',
        'recipient@example.com',
        'Test Subject',
        'Test body content'
      );

      expect(result.success).toBe(true);
      expect(result.draftId).toBe('draft-123');
      expect(result.webLink).toContain('mail.google.com');
    });

    it('should handle empty recipient', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'draft-123' }),
      });

      const result = await createGmailDraft(
        'access-token',
        '',
        'Test Subject',
        'Test body'
      );

      expect(result.success).toBe(true);
    });

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API error'),
      });

      const result = await createGmailDraft(
        'access-token',
        'recipient@example.com',
        'Test Subject',
        'Test body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create Gmail draft');
    });
  });

  describe('createOutlookDraft', () => {
    it('should create a draft in Outlook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'draft-abc',
          webLink: 'https://outlook.office.com/mail/draft/abc',
        }),
      });

      const result = await createOutlookDraft(
        'access-token',
        'recipient@example.com',
        'Test Subject',
        'Test body content'
      );

      expect(result.success).toBe(true);
      expect(result.draftId).toBe('draft-abc');
      expect(result.webLink).toContain('outlook.office.com');
    });

    it('should handle empty recipient', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'draft-abc' }),
      });

      const result = await createOutlookDraft(
        'access-token',
        '',
        'Test Subject',
        'Test body'
      );

      expect(result.success).toBe(true);
    });

    it('should return error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API error'),
      });

      const result = await createOutlookDraft(
        'access-token',
        'recipient@example.com',
        'Test Subject',
        'Test body'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create Outlook draft');
    });
  });
});

describe('Token Encryption', () => {
  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  it('should return plaintext when encryption key is not configured', () => {
    const token = 'my-plain-token';
    const stored = prepareTokenForStorage(token);
    const retrieved = prepareTokenForUse(stored);
    
    expect(stored).toBe(token);
    expect(retrieved).toBe(token);
  });

  it('should encrypt and decrypt tokens when key is configured', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
    
    const originalToken = 'my-secret-access-token';
    const encrypted = encryptToken(originalToken);
    
    expect(encrypted).not.toBe(originalToken);
    expect(encrypted.split(':').length).toBe(3);
    
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should handle decryption of unencrypted tokens gracefully', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!';
    
    const plainToken = 'plain-token-not-encrypted';
    const result = decryptToken(plainToken);
    
    expect(result).toBe(plainToken);
  });
});

describe('Graceful Degradation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should work without Google OAuth configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'draft-123' }),
    });

    const result = await createGmailDraft(
      'some-token',
      'test@example.com',
      'Subject',
      'Body'
    );
    
    expect(result.success).toBe(true);
  });

  it('should work without Microsoft OAuth configured', async () => {
    delete process.env.MICROSOFT_CLIENT_ID;
    delete process.env.MICROSOFT_CLIENT_SECRET;
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'draft-abc' }),
    });

    const result = await createOutlookDraft(
      'some-token',
      'test@example.com',
      'Subject',
      'Body'
    );
    
    expect(result.success).toBe(true);
  });

  it('should work without TOKEN_ENCRYPTION_KEY', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    
    const token = 'my-token';
    const stored = prepareTokenForStorage(token);
    const retrieved = prepareTokenForUse(stored);
    
    expect(stored).toBe(token);
    expect(retrieved).toBe(token);
  });
});
