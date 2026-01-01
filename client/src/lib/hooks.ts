import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';

// ==================== MEETINGS ====================
export function useMeetings() {
  const { user, currentWorkspaceId } = useStore();
  return useQuery({
    queryKey: ['meetings', user.id, currentWorkspaceId],
    queryFn: () => api.meetings.list(user.id, currentWorkspaceId || undefined),
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useMeeting(id: string | undefined) {
  return useQuery({
    queryKey: ['meetings', id],
    queryFn: () => api.meetings.get(id!),
    enabled: !!id,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useStore();
  
  return useMutation({
    mutationFn: api.meetings.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user.id, currentWorkspaceId] });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.meetings.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  const { user, currentWorkspaceId } = useStore();
  
  return useMutation({
    mutationFn: api.meetings.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user.id, currentWorkspaceId] });
    },
  });
}

export function useExtractMeeting() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: (meetingId: string) => api.meetings.extract(meetingId, user.id),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['ai-audit-logs'] });
    },
  });
}

export function useExportCalendar() {
  const { user } = useStore();
  
  return useMutation({
    mutationFn: async ({ meetingId, options }: { meetingId: string; options?: { includeActionItems?: boolean } }) => {
      const { blob, filename } = await api.meetings.exportCalendar(meetingId, user.id, options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { filename };
    },
  });
}

export function useGenerateDrafts() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: (meetingId: string) => api.meetings.generateDrafts(meetingId, user.id),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      queryClient.invalidateQueries({ queryKey: ['drafts', 'meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['ai-audit-logs'] });
    },
  });
}

// ==================== ACTION ITEMS ====================
export function useActionItems() {
  const { user, currentWorkspaceId } = useStore();
  return useQuery({
    queryKey: ['actions', user.id, currentWorkspaceId],
    queryFn: () => api.actions.list(user.id, currentWorkspaceId || undefined),
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useActionItemsForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['actions', 'meeting', meetingId],
    queryFn: () => api.actions.listForMeeting(meetingId!),
    enabled: !!meetingId,
  });
}

export function useDecisionsForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['decisions', 'meeting', meetingId],
    queryFn: () => api.meetings.getDecisions(meetingId!),
    enabled: !!meetingId,
  });
}

export function useRisksForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['risks', 'meeting', meetingId],
    queryFn: () => api.meetings.getRisks(meetingId!),
    enabled: !!meetingId,
  });
}

export function useQuestionsForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['questions', 'meeting', meetingId],
    queryFn: () => api.meetings.getQuestions(meetingId!),
    enabled: !!meetingId,
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.actions.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useCreateActionItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.actions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

// ==================== DRAFTS ====================
export function useDrafts() {
  const { user, currentWorkspaceId } = useStore();
  return useQuery({
    queryKey: ['drafts', user.id, currentWorkspaceId],
    queryFn: () => api.drafts.list(user.id, currentWorkspaceId || undefined),
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useDraftsForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['drafts', 'meeting', meetingId],
    queryFn: () => api.drafts.listForMeeting(meetingId!),
    enabled: !!meetingId,
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      api.drafts.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

export function useCreateGmailDraft() {
  const { user } = useStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (draftId: string) => api.drafts.createGmailDraft(draftId, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

export function useCreateOutlookDraft() {
  const { user } = useStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (draftId: string) => api.drafts.createOutlookDraft(draftId, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
    },
  });
}

// ==================== USER ====================
export function useUpdateUser() {
  const { user, updateUser } = useStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: any) => api.users.update(user.id, updates),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', user.id] });
    },
  });
}

// ==================== WORKSPACES ====================
export function useWorkspaces() {
  const { user, setWorkspaces } = useStore();
  return useQuery({
    queryKey: ['workspaces', user.id],
    queryFn: async () => {
      const workspaces = await api.workspaces.list(user.id);
      setWorkspaces(workspaces.map((w: any) => ({ id: w.id, name: w.name, role: 'member' })));
      return workspaces;
    },
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => api.workspaces.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: (name: string) => api.workspaces.create({ name, createdByUserId: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces', user.id] });
    },
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => api.workspaces.getMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: ({ workspaceId, email, role }: { workspaceId: string; email: string; role: string }) => 
      api.workspaces.createInvite(workspaceId, email, role, user.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', variables.workspaceId] });
    },
  });
}

export function useWorkspaceInvites(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: () => api.workspaces.getInvites(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: ({ workspaceId, memberId, role }: { workspaceId: string; memberId: string; role: string }) => 
      api.workspaces.updateMember(workspaceId, memberId, { role }, user.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) => 
      api.workspaces.removeMember(workspaceId, memberId, user.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', variables.workspaceId] });
    },
  });
}

// ==================== INTEGRATIONS ====================
export function useIntegrations() {
  const { user } = useStore();
  return useQuery({
    queryKey: ['integrations', user.id],
    queryFn: () => api.integrations.getStatus(user.id),
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  return useMutation({
    mutationFn: (provider: string) => api.integrations.disconnect(provider, user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', user.id] });
    },
  });
}

// ==================== CALENDAR EXPORTS ====================
export function useCalendarExports() {
  const { user } = useStore();
  return useQuery({
    queryKey: ['calendar-exports', user.id],
    queryFn: () => api.calendarExports.list(user.id),
    enabled: !!user.id && user.isAuthenticated,
  });
}

// ==================== AI AUDIT LOGS ====================
export function useAiAuditLogs() {
  const { user, currentWorkspaceId } = useStore();
  return useQuery({
    queryKey: ['ai-audit-logs', user.id, currentWorkspaceId],
    queryFn: () => api.aiAuditLogs.list(user.id, currentWorkspaceId || undefined),
    enabled: !!user.id && user.isAuthenticated,
  });
}

export function useAiAuditLogsForMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['ai-audit-logs', 'meeting', meetingId],
    queryFn: () => api.aiAuditLogs.listForMeeting(meetingId!),
    enabled: !!meetingId,
  });
}

// ==================== APP CONFIG ====================
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

export function useAppConfig() {
  return useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: async () => {
      const response = await fetch('/api/config/status');
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
