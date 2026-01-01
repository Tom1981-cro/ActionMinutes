import { Express } from 'express';
import request from 'supertest';

export const TEST_USER = {
  email: 'test@actionminutes.com',
  password: 'testpassword123',
  name: 'Test User',
};

export const TEST_MEETING = {
  title: 'Q4 Roadmap Sync',
  date: new Date().toISOString(),
  rawNotes: `
    Mike needs to fix auth bug by Thursday.
    Sarah will handle the marketing deck for the board.
    Decision: We will delay mobile launch by 2 weeks.
    TODO: Update Jira roadmap.
    @Dave please review the contracts.
  `,
};

export async function loginAsTestUser(app: Express): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_USER.email, password: TEST_USER.password });
  
  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error('No session cookie returned');
  }
  return Array.isArray(cookies) ? cookies[0] : cookies;
}

export async function createTestMeeting(app: Express, cookie: string, overrides = {}) {
  const meetingData = { ...TEST_MEETING, ...overrides };
  
  const res = await request(app)
    .post('/api/meetings')
    .set('Cookie', cookie)
    .send(meetingData);
  
  return res.body;
}

export function getMockExtractionResult() {
  return {
    summary: "Team discussed Q4 roadmap with key blockers on API integration. Decision made to delay mobile launch by 2 weeks.",
    decisions: [{ text: "Delay mobile launch by 2 weeks to polish UI" }],
    actionItems: [
      { text: "Fix auth bug blocking API", ownerName: "Mike", dueDate: "Thursday", confidenceOwner: 0.95, confidenceDueDate: 0.90 },
      { text: "Finalize marketing deck for board", ownerName: "Sarah", confidenceOwner: 0.98, confidenceDueDate: 0.85 },
      { text: "Update Jira roadmap", ownerName: "Mike", confidenceOwner: 0.90, confidenceDueDate: 0.60 },
      { text: "Review contracts", ownerName: "Dave", confidenceOwner: 0.88, confidenceDueDate: 0.40 },
    ],
    risks: [{ text: "API integration blocked", severity: "high" }],
    clarifyingQuestions: [],
    qualityFlags: [],
  };
}

export function getMockDraftsResult() {
  return {
    drafts: [
      {
        type: "group",
        subject: "Follow-up: Q4 Roadmap Sync",
        body: "Hi team,\n\nThanks for attending today's sync. Here's a quick recap:\n\nKey Decision:\n- We will delay mobile launch by 2 weeks.\n\nAction Items:\n- Mike: Fix auth bug by Thursday\n- Sarah: Finalize marketing deck\n\nBest,\nTest User",
      },
      {
        type: "individual",
        recipientName: "Mike",
        subject: "Action Items from Q4 Roadmap Sync",
        body: "Hi Mike,\n\nFollowing up from our sync. You have the following action items:\n1. Fix auth bug blocking API (due: Thursday)\n2. Update Jira roadmap\n\nLet me know if you have any questions.\n\nBest,\nTest User",
      },
    ],
  };
}
