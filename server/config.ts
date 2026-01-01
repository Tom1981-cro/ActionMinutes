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

function checkConfigStatus(): ConfigStatus {
  const aiProvider = process.env.AI_PROVIDER;
  const aiApiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const microsoftClientId = process.env.MICROSOFT_CLIENT_ID;
  const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  const databaseUrl = process.env.DATABASE_URL;
  const capacitorEnabled = process.env.CAPACITOR_ENABLED;

  return {
    aiConfigured: !!(aiProvider && aiApiKey) || !!aiApiKey,
    gmailConfigured: !!(googleClientId && googleClientSecret),
    outlookConfigured: !!(microsoftClientId && microsoftClientSecret),
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
  await checkDatabaseConnection();
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
