import { z } from "zod";
import { pool } from "./db";

const featureFlagsSchema = z.object({
  AI_FEATURE_ENABLED: z.string().transform(v => v === 'true').default('true'),
  INTEGRATIONS_FEATURE_ENABLED: z.string().transform(v => v === 'true').default('true'),
  PERSONAL_FEATURE_ENABLED: z.string().transform(v => v === 'true').default('true'),
  TEAM_FEATURE_ENABLED: z.string().transform(v => v === 'true').default('true'),
  REMINDERS_FEATURE_ENABLED: z.string().transform(v => v === 'true').default('false'),
});

export type FeatureFlags = {
  aiEnabled: boolean;
  integrationsEnabled: boolean;
  personalEnabled: boolean;
  teamEnabled: boolean;
  remindersEnabled: boolean;
};

export type ConfigStatus = {
  aiConfigured: boolean;
  gmailConfigured: boolean;
  outlookConfigured: boolean;
  databaseConnected: boolean;
  mobileBuildEnabled: boolean;
};

export type AppConfig = {
  features: FeatureFlags;
  status: ConfigStatus;
};

let cachedDbStatus: { connected: boolean; lastCheck: number } = { connected: true, lastCheck: 0 };
const DB_CHECK_INTERVAL = 30000;

function parseFeatureFlags(): FeatureFlags {
  const parsed = featureFlagsSchema.safeParse({
    AI_FEATURE_ENABLED: process.env.AI_FEATURE_ENABLED,
    INTEGRATIONS_FEATURE_ENABLED: process.env.INTEGRATIONS_FEATURE_ENABLED,
    PERSONAL_FEATURE_ENABLED: process.env.PERSONAL_FEATURE_ENABLED,
    TEAM_FEATURE_ENABLED: process.env.TEAM_FEATURE_ENABLED,
    REMINDERS_FEATURE_ENABLED: process.env.REMINDERS_FEATURE_ENABLED,
  });

  if (!parsed.success) {
    console.warn('[config] Feature flag parsing failed, using defaults');
    return {
      aiEnabled: true,
      integrationsEnabled: true,
      personalEnabled: true,
      teamEnabled: true,
      remindersEnabled: false,
    };
  }

  return {
    aiEnabled: parsed.data.AI_FEATURE_ENABLED,
    integrationsEnabled: parsed.data.INTEGRATIONS_FEATURE_ENABLED,
    personalEnabled: parsed.data.PERSONAL_FEATURE_ENABLED,
    teamEnabled: parsed.data.TEAM_FEATURE_ENABLED,
    remindersEnabled: parsed.data.REMINDERS_FEATURE_ENABLED,
  };
}

// Cache for connector status to avoid repeated API calls
let connectorStatusCache: { gmail: boolean; outlook: boolean; lastCheck: number } = {
  gmail: false,
  outlook: false,
  lastCheck: 0,
};
const CONNECTOR_CHECK_INTERVAL = 30000; // 30 seconds

async function checkReplitConnector(connectorName: string): Promise<boolean> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) return false;
  
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;
  
  if (!xReplitToken) return false;
  
  try {
    const response = await fetch(
      `https://${hostname}/api/v2/connection?connector_names=${connectorName}`,
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!(data.items && data.items.length > 0);
  } catch {
    return false;
  }
}

export async function checkConnectorStatus(): Promise<{ gmail: boolean; outlook: boolean }> {
  const now = Date.now();
  if (now - connectorStatusCache.lastCheck < CONNECTOR_CHECK_INTERVAL) {
    return { gmail: connectorStatusCache.gmail, outlook: connectorStatusCache.outlook };
  }
  
  // Check for Replit connector availability
  const hasConnectorHost = !!process.env.REPLIT_CONNECTORS_HOSTNAME;
  
  if (hasConnectorHost) {
    const [gmail, outlook] = await Promise.all([
      checkReplitConnector('google-mail'),
      checkReplitConnector('outlook'),
    ]);
    connectorStatusCache = { gmail, outlook, lastCheck: now };
    return { gmail, outlook };
  }
  
  // Fallback to manual credentials check
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const gmailManual = !!(googleClientId && googleClientSecret);
  
  const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
  const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const outlookManual = !!(microsoftClientId && microsoftClientSecret);
  
  connectorStatusCache = { gmail: gmailManual, outlook: outlookManual, lastCheck: now };
  return { gmail: gmailManual, outlook: outlookManual };
}

function checkConfigStatus(): ConfigStatus {
  // Check for AI - Replit integration uses AI_INTEGRATIONS_OPENAI_API_KEY
  const replitAiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const legacyAiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const aiConfigured = !!(replitAiKey || legacyAiKey);

  // Use cached connector status (updated async by checkConnectorStatus)
  const gmailConfigured = connectorStatusCache.gmail;
  const outlookConfigured = connectorStatusCache.outlook;

  const databaseUrl = process.env.DATABASE_URL;
  const capacitorEnabled = process.env.CAPACITOR_ENABLED;

  return {
    aiConfigured,
    gmailConfigured,
    outlookConfigured,
    databaseConnected: !!databaseUrl && cachedDbStatus.connected,
    mobileBuildEnabled: capacitorEnabled === 'true',
  };
}

export async function checkDatabaseConnection(): Promise<boolean> {
  const now = Date.now();
  if (now - cachedDbStatus.lastCheck < DB_CHECK_INTERVAL) {
    return cachedDbStatus.connected;
  }
  
  try {
    await pool.query('SELECT 1');
    cachedDbStatus = { connected: true, lastCheck: now };
    return true;
  } catch (error) {
    console.error('[config] Database connectivity check failed:', error);
    cachedDbStatus = { connected: false, lastCheck: now };
    return false;
  }
}

export function getAppConfig(): AppConfig {
  return {
    features: parseFeatureFlags(),
    status: checkConfigStatus(),
  };
}

export async function getAppConfigAsync(): Promise<AppConfig> {
  await Promise.all([
    checkDatabaseConnection(),
    checkConnectorStatus(),
  ]);
  return {
    features: parseFeatureFlags(),
    status: checkConfigStatus(),
  };
}

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const config = getAppConfig();
  return config.features[feature];
}

export function isConfigured(capability: keyof ConfigStatus): boolean {
  const config = getAppConfig();
  return config.status[capability];
}
