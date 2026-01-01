import { encryptToken, decryptToken, isEncryptionConfigured } from './crypto';

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

export interface DraftResult {
  success: boolean;
  draftId: string | null;
  webLink?: string;
  error?: string;
}

export interface UserInfo {
  email: string;
  name?: string;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Google OAuth] Token exchange failed:', error);
    throw new Error('Failed to exchange Google authorization code');
  }

  return response.json();
}

export async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'Mail.ReadWrite offline_access',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Microsoft OAuth] Token exchange failed:', error);
    throw new Error('Failed to exchange Microsoft authorization code');
  }

  return response.json();
}

export async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Google token');
  }

  return response.json();
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      scope: 'Mail.ReadWrite offline_access',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token');
  }

  return response.json();
}

export async function getGoogleUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get Google user info');
  }

  const data = await response.json();
  return { email: data.email, name: data.name };
}

export async function getMicrosoftUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get Microsoft user info');
  }

  const data = await response.json();
  return { email: data.mail || data.userPrincipalName, name: data.displayName };
}

export async function createGmailDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<DraftResult> {
  const rawEmail = createRawEmail(to, subject, body);
  
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        raw: rawEmail,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Gmail] Create draft failed:', error);
    return { success: false, draftId: null, error: 'Failed to create Gmail draft' };
  }

  const data = await response.json();
  return {
    success: true,
    draftId: data.id,
    webLink: `https://mail.google.com/mail/u/0/#drafts/${data.message?.id}`,
  };
}

export async function createOutlookDraft(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<DraftResult> {
  const draft = {
    subject,
    body: {
      contentType: 'Text',
      content: body,
    },
    toRecipients: to ? [
      {
        emailAddress: {
          address: to,
        },
      },
    ] : [],
  };

  const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[Outlook] Create draft failed:', error);
    return { success: false, draftId: null, error: 'Failed to create Outlook draft' };
  }

  const data = await response.json();
  return {
    success: true,
    draftId: data.id,
    webLink: data.webLink,
  };
}

function createRawEmail(to: string, subject: string, body: string): string {
  const email = [
    to ? `To: ${to}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].filter(Boolean).join('\r\n');

  return Buffer.from(email).toString('base64url');
}

export function prepareTokenForStorage(token: string): string {
  return encryptToken(token);
}

export function prepareTokenForUse(storedToken: string): string {
  return decryptToken(storedToken);
}
