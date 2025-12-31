const API_BASE = '';

async function fetchJSON(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
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

  workspaces: {
    list: (userId: string) => fetchJSON(`${API_BASE}/api/workspaces?userId=${userId}`),
    get: (id: string) => fetchJSON(`${API_BASE}/api/workspaces/${id}`),
    create: (workspace: any) => fetchJSON(`${API_BASE}/api/workspaces`, {
      method: 'POST',
      body: JSON.stringify(workspace),
    }),
    update: (id: string, updates: any, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${id}?userId=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    delete: (id: string, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${id}?userId=${userId}`, {
      method: 'DELETE',
    }),
    getMembers: (id: string) => fetchJSON(`${API_BASE}/api/workspaces/${id}/members`),
    addMember: (workspaceId: string, member: any, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${workspaceId}/members?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify(member),
    }),
    updateMember: (workspaceId: string, memberId: string, updates: any, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${workspaceId}/members/${memberId}?userId=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
    removeMember: (workspaceId: string, memberId: string, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${workspaceId}/members/${memberId}?userId=${userId}`, {
      method: 'DELETE',
    }),
    getInvites: (id: string) => fetchJSON(`${API_BASE}/api/workspaces/${id}/invites`),
    createInvite: (workspaceId: string, email: string, role: string, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${workspaceId}/invites?userId=${userId}`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
    deleteInvite: (workspaceId: string, inviteId: string, userId: string) => fetchJSON(`${API_BASE}/api/workspaces/${workspaceId}/invites/${inviteId}?userId=${userId}`, {
      method: 'DELETE',
    }),
    acceptInvite: (token: string, userId: string) => fetchJSON(`${API_BASE}/api/invites/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  },

  meetings: {
    list: (userId: string, workspaceId?: string) => fetchJSON(`${API_BASE}/api/meetings?userId=${userId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`),
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
    getDecisions: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/decisions`),
    getRisks: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/risks`),
    getQuestions: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/questions`),
  },

  actions: {
    list: (userId: string, workspaceId?: string) => fetchJSON(`${API_BASE}/api/actions?userId=${userId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`),
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
    list: (userId: string, workspaceId?: string) => fetchJSON(`${API_BASE}/api/drafts?userId=${userId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`),
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
    list: (userId: string, workspaceId?: string) => fetchJSON(`${API_BASE}/api/ai-audit-logs?userId=${userId}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`),
    listForMeeting: (meetingId: string) => fetchJSON(`${API_BASE}/api/ai-audit-logs?meetingId=${meetingId}`),
  },
};
