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
    extract: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/extract`, {
      method: 'POST',
    }),
    getAttendees: (id: string) => fetchJSON(`${API_BASE}/api/meetings/${id}/attendees`),
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
  },
};
