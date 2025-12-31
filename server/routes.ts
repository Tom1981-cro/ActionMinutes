import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertMeetingSchema, insertActionItemSchema, 
  insertFollowUpDraftSchema, insertAttendeeSchema, insertDecisionSchema,
  insertRiskSchema, insertClarifyingQuestionSchema,
  insertWorkspaceSchema, insertWorkspaceMemberSchema, insertWorkspaceInviteSchema,
  insertCalendarExportSchema, insertAiAuditLogSchema,
  type WorkspaceRole
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// ==================== RBAC HELPERS ====================
type Permission = 'read' | 'write' | 'manage' | 'delete';
type Resource = 'meeting' | 'action' | 'draft' | 'member' | 'invite' | 'workspace';

const rolePermissions: Record<WorkspaceRole, Record<Resource, Permission[]>> = {
  owner: {
    meeting: ['read', 'write', 'manage', 'delete'],
    action: ['read', 'write', 'manage', 'delete'],
    draft: ['read', 'write', 'manage', 'delete'],
    member: ['read', 'write', 'manage', 'delete'],
    invite: ['read', 'write', 'manage', 'delete'],
    workspace: ['read', 'write', 'manage', 'delete'],
  },
  admin: {
    meeting: ['read', 'write', 'manage', 'delete'],
    action: ['read', 'write', 'manage', 'delete'],
    draft: ['read', 'write', 'manage', 'delete'],
    member: ['read', 'write', 'manage'],
    invite: ['read', 'write', 'manage', 'delete'],
    workspace: ['read', 'write'],
  },
  member: {
    meeting: ['read', 'write'],
    action: ['read', 'write'],
    draft: ['read', 'write'],
    member: ['read'],
    invite: ['read'],
    workspace: ['read'],
  },
  viewer: {
    meeting: ['read'],
    action: ['read'],
    draft: ['read'],
    member: ['read'],
    invite: [],
    workspace: ['read'],
  },
};

function hasPermission(role: WorkspaceRole, resource: Resource, permission: Permission): boolean {
  return rolePermissions[role]?.[resource]?.includes(permission) || false;
}

async function checkWorkspaceAccess(userId: string, workspaceId: string, resource: Resource, permission: Permission): Promise<boolean> {
  const member = await storage.getWorkspaceMember(workspaceId, userId);
  if (!member) return false;
  return hasPermission(member.role as WorkspaceRole, resource, permission);
}

// ==================== CALENDAR EXPORT HELPERS ====================
function generateICS(meeting: any, actions: any[], options: { includeActionItems?: boolean } = {}): string {
  const uid = meeting.id;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtstart = new Date(meeting.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let description = meeting.summary || '';
  if (actions.length > 0 && options.includeActionItems) {
    description += '\\n\\nAction Items:\\n';
    actions.forEach((a, i) => {
      description += `${i + 1}. ${a.text}${a.ownerName ? ` (${a.ownerName})` : ''}\\n`;
    });
  }

  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ActionMinutes//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
SUMMARY:${meeting.title}
DESCRIPTION:${description}
${meeting.location ? `LOCATION:${meeting.location}` : ''}
END:VEVENT`;

  // Add action items as separate VTODO entries if they have due dates
  if (options.includeActionItems) {
    actions.filter(a => a.dueDate).forEach(action => {
      const actionDue = new Date(action.dueDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      icsContent += `
BEGIN:VTODO
UID:${action.id}
DTSTAMP:${dtstamp}
DUE:${actionDue}
SUMMARY:${action.text}
DESCRIPTION:${action.ownerName ? `Assigned to: ${action.ownerName}` : ''}
END:VTODO`;
    });
  }

  icsContent += `
END:VCALENDAR`;

  return icsContent;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== USER ROUTES ====================
  app.get("/api/user/email/:email", async (req, res) => {
    const user = await storage.getUserByEmail(req.params.email);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.get("/api/user/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/user", async (req, res) => {
    try {
      const validatedUser = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedUser);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/user/:id", async (req, res) => {
    const user = await storage.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/auth/demo", async (req, res) => {
    const demoEmail = "demo@actionminutes.com";
    let user = await storage.getUserByEmail(demoEmail);
    
    if (!user) {
      user = await storage.createUser({
        email: demoEmail,
        password: "demo-password-hashed",
        name: "Demo User",
        tone: "direct",
        timezone: "UTC",
        aiEnabled: true,
        autoGenerateDrafts: true,
        enablePersonal: true
      });
    }
    
    res.json(user);
  });

  // ==================== SEED DATA ROUTE ====================
  app.post("/api/seed", async (req, res) => {
    try {
      // Test user credentials: test@actionminutes.com / testpass123
      const testEmail = "test@actionminutes.com";
      let user = await storage.getUserByEmail(testEmail);
      
      if (!user) {
        user = await storage.createUser({
          email: testEmail,
          password: "testpass123",
          name: "Alex Thompson",
          tone: "friendly",
          timezone: "America/New_York",
          aiEnabled: true,
          autoGenerateDrafts: true,
          enablePersonal: true
        });
      }

      // Check if seed data already exists
      const existingMeetings = await storage.getMeetings(user.id);
      if (existingMeetings.length > 0) {
        return res.json({ message: "Seed data already exists", user });
      }

      // Create sample meetings
      const meeting1 = await storage.createMeeting({
        userId: user.id,
        title: "Q1 Planning Sprint Kickoff",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        rawNotes: "Discussed Q1 goals and priorities. Need to finalize roadmap by Friday. Sarah will lead the design review. Mike to set up new CI/CD pipeline.",
        summary: "Sprint kickoff focusing on Q1 deliverables. Key initiatives: mobile app v2.0, API performance improvements, and new analytics dashboard.",
        parseState: "finalized",
        workspaceId: null,
      });

      const meeting2 = await storage.createMeeting({
        userId: user.id,
        title: "Product Design Review",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
        rawNotes: "Reviewed new onboarding flow mockups. Team liked the simplified 3-step approach. Need to A/B test with existing flow.",
        summary: "Design review for new user onboarding. Approved simplified 3-step flow pending A/B test results.",
        parseState: "parsed",
        workspaceId: null,
      });

      const meeting3 = await storage.createMeeting({
        userId: user.id,
        title: "Weekly Team Standup",
        date: new Date(),
        rawNotes: "Quick sync on blockers. Database migration still pending review. Frontend team finished the dashboard components.",
        summary: "Team standup - database migration is the main blocker, dashboard UI complete.",
        parseState: "draft",
        workspaceId: null,
      });

      // Create action items with various states
      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Finalize Q1 roadmap document and share with stakeholders",
        ownerName: "Alex Thompson",
        ownerEmail: "test@actionminutes.com",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        status: "open",
        confidenceOwner: 0.95,
        confidenceDueDate: 0.9,
      });

      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Set up new CI/CD pipeline for staging environment",
        ownerName: "Mike Chen",
        ownerEmail: "mike@example.com",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        status: "open",
        confidenceOwner: 0.85,
        confidenceDueDate: 0.8,
      });

      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Schedule design review session with UX team",
        ownerName: "Sarah Lee",
        ownerEmail: "sarah@example.com",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        status: "needs_review",
        confidenceOwner: 0.5,
        confidenceDueDate: 0.6,
      });

      await storage.createActionItem({
        meetingId: meeting2.id,
        text: "Create A/B test plan for new onboarding flow",
        ownerName: "Alex Thompson",
        ownerEmail: "test@actionminutes.com",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "open",
        confidenceOwner: 0.9,
        confidenceDueDate: 0.85,
      });

      await storage.createActionItem({
        meetingId: meeting2.id,
        text: "Review competitor onboarding experiences",
        ownerName: null,
        ownerEmail: null,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // overdue
        status: "needs_review",
        confidenceOwner: 0.3,
        confidenceDueDate: 0.4,
      });

      await storage.createActionItem({
        meetingId: meeting3.id,
        text: "Complete database migration review",
        ownerName: "Database Team",
        ownerEmail: null,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: "waiting",
        confidenceOwner: 0.7,
        confidenceDueDate: 0.9,
      });

      // Create follow-up drafts
      await storage.createDraft({
        userId: user.id,
        meetingId: meeting1.id,
        type: "follow_up",
        tone: "friendly",
        subject: "Follow-up: Q1 Planning Sprint Kickoff",
        recipientName: "Team",
        recipientEmail: "team@example.com",
        body: `Hi Team,

Thanks for joining the Q1 planning kickoff. Here's a quick recap:

Key Decisions:
- Q1 focus: Mobile app v2.0, API performance, Analytics dashboard
- Design review scheduled for next week
- CI/CD pipeline upgrade in progress

Action Items:
- Alex: Finalize roadmap by Friday
- Mike: Set up CI/CD pipeline
- Sarah: Lead design review

Let me know if I missed anything!

Best,
Alex`,
      });

      await storage.createDraft({
        userId: user.id,
        meetingId: meeting2.id,
        type: "follow_up",
        tone: "friendly",
        subject: "Design Review Notes - New Onboarding Flow",
        recipientName: "Design Team",
        recipientEmail: "design@example.com",
        body: `Hi Design Team,

Great session today! The new 3-step onboarding looks promising.

Next steps:
1. Set up A/B test framework
2. Define success metrics
3. Plan rollout timeline

Thanks!
Alex`,
      });

      res.json({ 
        message: "Seed data created successfully", 
        user,
        credentials: {
          email: "test@actionminutes.com",
          password: "testpass123"
        }
      });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Seed failed" });
    }
  });

  // ==================== WORKSPACE ROUTES ====================
  app.get("/api/workspaces", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const workspaces = await storage.getWorkspaces(userId);
    res.json(workspaces);
  });

  app.get("/api/workspaces/:id", async (req, res) => {
    const workspace = await storage.getWorkspace(req.params.id);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    res.json(workspace);
  });

  app.post("/api/workspaces", async (req, res) => {
    try {
      const validatedWorkspace = insertWorkspaceSchema.parse(req.body);
      const workspace = await storage.createWorkspace(validatedWorkspace);
      
      // Auto-add creator as owner
      await storage.createWorkspaceMember({
        workspaceId: workspace.id,
        userId: validatedWorkspace.createdByUserId,
        role: 'owner',
      });
      
      res.json(workspace);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/workspaces/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const canEdit = await checkWorkspaceAccess(userId, req.params.id, 'workspace', 'write');
    if (!canEdit) return res.status(403).json({ error: "Permission denied" });
    
    const workspace = await storage.updateWorkspace(req.params.id, req.body);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    res.json(workspace);
  });

  app.delete("/api/workspaces/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const canDelete = await checkWorkspaceAccess(userId, req.params.id, 'workspace', 'delete');
    if (!canDelete) return res.status(403).json({ error: "Only owner can delete workspace" });
    
    await storage.deleteWorkspace(req.params.id);
    res.json({ success: true });
  });

  // ==================== WORKSPACE MEMBER ROUTES ====================
  app.get("/api/workspaces/:id/members", async (req, res) => {
    const members = await storage.getWorkspaceMembers(req.params.id);
    res.json(members);
  });

  app.post("/api/workspaces/:id/members", async (req, res) => {
    const requesterId = req.query.userId as string;
    if (!requesterId) return res.status(400).json({ error: "userId is required" });
    
    const canManage = await checkWorkspaceAccess(requesterId, req.params.id, 'member', 'manage');
    if (!canManage) return res.status(403).json({ error: "Permission denied" });
    
    try {
      const validatedMember = insertWorkspaceMemberSchema.parse({
        ...req.body,
        workspaceId: req.params.id,
      });
      const member = await storage.createWorkspaceMember(validatedMember);
      res.json(member);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/workspaces/:workspaceId/members/:memberId", async (req, res) => {
    const requesterId = req.query.userId as string;
    if (!requesterId) return res.status(400).json({ error: "userId is required" });
    
    const canManage = await checkWorkspaceAccess(requesterId, req.params.workspaceId, 'member', 'manage');
    if (!canManage) return res.status(403).json({ error: "Permission denied" });
    
    // Prevent changing owner role
    if (req.body.role === 'owner') {
      return res.status(400).json({ error: "Cannot change role to owner" });
    }
    
    const member = await storage.updateWorkspaceMember(req.params.memberId, req.body);
    if (!member) return res.status(404).json({ error: "Member not found" });
    res.json(member);
  });

  app.delete("/api/workspaces/:workspaceId/members/:memberId", async (req, res) => {
    const requesterId = req.query.userId as string;
    if (!requesterId) return res.status(400).json({ error: "userId is required" });
    
    const canDelete = await checkWorkspaceAccess(requesterId, req.params.workspaceId, 'member', 'delete');
    if (!canDelete) return res.status(403).json({ error: "Permission denied" });
    
    await storage.deleteWorkspaceMember(req.params.memberId);
    res.json({ success: true });
  });

  // ==================== WORKSPACE INVITE ROUTES ====================
  app.get("/api/workspaces/:id/invites", async (req, res) => {
    const invites = await storage.getWorkspaceInvites(req.params.id);
    res.json(invites);
  });

  app.post("/api/workspaces/:id/invites", async (req, res) => {
    const requesterId = req.query.userId as string;
    if (!requesterId) return res.status(400).json({ error: "userId is required" });
    
    const canInvite = await checkWorkspaceAccess(requesterId, req.params.id, 'invite', 'write');
    if (!canInvite) return res.status(403).json({ error: "Permission denied" });
    
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const validatedInvite = insertWorkspaceInviteSchema.parse({
        ...req.body,
        workspaceId: req.params.id,
        token,
        expiresAt,
      });
      const invite = await storage.createWorkspaceInvite(validatedInvite);
      res.json(invite);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    const userId = req.body.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const invite = await storage.getWorkspaceInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    
    if (invite.acceptedAt) {
      return res.status(400).json({ error: "Invite already accepted" });
    }
    
    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ error: "Invite has expired" });
    }
    
    // Add user to workspace
    await storage.createWorkspaceMember({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role || 'member',
    });
    
    // Mark invite as accepted
    await storage.updateWorkspaceInvite(invite.id, { acceptedAt: new Date() });
    
    res.json({ success: true });
  });

  app.delete("/api/workspaces/:workspaceId/invites/:inviteId", async (req, res) => {
    const requesterId = req.query.userId as string;
    if (!requesterId) return res.status(400).json({ error: "userId is required" });
    
    const canDelete = await checkWorkspaceAccess(requesterId, req.params.workspaceId, 'invite', 'delete');
    if (!canDelete) return res.status(403).json({ error: "Permission denied" });
    
    await storage.deleteWorkspaceInvite(req.params.inviteId);
    res.json({ success: true });
  });

  // ==================== MEETING ROUTES ====================
  app.get("/api/meetings", async (req, res) => {
    const userId = req.query.userId as string;
    const workspaceId = req.query.workspaceId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const meetings = await storage.getMeetings(userId, workspaceId || undefined);
    res.json(meetings);
  });

  app.get("/api/meetings/:id", async (req, res) => {
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const validatedMeeting = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(validatedMeeting);
      res.json(meeting);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/meetings/:id", async (req, res) => {
    const meeting = await storage.updateMeeting(req.params.id, req.body);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    res.json(meeting);
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    await storage.deleteMeeting(req.params.id);
    res.json({ success: true });
  });

  // ==================== MEETING ATTENDEES ====================
  app.get("/api/meetings/:id/attendees", async (req, res) => {
    const attendees = await storage.getAttendeesForMeeting(req.params.id);
    res.json(attendees);
  });

  app.post("/api/meetings/:id/attendees", async (req, res) => {
    try {
      const validatedAttendee = insertAttendeeSchema.parse({ ...req.body, meetingId: req.params.id });
      const attendee = await storage.createAttendee(validatedAttendee);
      res.json(attendee);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.delete("/api/meetings/:id/attendees", async (req, res) => {
    await storage.deleteAttendeesForMeeting(req.params.id);
    res.json({ success: true });
  });

  // ==================== MEETING DECISIONS ====================
  app.get("/api/meetings/:id/decisions", async (req, res) => {
    const decisions = await storage.getDecisionsForMeeting(req.params.id);
    res.json(decisions);
  });

  app.post("/api/meetings/:id/decisions", async (req, res) => {
    try {
      const validatedDecision = insertDecisionSchema.parse({ ...req.body, meetingId: req.params.id });
      const decision = await storage.createDecision(validatedDecision);
      res.json(decision);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  // ==================== MEETING RISKS ====================
  app.get("/api/meetings/:id/risks", async (req, res) => {
    const risks = await storage.getRisksForMeeting(req.params.id);
    res.json(risks);
  });

  app.post("/api/meetings/:id/risks", async (req, res) => {
    try {
      const validatedRisk = insertRiskSchema.parse({ ...req.body, meetingId: req.params.id });
      const risk = await storage.createRisk(validatedRisk);
      res.json(risk);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  // ==================== MEETING CLARIFYING QUESTIONS ====================
  app.get("/api/meetings/:id/questions", async (req, res) => {
    const questions = await storage.getClarifyingQuestionsForMeeting(req.params.id);
    res.json(questions);
  });

  app.post("/api/meetings/:id/questions", async (req, res) => {
    try {
      const validatedQuestion = insertClarifyingQuestionSchema.parse({ ...req.body, meetingId: req.params.id });
      const question = await storage.createClarifyingQuestion(validatedQuestion);
      res.json(question);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  // ==================== ACTION ITEMS ====================
  app.get("/api/actions", async (req, res) => {
    const userId = req.query.userId as string;
    const meetingId = req.query.meetingId as string;
    const workspaceId = req.query.workspaceId as string;
    
    if (meetingId) {
      const actions = await storage.getActionItemsForMeeting(meetingId);
      res.json(actions);
    } else if (userId) {
      const actions = await storage.getActionItems(userId, workspaceId || undefined);
      res.json(actions);
    } else {
      res.status(400).json({ error: "userId or meetingId is required" });
    }
  });

  app.get("/api/actions/:id", async (req, res) => {
    const action = await storage.getActionItem(req.params.id);
    if (!action) return res.status(404).json({ error: "Action item not found" });
    res.json(action);
  });

  app.post("/api/actions", async (req, res) => {
    try {
      const validatedAction = insertActionItemSchema.parse(req.body);
      const action = await storage.createActionItem(validatedAction);
      res.json(action);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/actions/:id", async (req, res) => {
    const action = await storage.updateActionItem(req.params.id, req.body);
    if (!action) return res.status(404).json({ error: "Action item not found" });
    res.json(action);
  });

  app.delete("/api/actions/:id", async (req, res) => {
    await storage.deleteActionItem(req.params.id);
    res.json({ success: true });
  });

  // ==================== DRAFTS ====================
  app.get("/api/drafts", async (req, res) => {
    const userId = req.query.userId as string;
    const meetingId = req.query.meetingId as string;
    const workspaceId = req.query.workspaceId as string;
    
    if (meetingId) {
      const drafts = await storage.getDraftsForMeeting(meetingId);
      res.json(drafts);
    } else if (userId) {
      const drafts = await storage.getDrafts(userId, workspaceId || undefined);
      res.json(drafts);
    } else {
      res.status(400).json({ error: "userId or meetingId is required" });
    }
  });

  app.get("/api/drafts/:id", async (req, res) => {
    const draft = await storage.getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json(draft);
  });

  app.post("/api/drafts", async (req, res) => {
    try {
      const validatedDraft = insertFollowUpDraftSchema.parse(req.body);
      const draft = await storage.createDraft(validatedDraft);
      res.json(draft);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/drafts/:id", async (req, res) => {
    const draft = await storage.updateDraft(req.params.id, req.body);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    res.json(draft);
  });

  app.delete("/api/drafts/:id", async (req, res) => {
    await storage.deleteDraft(req.params.id);
    res.json({ success: true });
  });

  // ==================== PERSONAL ENTRIES ====================
  app.get("/api/personal", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const entries = await storage.getPersonalEntries(userId);
    res.json(entries);
  });

  // ==================== CALENDAR EXPORT ====================
  app.post("/api/meetings/:id/export-calendar", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });
    
    const options = req.body.options || { includeActionItems: false };
    const actions = await storage.getActionItemsForMeeting(req.params.id);
    
    const icsContent = generateICS(meeting, actions, options);
    const filename = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.ics`;
    
    // Store export record
    await storage.createCalendarExport({
      userId,
      meetingId: meeting.id,
      filename,
      contentHash: crypto.createHash('md5').update(icsContent).digest('hex'),
      options,
    });
    
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(icsContent);
  });

  app.get("/api/calendar-exports", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const exports = await storage.getCalendarExports(userId);
    res.json(exports);
  });

  // ==================== OAUTH CONNECTIONS ====================
  app.get("/api/integrations", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const connections = await storage.getOAuthConnections(userId);
    
    // Check which providers are configured
    const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    
    res.json({
      google: {
        configured: googleConfigured,
        connected: connections.find(c => c.provider === 'google') || null,
      },
      microsoft: {
        configured: microsoftConfigured,
        connected: connections.find(c => c.provider === 'microsoft') || null,
      },
    });
  });

  app.delete("/api/integrations/:provider", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const connection = await storage.getOAuthConnection(userId, req.params.provider);
    if (connection) {
      await storage.deleteOAuthConnection(connection.id);
    }
    
    res.json({ success: true });
  });

  // Placeholder OAuth routes (scaffold for future implementation)
  app.get("/api/oauth/google/start", async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ error: "Google OAuth not configured" });
    }
    // Return OAuth URL for frontend to redirect
    const redirectUri = process.env.GOOGLE_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/gmail.compose';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline`;
    res.json({ authUrl });
  });

  app.get("/api/oauth/microsoft/start", async (req, res) => {
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(503).json({ error: "Microsoft OAuth not configured" });
    }
    const redirectUri = process.env.MICROSOFT_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/microsoft/callback`;
    const scope = 'Mail.ReadWrite';
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    res.json({ authUrl });
  });

  // Draft creation via email providers (scaffold)
  app.post("/api/drafts/:id/create-gmail-draft", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const connection = await storage.getOAuthConnection(userId, 'google');
    if (!connection) {
      return res.status(400).json({ error: "Gmail not connected" });
    }
    
    const draft = await storage.getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    
    // TODO: Implement actual Gmail API call to create draft
    // For now, return success with placeholder
    res.json({ 
      success: true, 
      message: "Draft creation scaffolded - implement Gmail API integration",
      draftId: null 
    });
  });

  app.post("/api/drafts/:id/create-outlook-draft", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const connection = await storage.getOAuthConnection(userId, 'microsoft');
    if (!connection) {
      return res.status(400).json({ error: "Outlook not connected" });
    }
    
    const draft = await storage.getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    
    // TODO: Implement actual Graph API call to create draft
    res.json({ 
      success: true, 
      message: "Draft creation scaffolded - implement Graph API integration",
      draftId: null 
    });
  });

  // ==================== AI AUDIT LOGS ====================
  app.get("/api/ai-audit-logs", async (req, res) => {
    const userId = req.query.userId as string;
    const workspaceId = req.query.workspaceId as string;
    const meetingId = req.query.meetingId as string;
    
    if (meetingId) {
      const logs = await storage.getAiAuditLogsForMeeting(meetingId);
      res.json(logs);
    } else if (userId) {
      const logs = await storage.getAiAuditLogs(userId, workspaceId || undefined);
      res.json(logs);
    } else {
      res.status(400).json({ error: "userId or meetingId is required" });
    }
  });

  // ==================== MOCK AI EXTRACTION ====================
  app.post("/api/meetings/:id/extract", async (req, res) => {
    const userId = req.query.userId as string;
    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    await storage.updateMeeting(req.params.id, { parseState: "processing" });

    setTimeout(async () => {
      const mockSummary = "Productive discussion on project timeline and resource allocation.";
      await storage.updateMeeting(req.params.id, { 
        parseState: "parsed",
        summary: mockSummary
      });

      const mockActionItems = [
        { text: "Update slide deck", ownerName: "Bob Smith", ownerEmail: "bob@example.com", confidenceOwner: 0.9, confidenceDueDate: 0.7 },
        { text: "Review Q4 budget", ownerName: "Alice Johnson", ownerEmail: "alice@example.com", confidenceOwner: 0.85, confidenceDueDate: 0.3 }
      ];

      for (const item of mockActionItems) {
        await storage.createActionItem({
          meetingId: req.params.id,
          workspaceId: meeting.workspaceId,
          text: item.text,
          ownerName: item.ownerName,
          ownerEmail: item.ownerEmail,
          status: item.confidenceDueDate > 0.6 ? 'open' : 'needs_review',
          confidenceOwner: item.confidenceOwner,
          confidenceDueDate: item.confidenceDueDate,
          tags: [],
          dueDate: null
        });
      }

      await storage.createDecision({
        meetingId: req.params.id,
        text: "Launch date set for the 15th"
      });

      // Log AI audit entry
      if (userId) {
        await storage.createAiAuditLog({
          userId,
          workspaceId: meeting.workspaceId,
          meetingId: meeting.id,
          provider: 'mock',
          model: 'mock-v1',
          promptVersion: '1.0.0',
          inputHash: crypto.createHash('md5').update(meeting.rawNotes).digest('hex'),
          outputJson: { summary: mockSummary, actionItems: mockActionItems },
          validJson: true,
        });
      }
    }, 2000);

    res.json({ success: true, message: "Extraction started" });
  });

  return httpServer;
}
