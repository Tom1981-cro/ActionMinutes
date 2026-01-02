import { encryptToken, decryptToken, isEncryptionConfigured } from './crypto';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

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

// ==================== REPLIT CONNECTOR INTEGRATION ====================
// Gmail connector - uses Replit's managed OAuth
let gmailConnectionSettings: any;

async function getGmailAccessToken(): Promise<string> {
  if (gmailConnectionSettings && gmailConnectionSettings.settings.expires_at && 
      new Date(gmailConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return gmailConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Gmail connector not available');
  }

  gmailConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = gmailConnectionSettings?.settings?.access_token || 
                      gmailConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!gmailConnectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

export async function getUncachableGmailClient() {
  const accessToken = await getGmailAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Outlook connector - uses Replit's managed OAuth
let outlookConnectionSettings: any;

async function getOutlookAccessToken(): Promise<string> {
  if (outlookConnectionSettings && outlookConnectionSettings.settings.expires_at && 
      new Date(outlookConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return outlookConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Outlook connector not available');
  }

  outlookConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = outlookConnectionSettings?.settings?.access_token || 
                      outlookConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!outlookConnectionSettings || !accessToken) {
    throw new Error('Outlook not connected');
  }
  return accessToken;
}

export async function getUncachableOutlookClient() {
  const accessToken = await getOutlookAccessToken();
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

// Check if Replit connectors are available
export function isGmailConnectorAvailable(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && 
           (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

export function isOutlookConnectorAvailable(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && 
           (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

// ==================== LEGACY OAUTH FUNCTIONS ====================
// These are kept for backwards compatibility but prefer connectors

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

// ==================== CONNECTOR-BASED DRAFT CREATION ====================
// These functions use Replit connectors for OAuth instead of manual tokens

export async function createGmailDraftViaConnector(
  to: string,
  subject: string,
  body: string
): Promise<DraftResult> {
  try {
    const gmail = await getUncachableGmailClient();
    const rawEmail = createRawEmail(to, subject, body);
    
    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: rawEmail,
        },
      },
    });

    return {
      success: true,
      draftId: response.data.id || null,
      webLink: `https://mail.google.com/mail/u/0/#drafts/${response.data.message?.id}`,
    };
  } catch (error: any) {
    console.error('[Gmail Connector] Create draft failed:', error.message);
    return { 
      success: false, 
      draftId: null, 
      error: error.message || 'Failed to create Gmail draft via connector' 
    };
  }
}

export async function createOutlookDraftViaConnector(
  to: string,
  subject: string,
  body: string
): Promise<DraftResult> {
  try {
    const client = await getUncachableOutlookClient();
    
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

    const response = await client.api('/me/messages').post(draft);

    return {
      success: true,
      draftId: response.id,
      webLink: response.webLink,
    };
  } catch (error: any) {
    console.error('[Outlook Connector] Create draft failed:', error.message);
    return { 
      success: false, 
      draftId: null, 
      error: error.message || 'Failed to create Outlook draft via connector' 
    };
  }
}

// Smart draft creation - tries connector first, falls back to token-based
export async function createDraftSmart(
  provider: 'gmail' | 'outlook',
  accessToken: string | null,
  to: string,
  subject: string,
  body: string
): Promise<DraftResult> {
  if (provider === 'gmail') {
    if (isGmailConnectorAvailable()) {
      try {
        return await createGmailDraftViaConnector(to, subject, body);
      } catch (e) {
        console.log('[Gmail] Connector failed, falling back to token');
      }
    }
    if (accessToken) {
      return createGmailDraft(accessToken, to, subject, body);
    }
    return { success: false, draftId: null, error: 'Gmail not configured' };
  } else {
    if (isOutlookConnectorAvailable()) {
      try {
        return await createOutlookDraftViaConnector(to, subject, body);
      } catch (e) {
        console.log('[Outlook] Connector failed, falling back to token');
      }
    }
    if (accessToken) {
      return createOutlookDraft(accessToken, to, subject, body);
    }
    return { success: false, draftId: null, error: 'Outlook not configured' };
  }
}
