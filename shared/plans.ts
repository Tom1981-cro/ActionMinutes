export type PlanType = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'none' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface PlanLimits {
  aiExtractionsPerMonth: number;
  transcriptionMinutesPerMonth: number;
  meetingHistoryDays: number;
  maxWorkspaces: number;
  maxTeamMembers: number;
}

export interface PlanCapabilities {
  unlimitedAiExtractions: boolean;
  unlimitedTranscription: boolean;
  unlimitedHistory: boolean;
  emailIntegrations: boolean;
  workspaces: boolean;
  teamSeats: boolean;
  prioritySupport: boolean;
  personalMode: boolean;
}

export interface PlanConfig {
  name: string;
  displayName: string;
  limits: PlanLimits;
  capabilities: PlanCapabilities;
  tier: number;
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'free',
    displayName: 'Starter',
    tier: 0,
    limits: {
      aiExtractionsPerMonth: 5,
      transcriptionMinutesPerMonth: 300,
      meetingHistoryDays: 7,
      maxWorkspaces: 0,
      maxTeamMembers: 1,
    },
    capabilities: {
      unlimitedAiExtractions: false,
      unlimitedTranscription: false,
      unlimitedHistory: false,
      emailIntegrations: false,
      workspaces: false,
      teamSeats: false,
      prioritySupport: false,
      personalMode: true,
    },
  },
  pro: {
    name: 'pro',
    displayName: 'Pro',
    tier: 1,
    limits: {
      aiExtractionsPerMonth: -1,
      transcriptionMinutesPerMonth: -1,
      meetingHistoryDays: -1,
      maxWorkspaces: 1,
      maxTeamMembers: 1,
    },
    capabilities: {
      unlimitedAiExtractions: true,
      unlimitedTranscription: true,
      unlimitedHistory: true,
      emailIntegrations: true,
      workspaces: false,
      teamSeats: false,
      prioritySupport: true,
      personalMode: true,
    },
  },
  team: {
    name: 'team',
    displayName: 'Team',
    tier: 2,
    limits: {
      aiExtractionsPerMonth: -1,
      transcriptionMinutesPerMonth: -1,
      meetingHistoryDays: -1,
      maxWorkspaces: 10,
      maxTeamMembers: 5,
    },
    capabilities: {
      unlimitedAiExtractions: true,
      unlimitedTranscription: true,
      unlimitedHistory: true,
      emailIntegrations: true,
      workspaces: true,
      teamSeats: true,
      prioritySupport: true,
      personalMode: true,
    },
  },
};

export function getPlanConfig(plan: string | null | undefined): PlanConfig {
  const normalizedPlan = (plan?.toLowerCase() || 'free') as PlanType;
  return PLAN_CONFIGS[normalizedPlan] || PLAN_CONFIGS.free;
}

export function isSubscriptionActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

export function getEffectivePlan(
  subscriptionPlan: string | null | undefined,
  subscriptionStatus: string | null | undefined
): PlanType {
  if (!isSubscriptionActive(subscriptionStatus)) {
    return 'free';
  }
  const plan = (subscriptionPlan?.toLowerCase() || 'free') as PlanType;
  return PLAN_CONFIGS[plan] ? plan : 'free';
}

export function hasCapability(
  plan: PlanType,
  capability: keyof PlanCapabilities
): boolean {
  return PLAN_CONFIGS[plan]?.capabilities[capability] ?? false;
}

export function getPlanLimit(
  plan: PlanType,
  limit: keyof PlanLimits
): number {
  return PLAN_CONFIGS[plan]?.limits[limit] ?? 0;
}

export function isPlanAtLeast(userPlan: PlanType, requiredPlan: PlanType): boolean {
  const userTier = PLAN_CONFIGS[userPlan]?.tier ?? 0;
  const requiredTier = PLAN_CONFIGS[requiredPlan]?.tier ?? 0;
  return userTier >= requiredTier;
}
