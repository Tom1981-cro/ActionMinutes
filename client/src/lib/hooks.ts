import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useStore } from './store';

export function useMeetings() {
  const { user } = useStore();
  return useQuery({
    queryKey: ['meetings', user.id],
    queryFn: () => api.meetings.list(user.id),
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
  const { user } = useStore();
  
  return useMutation({
    mutationFn: api.meetings.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user.id] });
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
  const { user } = useStore();
  
  return useMutation({
    mutationFn: api.meetings.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', user.id] });
    },
  });
}

export function useExtractMeeting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.meetings.extract,
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

export function useActionItems() {
  const { user } = useStore();
  return useQuery({
    queryKey: ['actions', user.id],
    queryFn: () => api.actions.list(user.id),
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

export function useDrafts() {
  const { user } = useStore();
  return useQuery({
    queryKey: ['drafts', user.id],
    queryFn: () => api.drafts.list(user.id),
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
