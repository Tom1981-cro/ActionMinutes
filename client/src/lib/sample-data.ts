export interface SampleMeeting {
  title: string;
  date: string;
  attendees: string;
  notes: string;
  extractedActions: Array<{
    text: string;
    ownerName: string;
    confidence: number;
    type: "action" | "decision" | "risk";
  }>;
  summary: string;
}

export interface SampleDraft {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
}

const DEMO_STORAGE_KEY = "actionminutes-demo-mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === "true";
}

export function enableDemoMode() {
  localStorage.setItem(DEMO_STORAGE_KEY, "true");
}

export function disableDemoMode() {
  localStorage.removeItem(DEMO_STORAGE_KEY);
}

export const SAMPLE_MEETINGS: SampleMeeting[] = [
  {
    title: "Q1 Product Planning",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: "Sarah Chen, Mike Rodriguez, Lisa Park",
    notes: `Discussed the Q1 roadmap priorities. Sarah presented the user research findings showing that 73% of users want better mobile experience. We agreed to prioritize the mobile app redesign over the admin dashboard refresh.

Mike raised concerns about the timeline - the engineering team is already stretched with the API migration. Lisa suggested we could bring in a contractor for the mobile work.

Key decisions:
- Mobile redesign will be the top priority for Q1
- API migration deadline extended to end of February
- Sarah will lead user testing sessions starting next week

Action items:
- Mike to provide updated timeline estimates by Friday
- Lisa to source 2-3 mobile contractor candidates
- Sarah to schedule user testing sessions for Jan 20-24
- All to review the competitor analysis document before next meeting

Risks:
- Contractor onboarding may take 2-3 weeks
- Mobile redesign scope could expand based on user testing results`,
    extractedActions: [
      { text: "Provide updated timeline estimates by Friday", ownerName: "Mike Rodriguez", confidence: 0.95, type: "action" },
      { text: "Source 2-3 mobile contractor candidates", ownerName: "Lisa Park", confidence: 0.92, type: "action" },
      { text: "Schedule user testing sessions for Jan 20-24", ownerName: "Sarah Chen", confidence: 0.94, type: "action" },
      { text: "Review competitor analysis document before next meeting", ownerName: "All", confidence: 0.88, type: "action" },
      { text: "Mobile redesign will be the top priority for Q1", ownerName: "", confidence: 0.96, type: "decision" },
      { text: "API migration deadline extended to end of February", ownerName: "", confidence: 0.93, type: "decision" },
      { text: "Contractor onboarding may take 2-3 weeks", ownerName: "", confidence: 0.85, type: "risk" },
      { text: "Mobile redesign scope could expand based on user testing results", ownerName: "", confidence: 0.78, type: "risk" },
    ],
    summary: "The team aligned on Q1 priorities, with mobile redesign taking precedence over the admin dashboard. Engineering concerns about bandwidth were addressed by bringing in contract help. User testing will begin next week to validate the mobile approach.",
  },
  {
    title: "Weekly Team Standup",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    attendees: "David Kim, Emma Wilson, Alex Torres",
    notes: `Quick sync on current sprint progress.

David: Completed the auth refactor. PR is ready for review. Found a bug in the session handling that affects logout - will fix today.

Emma: Working on the notification system. Backend is done, working on the email templates now. Should be ready for QA by Wednesday.

Alex: Blocked on the payment integration - waiting for Stripe API keys from finance team. In the meantime, working on unit tests for the billing module.

Next steps:
- David to fix session logout bug and merge auth PR
- Emma to finish email templates by Wednesday
- Alex to follow up with finance team about Stripe keys
- Code review session Thursday at 2pm for notification system`,
    extractedActions: [
      { text: "Fix session logout bug and merge auth PR", ownerName: "David Kim", confidence: 0.93, type: "action" },
      { text: "Finish email templates by Wednesday", ownerName: "Emma Wilson", confidence: 0.91, type: "action" },
      { text: "Follow up with finance team about Stripe keys", ownerName: "Alex Torres", confidence: 0.89, type: "action" },
      { text: "Code review session Thursday at 2pm for notification system", ownerName: "All", confidence: 0.87, type: "action" },
      { text: "Alex blocked on payment integration - waiting for Stripe API keys", ownerName: "", confidence: 0.82, type: "risk" },
    ],
    summary: "Sprint progress is on track. Auth refactor complete pending review, notification system backend done with templates in progress. Payment integration blocked on external dependency from finance team.",
  },
  {
    title: "Client Onboarding Review",
    date: new Date().toISOString(),
    attendees: "Rachel Brown, Tom Martinez",
    notes: `Reviewed the new client onboarding flow with stakeholders.

Current issues:
- Drop-off rate at step 3 (payment info) is 42%
- Average time to complete onboarding is 12 minutes (target: 5 min)
- Support tickets related to onboarding increased 30% last month

Proposed changes:
- Simplify payment step - allow trial without card
- Add progress indicator to show completion percentage
- Create interactive product tour instead of text-heavy walkthrough
- Implement autofill for company info using domain lookup

Rachel volunteered to design the new flow mockups. Tom will analyze which steps have the highest abandonment rates.

Decision: We'll implement the trial-without-card approach for the next release cycle.`,
    extractedActions: [
      { text: "Design new onboarding flow mockups", ownerName: "Rachel Brown", confidence: 0.94, type: "action" },
      { text: "Analyze which steps have highest abandonment rates", ownerName: "Tom Martinez", confidence: 0.91, type: "action" },
      { text: "Implement trial-without-card approach for next release", ownerName: "", confidence: 0.89, type: "decision" },
      { text: "42% drop-off rate at payment step needs immediate attention", ownerName: "", confidence: 0.76, type: "risk" },
    ],
    summary: "Onboarding flow has significant drop-off issues, particularly at the payment step. Team agreed to implement trial-without-card to reduce friction. Design mockups and data analysis will inform the redesign.",
  },
];

export const SAMPLE_DRAFTS: SampleDraft[] = [
  {
    recipientName: "Mike Rodriguez",
    recipientEmail: "mike@example.com",
    subject: "Re: Q1 Planning - Action Items",
    body: `Hi Mike,

Following up on our Q1 planning meeting. Here's a quick summary of your action items:

- Please provide updated timeline estimates by this Friday
- Review the competitor analysis document before our next meeting

The team agreed that mobile redesign will be the top priority, so your estimates will be crucial for setting realistic milestones.

Let me know if you need any support or have questions.

Best regards`,
  },
  {
    recipientName: "Lisa Park",
    recipientEmail: "lisa@example.com",
    subject: "Contractor Search - Mobile Redesign",
    body: `Hi Lisa,

As discussed in our Q1 planning session, we'd like to bring in contract help for the mobile redesign. Could you please source 2-3 mobile contractor candidates?

Key requirements:
- React Native or Flutter experience
- Available to start within 2 weeks
- Minimum 6-month engagement

Please share profiles by end of next week so we can begin interviews.

Thanks!`,
  },
];

export function getSampleMeetingNotes(): string {
  return SAMPLE_MEETINGS[0].notes;
}
