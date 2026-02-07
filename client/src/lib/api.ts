import { authenticatedFetch } from '@/hooks/use-auth';

const API_BASE = '';

async function fetchJSON(url: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await authenticatedFetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  auth: {
    getOrCreateDemoUser: () => fetchJSON(`${API_BASE}/api/auth/demo`, { method: 'POST' }),
  },
  
  users: {
    get: (id: string) => fetchJSON(`${API_BASE}/api/user/${id}`),
    update: (id: string, updates: any) => fetchJSON(`${API_BASE}/api/user/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  },

  meetings: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/meetings?userId=${userId}`),
    get: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}`),
    create: (meeting: any) => fetchJSON(`${API_BASE}/api/meetings`, {
      method: 'POST',
      body: JSON.stringify(meeting),
    }),
    update: (id: string, updates: any) => fetchJSON(`${API_BASE}/api/meetings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    delete: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}`, {
      method: 'DELETE',
    }),
    extract: (id: string, userId: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/extract?userId=${userId}`, {
      method: 'POST',
    }),
    generateDrafts: (id: string, userId: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/generate-drafts?userId=${userId}`, {
      method: 'POST',
    }),
    exportCalendar: async (id: string, userId: string, options?: { includeActionItems?: boolean }) => {
      const response = await fetch(`${API_BASE}/api/meetings/${id}/export-calendar?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options }),
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'meeting.ics';
      return { blob, filename };
    },
    getAttendees: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/attendees`),
    addAttendee: (meetingId: string, attendee: { name: string; email?: string }) => 
      fetchJSON(`${API_BASE}/api/meetings/${meetingId}/attendees`, {
        method: 'POST',
        body: JSON.stringify(attendee),
      }),
    getDecisions: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/decisions`),
    getRisks: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/risks`),
    getQuestions: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/questions`),
  },

  actions: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/actions?userId=${userId}`),
    listForMeeting: (meetingId: string) => fetchJSON(`${API_BASE}/api/actions?meetingId=${meetingId}`),
    get: (id: string) => fetchJSON(`${API_BASE}/api/actions/${id}`),
    create: (action: any) => fetchJSON(`${API_BASE}/api/actions`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
    update: (id: string, updates: any) => fetchJSON(`${API_BASE}/api/actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    delete: (id: string) => fetchJSON(`${API_BASE}/api/actions/${id}`, {
      method: 'DELETE',
    }),
  },

  drafts: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/drafts?userId=${userId}`),
    listForMeeting: (meetingId: string) => fetchJSON(`${API_BASE}/api/drafts?meetingId=${meetingId}`),
    get: (id: string) => fetchJSON(`${API_BASE}/api/drafts/${id}`),
    create: (draft: any) => fetchJSON(`${API_BASE}/api/drafts`, {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
    update: (id: string, updates: any) => fetchJSON(`${API_BASE}/api/drafts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    delete: (id: string) => fetchJSON(`${API_BASE}/api/drafts/${id}`, {
      method: 'DELETE',
    }),
    createGmailDraft: (id: string, userId: string) => fetchJSON(`${API_BASE}/api/drafts/${id}/create-gmail-draft?userId=${userId}`, {
      method: 'POST',
    }),
    createOutlookDraft: (id: string, userId: string) => fetchJSON(`${API_BASE}/api/drafts/${id}/create-outlook-draft?userId=${userId}`, {
      method: 'POST',
    }),
  },

  integrations: {
    getStatus: (userId: string) => fetchJSON(`${API_BASE}/api/integrations?userId=${userId}`),
    disconnect: (provider: string, userId: string) => fetchJSON(`${API_BASE}/api/integrations/${provider}?userId=${userId}`, {
      method: 'DELETE',
    }),
    getGoogleAuthUrl: () => fetchJSON(`${API_BASE}/api/oauth/google/start`),
    getMicrosoftAuthUrl: () => fetchJSON(`${API_BASE}/api/oauth/microsoft/start`),
  },

  calendarExports: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/calendar-exports?userId=${userId}`),
  },

  aiAuditLogs: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/ai-audit-logs?userId=${userId}`),
    listForMeeting: (meetingId: string) => fetchJSON(`${API_BASE}/api/ai-audit-logs?meetingId=${meetingId}`),
  },
};
