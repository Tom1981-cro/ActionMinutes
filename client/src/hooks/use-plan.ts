import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export interface PlanUsage {
  aiExtractions: {
    used: number;
    limit: number;
    unlimited: boolean;
  };
  transcriptionMinutes: {
    used: number;
    limit: number;
    unlimited: boolean;
  };
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

export interface PlanInfo {
  plan: 'free' | 'pro' | 'team';
  planConfig: {
    name: string;
    tier: number;
    limits: {
      aiExtractionsPerMonth: number;
      transcriptionMinutesPerMonth: number;
      maxWorkspaces: number;
      maxMembersPerWorkspace: number;
    };
    capabilities: PlanCapabilities;
  };
  usage: PlanUsage;
  capabilities: PlanCapabilities;
}

async function fetchPlanInfo(): Promise<PlanInfo> {
  const token = localStorage.getItem("accessToken");
  const response = await fetch("/api/users/me/plan", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch plan info");
  }
  
  return response.json();
}

export function usePlan() {
  const { isAuthenticated } = useAuth();
  
  const { data: planInfo, isLoading, error, refetch } = useQuery({
    queryKey: ["user-plan"],
    queryFn: fetchPlanInfo,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  const isPro = planInfo?.plan === 'pro' || planInfo?.plan === 'team';
  const isTeam = planInfo?.plan === 'team';
  const isFree = planInfo?.plan === 'free' || !planInfo;
  
  const canUseAiExtraction = () => {
    if (!planInfo) return false;
    const { used, limit, unlimited } = planInfo.usage.aiExtractions;
    return unlimited || used < limit;
  };
  
  const canUseTranscription = () => {
    if (!planInfo) return false;
    const { used, limit, unlimited } = planInfo.usage.transcriptionMinutes;
    return unlimited || used < limit;
  };
  
  const canUseEmailIntegrations = planInfo?.capabilities?.emailIntegrations ?? false;
  const canUseWorkspaces = planInfo?.capabilities?.workspaces ?? false;
  const canUseTeamSeats = planInfo?.capabilities?.teamSeats ?? false;
  const hasPrioritySupport = planInfo?.capabilities?.prioritySupport ?? false;
  
  const getAiUsagePercent = () => {
    if (!planInfo || planInfo.usage.aiExtractions.unlimited) return 0;
    const { used, limit } = planInfo.usage.aiExtractions;
    return Math.min(100, Math.round((used / limit) * 100));
  };
  
  const getTranscriptionUsagePercent = () => {
    if (!planInfo || planInfo.usage.transcriptionMinutes.unlimited) return 0;
    const { used, limit } = planInfo.usage.transcriptionMinutes;
    return Math.min(100, Math.round((used / limit) * 100));
  };
  
  const getRemainingAiExtractions = () => {
    if (!planInfo) return 0;
    const { used, limit, unlimited } = planInfo.usage.aiExtractions;
    if (unlimited) return Infinity;
    return Math.max(0, limit - used);
  };
  
  const getRemainingTranscriptionMinutes = () => {
    if (!planInfo) return 0;
    const { used, limit, unlimited } = planInfo.usage.transcriptionMinutes;
    if (unlimited) return Infinity;
    return Math.max(0, limit - used);
  };
  
  return {
    planInfo,
    isLoading,
    error,
    refetch,
    plan: planInfo?.plan ?? 'free',
    isPro,
    isTeam,
    isFree,
    canUseAiExtraction,
    canUseTranscription,
    canUseEmailIntegrations,
    canUseWorkspaces,
    canUseTeamSeats,
    hasPrioritySupport,
    getAiUsagePercent,
    getTranscriptionUsagePercent,
    getRemainingAiExtractions,
    getRemainingTranscriptionMinutes,
    usage: planInfo?.usage,
    capabilities: planInfo?.capabilities,
  };
}
