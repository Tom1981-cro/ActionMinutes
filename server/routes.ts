import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertMeetingSchema, insertActionItemSchema, 
  insertFollowUpDraftSchema, insertAttendeeSchema, insertDecisionSchema,
  insertRiskSchema, insertClarifyingQuestionSchema,
  insertWorkspaceSchema, insertWorkspaceMemberSchema, insertWorkspaceInviteSchema,
  insertCalendarExportSchema, insertAiAuditLogSchema, insertFeedbackSchema,
  type WorkspaceRole
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { getAppConfig, getAppConfigAsync, checkConnectorStatus } from "./config";
import { extractMeetingNotes, generateFollowUpDrafts, mapConfidenceToStatus, PROMPT_VERSION, isValidActionStatus, VALID_ACTION_STATUSES } from "./ai";
import multer from "multer";
import { extractTextFromImage, validateImageFile, MAX_FILE_SIZE } from "./ocr";
import { 
  transcribe, 
  validateAudioFile, 
  MAX_AUDIO_SIZE, 
  SUPPORTED_AUDIO_TYPES, 
  extractKeywords, 
  generateSRT, 
  generateTXT,
  getAvailableProviders,
  getSupportedLanguages
} from "./transcription";
import {
  exchangeGoogleCode,
  exchangeMicrosoftCode,
  refreshGoogleToken,
  refreshMicrosoftToken,
  getGoogleUserInfo,
  getMicrosoftUserInfo,
  createGmailDraft,
  createOutlookDraft,
  prepareTokenForStorage,
  prepareTokenForUse,
} from "./email-providers";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import calendarRoutes from "./calendar-routes";
import notesRoutes from "./notes-routes";
import { requireAuth, optionalAuth } from "./jwt";
import { 
  checkUsageLimit, 
  incrementAiExtraction, 
  incrementTranscriptionMinutes,
  requireCapability,
  getUserUsage,
  isAdminUser
} from "./middleware/planAccess";
import { getEffectivePlan, getPlanConfig, getPlanLimit, hasCapability } from "@shared/plans";

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

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==================== MIDDLEWARE SETUP ====================
  app.use(cookieParser());
  
  // Mount auth routes
  app.use("/api/auth", authRoutes);
  
  // Mount calendar routes
  app.use("/api/calendar", calendarRoutes);
  
  // Mount notes routes
  app.use("/api/notes", notesRoutes);
  
  // ==================== GLOBAL ERROR HANDLER ====================
  const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };

  const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('[API Error]', err.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
    res.status(500).json({ 
      error: 'An unexpected error occurred',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  };

  // ==================== CONFIG & STATUS ROUTES ====================
  app.get("/api/config/status", async (req, res) => {
    try {
      const config = await getAppConfigAsync();
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve configuration" });
    }
  });

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

  app.patch("/api/users/me", requireAuth, async (req, res) => {
    const updates = { ...req.body };
    if (updates.recordingConsentAt && typeof updates.recordingConsentAt === 'string') {
      updates.recordingConsentAt = new Date(updates.recordingConsentAt);
    }
    const user = await storage.updateUser(req.userId!, updates);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/users/me/plan", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const isAdmin = isAdminUser(user);
    const effectivePlan = isAdmin ? 'pro' as const : getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
    const planConfig = getPlanConfig(effectivePlan);
    const usage = await getUserUsage(req.userId!);
    
    res.json({
      plan: effectivePlan,
      isAdmin,
      planConfig,
      usage: {
        aiExtractions: {
          used: usage.aiExtractions,
          limit: isAdmin ? -1 : planConfig.limits.aiExtractionsPerMonth,
          unlimited: isAdmin || planConfig.limits.aiExtractionsPerMonth === -1
        },
        transcriptionMinutes: {
          used: usage.transcriptionMinutes,
          limit: isAdmin ? -1 : planConfig.limits.transcriptionMinutesPerMonth,
          unlimited: isAdmin || planConfig.limits.transcriptionMinutesPerMonth === -1
        }
      },
      capabilities: isAdmin ? {
        ...planConfig.capabilities,
        unlimitedAiExtractions: true,
        unlimitedTranscription: true,
        unlimitedHistory: true,
        emailIntegrations: true,
        workspaces: true,
        teamSeats: true,
        prioritySupport: true,
        personalMode: true,
      } : planConfig.capabilities
    });
  });

  // ==================== SEED DATA ROUTE ====================
  app.post("/api/seed", async (req, res) => {
    try {
      // Test user credentials: test@actionminutes.com / testpass123
      const testEmail = "test@actionminutes.com";
      const testPassword = "testpass123";
      let user = await storage.getUserByEmail(testEmail);
      
      if (!user) {
        const hashedPassword = await bcrypt.hash(testPassword, 10);
        user = await storage.createUser({
          email: testEmail,
          password: hashedPassword,
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

      // Create demo workspace with team members
      const demoWorkspace = await storage.createWorkspace({
        name: "Product Team",
        createdByUserId: user.id,
      });

      // Add owner as a workspace member
      await storage.createWorkspaceMember({
        workspaceId: demoWorkspace.id,
        userId: user.id,
        role: "owner",
      });

      // Create a workspace meeting
      const workspaceMeeting = await storage.createMeeting({
        userId: user.id,
        title: "Team Sync - Product Roadmap",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        rawNotes: "Reviewed product roadmap for Q2. Prioritized customer feedback on mobile experience. Assigned tasks for sprint planning.",
        summary: "Quarterly roadmap review with focus on mobile improvements and customer-driven features.",
        parseState: "finalized",
        workspaceId: demoWorkspace.id,
      });

      // Add workspace meeting action items
      await storage.createActionItem({
        meetingId: workspaceMeeting.id,
        text: "Draft Q2 feature prioritization document",
        ownerName: user.name || "Alex",
        ownerEmail: user.email,
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        status: "open",
        confidenceOwner: 0.95,
        confidenceDueDate: 0.9,
      });

      res.json({ 
        message: "Seed data created successfully", 
        user,
        workspace: demoWorkspace,
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

  // Seed data for any user (by userId)
  app.post("/api/seed/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if seed data already exists
      const existingMeetings = await storage.getMeetings(userId);
      if (existingMeetings.length > 0) {
        return res.json({ message: "Seed data already exists", user });
      }

      // Create sample meetings
      const meeting1 = await storage.createMeeting({
        userId,
        title: "Q1 Planning Sprint Kickoff",
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        rawNotes: "Discussed Q1 goals and priorities. Need to finalize roadmap by Friday. Sarah will lead the design review. Mike to set up new CI/CD pipeline.",
        summary: "Sprint kickoff focusing on Q1 deliverables. Key initiatives: mobile app v2.0, API performance improvements, and new analytics dashboard.",
        parseState: "finalized",
        workspaceId: null,
      });

      const meeting2 = await storage.createMeeting({
        userId,
        title: "Product Design Review",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        rawNotes: "Reviewed new onboarding flow mockups. Team liked the simplified 3-step approach. Need to A/B test with existing flow.",
        summary: "Design review for new user onboarding. Approved simplified 3-step flow pending A/B test results.",
        parseState: "parsed",
        workspaceId: null,
      });

      const meeting3 = await storage.createMeeting({
        userId,
        title: "Weekly Team Standup",
        date: new Date(),
        rawNotes: "Quick sync on blockers. Database migration still pending review. Frontend team finished the dashboard components.",
        summary: "Team standup - database migration is the main blocker, dashboard UI complete.",
        parseState: "draft",
        workspaceId: null,
      });

      // Create action items
      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Finalize Q1 roadmap document and share with stakeholders",
        ownerName: user.name || "You",
        ownerEmail: user.email,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: "open",
        confidenceOwner: 0.95,
        confidenceDueDate: 0.9,
      });

      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Set up new CI/CD pipeline for staging environment",
        ownerName: "Mike Chen",
        ownerEmail: "mike@example.com",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "open",
        confidenceOwner: 0.85,
        confidenceDueDate: 0.8,
      });

      await storage.createActionItem({
        meetingId: meeting1.id,
        text: "Schedule design review session with UX team",
        ownerName: "Sarah Lee",
        ownerEmail: "sarah@example.com",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        status: "needs_review",
        confidenceOwner: 0.5,
        confidenceDueDate: 0.6,
      });

      await storage.createActionItem({
        meetingId: meeting2.id,
        text: "Create A/B test plan for new onboarding flow",
        ownerName: user.name || "You",
        ownerEmail: user.email,
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
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
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
        userId,
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
- Finalize roadmap by Friday
- Set up CI/CD pipeline
- Lead design review

Let me know if I missed anything!

Best`,
      });

      await storage.createDraft({
        userId,
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

Thanks!`,
      });

      res.json({ message: "Seed data created successfully", user });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Seed failed" });
    }
  });

  // ==================== WORKSPACE ROUTES ====================
  app.get("/api/workspaces", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const memberships = await storage.getUserWorkspaces(userId);
    const workspacesWithRole = memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      createdByUserId: m.workspace.createdByUserId,
      createdAt: m.workspace.createdAt,
      role: m.role,
    }));
    res.json(workspacesWithRole);
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

  app.get("/api/invites/:token", async (req, res) => {
    const invite = await storage.getWorkspaceInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    
    const workspace = await storage.getWorkspace(invite.workspaceId);
    if (!workspace) return res.status(404).json({ error: "Workspace not found" });
    
    const isExpired = new Date() > invite.expiresAt;
    const isAccepted = !!invite.acceptedAt;
    
    res.json({
      workspaceName: workspace.name,
      role: invite.role || 'member',
      email: invite.email,
      expiresAt: invite.expiresAt,
      isExpired,
      isAccepted,
    });
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    const userId = req.userId || req.body.userId as string;
    if (!userId) return res.status(401).json({ error: "Please log in to accept this invite" });
    
    const invite = await storage.getWorkspaceInviteByToken(req.params.token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    
    if (invite.acceptedAt) {
      return res.status(400).json({ error: "Invite already accepted" });
    }
    
    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ error: "Invite has expired" });
    }
    
    const existingMember = await storage.getWorkspaceMember(invite.workspaceId, userId);
    if (existingMember) {
      await storage.updateWorkspaceInvite(invite.id, { acceptedAt: new Date() });
      return res.json({ success: true, alreadyMember: true, workspaceId: invite.workspaceId });
    }
    
    await storage.createWorkspaceMember({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role || 'member',
    });
    
    await storage.updateWorkspaceInvite(invite.id, { acceptedAt: new Date() });
    
    res.json({ success: true, workspaceId: invite.workspaceId });
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
    const meetingsWithCounts = await Promise.all(
      meetings.map(async (meeting) => {
        const attendees = await storage.getAttendeesForMeeting(meeting.id);
        return { ...meeting, attendeeCount: attendees.length };
      })
    );
    res.json(meetingsWithCounts);
  });

  app.get("/api/meetings/empty", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const allMeetings = await storage.getMeetings(userId);
    const emptyMeetings = allMeetings.filter(m => 
      (!m.rawNotes || m.rawNotes.trim() === '') && 
      !m.summary && 
      m.parseState === 'draft'
    );
    res.json(emptyMeetings);
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
    const updates = { ...req.body };
    if (updates.dueDate && typeof updates.dueDate === 'string') {
      updates.dueDate = new Date(updates.dueDate);
    }
    if (updates.status && !isValidActionStatus(updates.status)) {
      return res.status(400).json({ 
        error: `Invalid status. Must be one of: ${VALID_ACTION_STATUSES.join(', ')}` 
      });
    }
    const action = await storage.updateActionItem(req.params.id, updates);
    if (!action) return res.status(404).json({ error: "Action item not found" });
    res.json(action);
  });

  app.delete("/api/actions/:id", async (req, res) => {
    await storage.deleteActionItem(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/actions/:id/create-task", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const actionId = req.params.id;
    
    const action = await storage.getActionItem(actionId);
    if (!action) {
      return res.status(404).json({ error: "Action item not found" });
    }
    
    const meeting = await storage.getMeeting(action.meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    
    if (meeting.workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, meeting.workspaceId, 'workspace', 'write');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (meeting.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const existingTasks = await storage.getTasksBySource('meeting', meeting.id);
    const alreadyLinked = existingTasks.some(t => 
      t.userId === userId && t.title === action.text
    );
    
    if (alreadyLinked) {
      return res.status(400).json({ error: "Task already exists for this action item" });
    }
    
    const taskPriority = (action.confidenceOwner || 0) >= 0.8 ? 'high' : 
                         (action.confidenceOwner || 0) >= 0.5 ? 'medium' : 'low';
    
    const task = await storage.createTask({
      userId,
      workspaceId: meeting.workspaceId || null,
      projectId: null,
      title: action.text,
      description: `From meeting: ${meeting.title}`,
      status: action.status === 'needs_review' ? 'pending' : 'todo',
      priority: taskPriority,
      dueDate: action.dueDate || null,
      recurrence: null,
      recurrenceEndDate: null,
      nextOccurrence: null,
      sourceType: 'meeting',
      sourceId: meeting.id,
      tags: [],
      estimatedMinutes: null,
    });
    
    res.json(task);
  });

  app.post("/api/meetings/:id/create-tasks", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const meetingId = req.params.id;
    
    const meeting = await storage.getMeeting(meetingId);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    
    if (meeting.workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, meeting.workspaceId, 'workspace', 'write');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    } else if (meeting.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const actions = await storage.getActionItemsForMeeting(meetingId);
    const existingTasks = await storage.getTasksBySource('meeting', meetingId);
    const existingTitles = new Set(existingTasks.filter(t => t.userId === userId).map(t => t.title));
    
    const createdTasks = [];
    for (const action of actions) {
      if (existingTitles.has(action.text)) continue;
      
      const taskPriority = (action.confidenceOwner || 0) >= 0.8 ? 'high' : 
                           (action.confidenceOwner || 0) >= 0.5 ? 'medium' : 'low';
      
      const task = await storage.createTask({
        userId,
        workspaceId: meeting.workspaceId || null,
        projectId: null,
        title: action.text,
        description: `From meeting: ${meeting.title}`,
        status: action.status === 'needs_review' ? 'pending' : 'todo',
        priority: taskPriority,
        dueDate: action.dueDate || null,
        recurrence: null,
        recurrenceEndDate: null,
        nextOccurrence: null,
        sourceType: 'meeting',
        sourceId: meetingId,
        tags: [],
        estimatedMinutes: null,
      });
      createdTasks.push(task);
    }
    
    res.json({ 
      tasksCreated: createdTasks.length,
      tasks: createdTasks 
    });
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

  // ==================== PERSONAL ENTRIES (JOURNAL) ====================
  app.get("/api/personal/journal", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const entries = await storage.getPersonalEntries(userId);
    res.json(entries);
  });

  // Important: prompts route must come BEFORE :id route
  app.get("/api/personal/journal/prompts", async (req, res) => {
    const userId = req.query.userId as string;
    const text = req.query.text as string;
    
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    try {
      const { analyzeJournalEntry, detectSafetyRisk } = await import("./journal-ai");
      
      const shownPromptIds = await storage.getShownPromptsForUser(userId);
      const analysis = await analyzeJournalEntry(text || '', shownPromptIds);
      const safetyRisk = detectSafetyRisk(text || '');
      
      res.json({
        prompts: analysis.prompts,
        signals: analysis.signals,
        safetyRisk,
      });
    } catch (error) {
      console.error('[JournalAI] Prompts error:', error);
      res.status(500).json({ error: "Failed to get prompts" });
    }
  });

  app.get("/api/personal/journal/:id", async (req, res) => {
    const entry = await storage.getPersonalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "Journal entry not found" });
    res.json(entry);
  });

  app.post("/api/personal/journal", async (req, res) => {
    const userId = req.body.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    try {
      const { analyzeJournalEntry, detectSafetyRisk } = await import("./journal-ai");
      
      const rawText = req.body.rawText || '';
      
      let analysis: { signals: string[]; prompts: any[] } = { signals: [], prompts: [] };
      let safetyRisk = false;
      try {
        analysis = await analyzeJournalEntry(rawText);
        safetyRisk = detectSafetyRisk(rawText);
      } catch (aiError) {
        console.error('[JournalAI] Analysis error (continuing without AI):', aiError);
      }
      
      const entry = await storage.createPersonalEntry({
        userId,
        date: new Date(req.body.date || new Date()),
        rawText,
        mood: req.body.mood,
        promptUsed: req.body.promptUsed,
        detectedSignals: analysis.signals,
        aiProcessed: false,
      });
      
      res.json({ 
        ...entry, 
        suggestedPrompts: analysis.prompts,
        safetyRisk,
      });
    } catch (error) {
      console.error('[Journal] Create error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to save entry" });
    }
  });

  app.post("/api/personal/journal/:id/analyze", async (req, res) => {
    const userId = req.query.userId as string || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const entry = await storage.getPersonalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "Journal entry not found" });
    if (entry.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    try {
      const user = await storage.getUser(userId);
      const personalAiEnabled = user?.personalAiEnabled !== false;
      
      const { analyzeJournalEntry, summarizeJournalEntry, getMockSummary, detectSafetyRisk } = await import("./journal-ai");
      
      const analysis = await analyzeJournalEntry(entry.rawText);
      const safetyRisk = detectSafetyRisk(entry.rawText);
      
      let summary = null;
      if (personalAiEnabled && entry.rawText.length >= 20) {
        summary = await summarizeJournalEntry(entry.rawText, true);
      }
      if (!summary && entry.rawText.length >= 20) {
        summary = getMockSummary(entry.rawText);
      }
      
      if (summary) {
        await storage.updatePersonalEntry(entry.id, {
          summary: summary.summary,
          top3: summary.top3,
          nextSteps: summary.nextSteps,
          detectedSignals: analysis.signals,
          aiProcessed: true,
        });
      }
      
      res.json({
        signals: analysis.signals,
        prompts: analysis.prompts,
        safetyRisk,
        summary,
        aiEnabled: personalAiEnabled,
      });
    } catch (error) {
      console.error('[JournalAI] Analysis error:', error);
      res.status(500).json({ error: "Failed to analyze entry" });
    }
  });

  app.patch("/api/personal/journal/:id", async (req, res) => {
    const userId = req.query.userId as string || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const entry = await storage.getPersonalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "Journal entry not found" });
    if (entry.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    const updated = await storage.updatePersonalEntry(req.params.id, req.body);
    res.json(updated);
  });

  app.delete("/api/personal/journal/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const entry = await storage.getPersonalEntry(req.params.id);
    if (!entry) return res.status(404).json({ error: "Journal entry not found" });
    if (entry.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    await storage.deletePersonalEntry(req.params.id);
    res.json({ success: true });
  });

  // ==================== PERSONAL REMINDERS ====================
  app.get("/api/personal/reminders", async (req, res) => {
    const userId = req.query.userId as string;
    const bucket = req.query.bucket as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const reminders = await storage.getPersonalReminders(userId, bucket || undefined);
    res.json(reminders);
  });

  app.get("/api/personal/reminders/:id", async (req, res) => {
    const reminder = await storage.getPersonalReminder(req.params.id);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    res.json(reminder);
  });

  app.post("/api/personal/reminders", async (req, res) => {
    const userId = req.body.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    try {
      const reminder = await storage.createPersonalReminder({
        userId,
        text: req.body.text,
        bucket: req.body.bucket || 'sometime',
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        priority: req.body.priority || 'normal',
        notes: req.body.notes,
        isCompleted: false,
      });
      res.json(reminder);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/personal/reminders/:id", async (req, res) => {
    const userId = req.query.userId as string || req.body.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const reminder = await storage.getPersonalReminder(req.params.id);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    if (reminder.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    const updates: any = { ...req.body };
    if (updates.dueDate && typeof updates.dueDate === 'string') {
      updates.dueDate = new Date(updates.dueDate);
    }
    if (updates.completedAt && typeof updates.completedAt === 'string') {
      updates.completedAt = new Date(updates.completedAt);
    }
    delete updates.userId;
    
    const updated = await storage.updatePersonalReminder(req.params.id, updates);
    res.json(updated);
  });

  app.delete("/api/personal/reminders/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const reminder = await storage.getPersonalReminder(req.params.id);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    if (reminder.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    await storage.deletePersonalReminder(req.params.id);
    res.json({ success: true });
  });

  // ==================== JOURNAL PROMPTS ====================
  app.get("/api/prompts", async (req, res) => {
    const category = req.query.category as string;
    const prompts = await storage.getJournalPrompts(category || undefined);
    res.json(prompts);
  });

  app.post("/api/prompts", async (req, res) => {
    try {
      const prompt = await storage.createJournalPrompt({
        category: req.body.category,
        text: req.body.text,
        isActive: req.body.isActive ?? true,
      });
      res.json(prompt);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  // Legacy endpoint for compatibility
  app.get("/api/personal", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const entries = await storage.getPersonalEntries(userId);
    res.json(entries);
  });

  // ==================== CUSTOM LISTS ====================
  app.get("/api/lists", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const lists = await storage.getCustomLists(userId);
    res.json(lists);
  });

  app.get("/api/lists/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    const list = await storage.getCustomList(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    const items = await storage.getCustomListItemsWithDetails(req.params.id, userId);
    res.json({ ...list, items });
  });

  app.post("/api/lists", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    try {
      const list = await storage.createCustomList({
        userId,
        name: req.body.name || 'My List',
        color: req.body.color,
        icon: req.body.icon,
        position: req.body.position || 0,
      });
      res.json(list);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.patch("/api/lists/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    const list = await storage.getCustomList(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    const updates: any = { ...req.body };
    delete updates.userId;
    
    const updated = await storage.updateCustomList(req.params.id, updates);
    res.json(updated);
  });

  app.delete("/api/lists/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    const list = await storage.getCustomList(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    await storage.deleteCustomList(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/lists/:id/items", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    const list = await storage.getCustomList(req.params.id);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    let reminderId = req.body.reminderId;
    
    if (req.body.text && !reminderId) {
      const reminder = await storage.createPersonalReminder({
        userId,
        text: req.body.text,
        bucket: 'sometime',
        priority: 'normal',
      });
      reminderId = reminder.id;
    }
    
    if (reminderId) {
      const reminder = await storage.getPersonalReminder(reminderId);
      if (!reminder || reminder.userId !== userId) {
        return res.status(403).json({ error: "Reminder access denied" });
      }
    }
    if (req.body.taskId) {
      const task = await storage.getTask(req.body.taskId);
      if (!task || task.userId !== userId) {
        return res.status(403).json({ error: "Task access denied" });
      }
    }
    
    try {
      const item = await storage.addItemToList({
        listId: req.params.id,
        reminderId,
        taskId: req.body.taskId,
        position: req.body.position || 0,
      });
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.delete("/api/lists/:listId/items/:itemId", requireAuth, async (req, res) => {
    const userId = req.userId!;
    
    const list = await storage.getCustomList(req.params.listId);
    if (!list) return res.status(404).json({ error: "List not found" });
    if (list.userId !== userId) return res.status(403).json({ error: "Access denied" });
    
    const item = await storage.getCustomListItem(req.params.itemId);
    if (!item || item.listId !== req.params.listId) {
      return res.status(404).json({ error: "Item not found" });
    }
    
    await storage.removeItemFromList(req.params.itemId, req.params.listId);
    res.json({ success: true });
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
    
    // Get user's personal OAuth connections from database
    const connections = await storage.getOAuthConnections(userId);
    const googleConnection = connections.find(c => c.provider === 'google') || null;
    const microsoftConnection = connections.find(c => c.provider === 'microsoft') || null;
    
    // Check for per-user OAuth credentials (CLIENT_ID / CLIENT_SECRET)
    const googleOAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const microsoftOAuthConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
    
    // Check if Replit connectors are available as app-level fallback
    const connectorStatus = await checkConnectorStatus();
    
    // Per-user OAuth is "configured" only when OAuth credentials are available
    // Replit connectors are app-level and don't support per-user connections
    res.json({
      google: {
        configured: googleOAuthConfigured,
        replitConnectorAvailable: connectorStatus.gmail,
        connected: googleConnection,
      },
      microsoft: {
        configured: microsoftOAuthConfigured,
        replitConnectorAvailable: connectorStatus.outlook,
        connected: microsoftConnection,
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

  // Admin emails that bypass subscription checks
  const ADMIN_EMAILS = ['tomi.vida@gmail.com'];
  const isAdminEmail = (email: string | null | undefined) => email && ADMIN_EMAILS.includes(email.toLowerCase());

  // ==================== OAUTH ROUTES ====================
  app.get("/api/oauth/google/start", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Admins bypass Pro requirement
    if (!isAdminEmail(user.email)) {
      const effectivePlan = getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
      if (!hasCapability(effectivePlan, 'emailIntegrations')) {
        return res.status(403).json({ 
          error: "Email integrations require Pro plan",
          upgradeUrl: '/app/settings?tab=subscription'
        });
      }
    }
    
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ error: "Google OAuth not configured" });
    }
    
    const redirectUri = process.env.GOOGLE_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/userinfo.email';
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}`;
    res.json({ authUrl });
  });

  app.get("/api/oauth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect('/settings?error=missing_params');
      }
      
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = stateData.userId;
      if (!userId) {
        return res.redirect('/settings?error=invalid_state');
      }
      
      const redirectUri = process.env.GOOGLE_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;
      const tokens = await exchangeGoogleCode(code as string, redirectUri);
      const userInfo = await getGoogleUserInfo(tokens.access_token);
      
      const existingConnection = await storage.getOAuthConnection(userId, 'google');
      if (existingConnection) {
        await storage.deleteOAuthConnection(existingConnection.id);
      }
      
      const expiresAt = tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined;
      
      await storage.createOAuthConnection({
        userId,
        provider: 'google',
        accountEmail: userInfo.email,
        accessToken: prepareTokenForStorage(tokens.access_token),
        refreshToken: tokens.refresh_token ? prepareTokenForStorage(tokens.refresh_token) : undefined,
        expiresAt,
        scopes: ['gmail.compose', 'userinfo.email'],
      });
      
      res.redirect('/settings?tab=integrations&success=google');
    } catch (error) {
      console.error('[Google OAuth] Callback error:', error);
      res.redirect('/settings?tab=integrations&error=google_auth_failed');
    }
  });

  app.get("/api/oauth/microsoft/start", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Admins bypass Pro requirement
    if (!isAdminEmail(user.email)) {
      const effectivePlan = getEffectivePlan(user.subscriptionPlan, user.subscriptionStatus);
      if (!hasCapability(effectivePlan, 'emailIntegrations')) {
        return res.status(403).json({ 
          error: "Email integrations require Pro plan",
          upgradeUrl: '/app/settings?tab=subscription'
        });
      }
    }
    
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
      return res.status(503).json({ error: "Microsoft OAuth not configured" });
    }
    
    const redirectUri = process.env.MICROSOFT_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/microsoft/callback`;
    const scope = 'Mail.ReadWrite offline_access User.Read';
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
    res.json({ authUrl });
  });

  app.get("/api/oauth/microsoft/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.redirect('/settings?error=missing_params');
      }
      
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const userId = stateData.userId;
      if (!userId) {
        return res.redirect('/settings?error=invalid_state');
      }
      
      const redirectUri = process.env.MICROSOFT_REDIRECT_URL || `${req.protocol}://${req.get('host')}/api/oauth/microsoft/callback`;
      const tokens = await exchangeMicrosoftCode(code as string, redirectUri);
      const userInfo = await getMicrosoftUserInfo(tokens.access_token);
      
      const existingConnection = await storage.getOAuthConnection(userId, 'microsoft');
      if (existingConnection) {
        await storage.deleteOAuthConnection(existingConnection.id);
      }
      
      const expiresAt = tokens.expires_in 
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : undefined;
      
      await storage.createOAuthConnection({
        userId,
        provider: 'microsoft',
        accountEmail: userInfo.email,
        accessToken: prepareTokenForStorage(tokens.access_token),
        refreshToken: tokens.refresh_token ? prepareTokenForStorage(tokens.refresh_token) : undefined,
        expiresAt,
        scopes: ['Mail.ReadWrite', 'User.Read'],
      });
      
      res.redirect('/settings?tab=integrations&success=microsoft');
    } catch (error) {
      console.error('[Microsoft OAuth] Callback error:', error);
      res.redirect('/settings?tab=integrations&error=microsoft_auth_failed');
    }
  });

  // ==================== DRAFT CREATION ====================
  async function getValidAccessToken(connection: any, provider: 'google' | 'microsoft'): Promise<string | null> {
    let accessToken = prepareTokenForUse(connection.accessToken);
    
    if (connection.expiresAt && new Date(connection.expiresAt) < new Date()) {
      if (!connection.refreshToken) {
        return null;
      }
      
      try {
        const refreshToken = prepareTokenForUse(connection.refreshToken);
        const tokens = provider === 'google' 
          ? await refreshGoogleToken(refreshToken)
          : await refreshMicrosoftToken(refreshToken);
        
        accessToken = tokens.access_token;
        
        const expiresAt = tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : undefined;
        
        await storage.updateOAuthConnection(connection.id, {
          accessToken: prepareTokenForStorage(tokens.access_token),
          ...(tokens.refresh_token && { refreshToken: prepareTokenForStorage(tokens.refresh_token) }),
          expiresAt,
        });
      } catch (error) {
        console.error(`[${provider}] Token refresh failed:`, error);
        return null;
      }
    }
    
    return accessToken;
  }

  app.post("/api/drafts/:id/create-gmail-draft", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const connection = await storage.getOAuthConnection(userId, 'google');
    if (!connection) {
      return res.status(400).json({ error: "Gmail not connected" });
    }
    
    const draft = await storage.getDraft(req.params.id);
    if (!draft) return res.status(404).json({ error: "Draft not found" });
    
    const accessToken = await getValidAccessToken(connection, 'google');
    if (!accessToken) {
      return res.status(401).json({ error: "Gmail authentication expired. Please reconnect." });
    }
    
    const result = await createGmailDraft(
      accessToken,
      draft.recipientEmail || '',
      draft.subject,
      draft.body
    );
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    await storage.updateDraft(draft.id, {
      state: 'exported',
      providerDraftId: result.draftId,
      providerMetadata: { provider: 'gmail', webLink: result.webLink, createdAt: new Date().toISOString() },
    });
    
    // Update related action items to 'waiting' if this is an individual draft
    if (draft.recipientEmail || draft.recipientName) {
      const actions = await storage.getActionItemsForMeeting(draft.meetingId);
      for (const action of actions) {
        if (action.status === 'open' && 
            ((draft.recipientEmail && action.ownerEmail === draft.recipientEmail) ||
             (draft.recipientName && action.ownerName === draft.recipientName))) {
          await storage.updateActionItem(action.id, { status: 'waiting' });
        }
      }
    }
    
    await storage.updateOAuthConnection(connection.id, { lastUsedAt: new Date() });
    
    res.json({ 
      success: true, 
      draftId: result.draftId,
      webLink: result.webLink,
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
    
    const accessToken = await getValidAccessToken(connection, 'microsoft');
    if (!accessToken) {
      return res.status(401).json({ error: "Outlook authentication expired. Please reconnect." });
    }
    
    const result = await createOutlookDraft(
      accessToken,
      draft.recipientEmail || '',
      draft.subject,
      draft.body
    );
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }
    
    await storage.updateDraft(draft.id, {
      state: 'exported',
      providerDraftId: result.draftId,
      providerMetadata: { provider: 'outlook', webLink: result.webLink, createdAt: new Date().toISOString() },
    });
    
    // Update related action items to 'waiting' if this is an individual draft
    if (draft.recipientEmail || draft.recipientName) {
      const actions = await storage.getActionItemsForMeeting(draft.meetingId);
      for (const action of actions) {
        if (action.status === 'open' && 
            ((draft.recipientEmail && action.ownerEmail === draft.recipientEmail) ||
             (draft.recipientName && action.ownerName === draft.recipientName))) {
          await storage.updateActionItem(action.id, { status: 'waiting' });
        }
      }
    }
    
    await storage.updateOAuthConnection(connection.id, { lastUsedAt: new Date() });
    
    res.json({ 
      success: true, 
      draftId: result.draftId,
      webLink: result.webLink,
    });
  });

  // ==================== OCR (Handwritten Notes) ====================
  const ocrRateLimits = new Map<string, { count: number; resetTime: number }>();
  const OCR_RATE_LIMIT = 10; // max requests per minute
  const OCR_RATE_WINDOW = 60000; // 1 minute

  const checkOcrRateLimit = (userId: string): boolean => {
    const now = Date.now();
    const userLimit = ocrRateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      ocrRateLimits.set(userId, { count: 1, resetTime: now + OCR_RATE_WINDOW });
      return true;
    }
    
    if (userLimit.count >= OCR_RATE_LIMIT) {
      return false;
    }
    
    userLimit.count++;
    return true;
  };

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
  });

  app.post("/api/ocr", upload.single("image"), async (req, res) => {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!checkOcrRateLimit(userId)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const validation = validateImageFile({ mimetype: req.file.mimetype, size: req.file.size });
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const result = await extractTextFromImage(req.file.buffer);
      res.json(result);
    } catch (error) {
      console.error("[OCR Error]", error);
      res.status(500).json({ 
        error: "OCR failed. Try again or type notes manually.",
        text: "",
      });
    }
  });

  // ==================== AUDIO TRANSCRIPTION ====================
  const transcriptionRateLimits = new Map<string, { count: number; resetTime: number }>();
  const TRANSCRIPTION_RATE_LIMIT = 5; // max requests per minute (lower than OCR due to AI cost)
  const TRANSCRIPTION_RATE_WINDOW = 60000; // 1 minute

  const checkTranscriptionRateLimit = (userId: string): boolean => {
    const now = Date.now();
    const userLimit = transcriptionRateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      transcriptionRateLimits.set(userId, { count: 1, resetTime: now + TRANSCRIPTION_RATE_WINDOW });
      return true;
    }
    
    if (userLimit.count >= TRANSCRIPTION_RATE_LIMIT) {
      return false;
    }
    
    userLimit.count++;
    return true;
  };

  const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_AUDIO_SIZE },
  });

  app.get("/api/transcription/providers", async (req, res) => {
    const providers = getAvailableProviders();
    res.json(providers);
  });

  app.get("/api/transcription/languages", async (req, res) => {
    const languages = getSupportedLanguages();
    res.json(languages);
  });

  app.post("/api/transcribe", audioUpload.single("audio"), async (req, res) => {
    const userId = req.query.userId as string;
    const provider = (req.query.provider as any) || "gemini";
    const language = req.query.language as string;
    const modelSize = (req.query.modelSize as any) || "base";
    const saveTranscript = req.query.save === "true";
    const meetingId = req.query.meetingId as string;
    const title = req.query.title as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!checkTranscriptionRateLimit(userId)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const validation = validateAudioFile(req.file.mimetype, req.file.size);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const estimatedMinutes = Math.ceil(req.file.size / (16000 * 60));
      const usageCheck = await incrementTranscriptionMinutes(userId, estimatedMinutes);
      if (!usageCheck.success) {
        return res.status(403).json({
          error: "Monthly transcription limit reached",
          limitType: 'transcription',
          current: usageCheck.current,
          limit: usageCheck.limit,
          upgradeUrl: '/app/settings?tab=subscription'
        });
      }

      const result = await transcribe(req.file.buffer, req.file.mimetype, {
        provider,
        language,
        modelSize,
      });

      const keywords = extractKeywords(result.text);

      if (saveTranscript) {
        const user = await storage.getUser(userId);
        const transcript = await storage.createTranscript({
          userId,
          meetingId: meetingId || null,
          workspaceId: null,
          title: title || `Transcript ${new Date().toLocaleString()}`,
          text: result.text,
          language: result.language || language || "en",
          duration: result.duration,
          provider: result.provider,
          modelSize: result.modelSize,
          confidence: result.confidence,
          keywords,
          segments: result.segments || null,
          sourceFileName: req.file.originalname,
          sourceFileSize: req.file.size,
          sourceMimeType: req.file.mimetype,
        });
        
        res.json({ ...result, keywords, transcriptId: transcript.id });
      } else {
        res.json({ ...result, keywords });
      }
    } catch (error: any) {
      console.error("[Transcription Error]", error);
      res.status(500).json({ 
        error: error.message || "Transcription failed. Try again or type notes manually.",
        text: "",
      });
    }
  });

  const transcriptUpdateSchema = z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  });

  app.get("/api/transcripts", async (req, res) => {
    const userId = req.query.userId as string;
    const workspaceId = req.query.workspaceId as string;
    const search = req.query.search as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    if (search) {
      const results = await storage.searchTranscripts(userId, search, workspaceId || undefined);
      return res.json(results);
    }
    
    const transcripts = await storage.getTranscripts(userId, workspaceId || undefined);
    res.json(transcripts);
  });

  app.get("/api/transcripts/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    
    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    res.json(transcript);
  });

  app.put("/api/transcripts/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const existing = await storage.getTranscript(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    
    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const parseResult = transcriptUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid update data", details: parseResult.error.errors });
    }
    
    const transcript = await storage.updateTranscript(req.params.id, parseResult.data);
    res.json(transcript);
  });

  app.delete("/api/transcripts/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const existing = await storage.getTranscript(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    
    if (existing.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteTranscript(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/transcripts/:id/export/srt", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    
    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const segments = transcript.segments as any[] | null;
    if (!segments || segments.length === 0) {
      return res.status(400).json({ error: "No segments available for SRT export" });
    }
    
    const srt = generateSRT(segments);
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${transcript.title || "transcript"}.srt"`);
    res.send(srt);
  });

  app.get("/api/transcripts/:id/export/txt", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    
    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const txt = generateTXT(transcript.text, {
      title: transcript.title || undefined,
      language: transcript.language || undefined,
      duration: transcript.duration || undefined,
      provider: transcript.provider || undefined,
      keywords: transcript.keywords as string[] | undefined,
    });
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Disposition", `attachment; filename="${transcript.title || "transcript"}.txt"`);
    res.send(txt);
  });

  // ==================== TRANSCRIPT SUMMARIZATION ====================
  const { summarizeTranscript, SUMMARIZATION_PROMPT_VERSION } = await import("./summarization");
  const { parseVoiceCommand, processVoiceCommand, generateVoiceResponse, SUPPORTED_VOICE_COMMANDS } = await import("./summarization/voice-commands");

  app.post("/api/transcripts/:id/summarize", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const config = getAppConfig();
    if (!config.features.aiEnabled) {
      return res.status(503).json({ 
        error: "AI features disabled",
        message: "AI summarization is currently disabled."
      });
    }

    const usageCheck = await incrementAiExtraction(userId);
    if (!usageCheck.success) {
      return res.status(403).json({
        error: "Monthly AI extraction limit reached",
        limitType: 'aiExtractions',
        current: usageCheck.current,
        limit: usageCheck.limit,
        upgradeUrl: '/app/settings?tab=subscription'
      });
    }

    try {
      const result = await summarizeTranscript(transcript.text, transcript.title || undefined);

      const tasksToCreate = result.output.tasks.map(task => ({
        transcriptId: transcript.id,
        userId,
        text: task.text,
        assignee: task.assignee || null,
        assigneeEmail: task.assigneeEmail || null,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        dueDateConfidence: task.dueDateConfidence || null,
        priority: task.priority || "medium",
        status: "pending" as const,
        keywords: task.keywords || [],
        context: task.context || null,
      }));

      const { summary, tasks } = await storage.createSummaryWithTasks(
        transcript.id,
        {
          transcriptId: transcript.id,
          userId,
          workspaceId: transcript.workspaceId,
          summary: result.output.summary,
          decisions: result.output.decisions,
          sentiment: result.output.sentiment.overall,
          sentimentScore: result.output.sentiment.score,
          sentimentDetails: result.output.sentiment.details,
          topKeywords: result.output.topKeywords,
          aiProvider: result.provider,
          aiModel: result.model,
          promptVersion: SUMMARIZATION_PROMPT_VERSION,
          processingTimeMs: result.processingTimeMs,
        },
        tasksToCreate
      );

      res.json({
        summary,
        tasks,
        aiResult: result,
      });
    } catch (error: any) {
      console.error("[Summarization Error]", error);
      res.status(500).json({ 
        error: error.message || "Summarization failed. Please try again."
      });
    }
  });

  app.post("/api/transcripts/:id/summarize-template", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { templateId } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    const { getTemplateById } = await import("../shared/templates");
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(400).json({ error: "Invalid template" });
    }

    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const config = getAppConfig();
    if (!config.features.aiEnabled) {
      return res.status(503).json({ error: "AI features disabled" });
    }

    try {
      const openai = new (await import("openai")).default({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = template.prompt.replace('{{transcript}}', transcript.text);
      const startTime = Date.now();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional summarization assistant. Always output well-formatted markdown." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });

      const result = completion.choices[0]?.message?.content || "No summary generated.";
      const processingTimeMs = Date.now() - startTime;

      const savedSummary = await storage.createTranscriptSummary({
        transcriptId: req.params.id,
        userId,
        summary: result,
        decisions: [],
        sentiment: 'neutral',
        sentimentScore: 0,
        topKeywords: [],
        aiProvider: "openai",
        aiModel: "gpt-4o-mini",
        promptVersion: `template:${template.id}`,
        processingTimeMs,
      });

      res.json({
        summary: result,
        summaryId: savedSummary.id,
        templateId: template.id,
        templateName: template.name,
        provider: "openai",
        model: "gpt-4o-mini",
        processingTimeMs,
      });
    } catch (error: any) {
      console.error("[Template Summarization Error]", error);
      res.status(500).json({ error: error.message || "Summarization failed" });
    }
  });

  app.post("/api/meetings/:id/summarize-template", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { templateId } = req.body;
    if (!templateId) {
      return res.status(400).json({ error: "templateId is required" });
    }

    const { getTemplateById } = await import("../shared/templates");
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(400).json({ error: "Invalid template" });
    }

    const meeting = await storage.getMeeting(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    if (meeting.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!meeting.rawNotes) {
      return res.status(400).json({ error: "Meeting has no notes to summarize" });
    }

    const config = getAppConfig();
    if (!config.features.aiEnabled) {
      return res.status(503).json({ error: "AI features disabled" });
    }

    try {
      const openai = new (await import("openai")).default({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const prompt = template.prompt.replace('{{transcript}}', meeting.rawNotes);
      const startTime = Date.now();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a professional summarization assistant. Always output well-formatted markdown." },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });

      const result = completion.choices[0]?.message?.content || "No summary generated.";
      const processingTimeMs = Date.now() - startTime;

      res.json({
        summary: result,
        templateId: template.id,
        templateName: template.name,
        provider: "openai",
        model: "gpt-4o-mini",
        processingTimeMs,
      });
    } catch (error: any) {
      console.error("[Template Summarization Error]", error);
      res.status(500).json({ error: error.message || "Summarization failed" });
    }
  });

  app.get("/api/summary-templates", async (_req, res) => {
    const { SUMMARY_TEMPLATES, TEMPLATE_CATEGORIES } = await import("../shared/templates");
    res.json({ templates: SUMMARY_TEMPLATES, categories: TEMPLATE_CATEGORIES });
  });

  app.get("/api/transcripts/:id/summary", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const summary = await storage.getTranscriptSummaryByTranscriptId(transcript.id);
    if (!summary) {
      return res.status(404).json({ error: "No summary found. Run summarization first." });
    }

    const tasks = await storage.getTranscriptTasks(summary.id);

    res.json({ summary, tasks });
  });

  app.get("/api/transcripts/:id/tasks", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const transcript = await storage.getTranscript(req.params.id);
    if (!transcript) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const tasks = await storage.getTranscriptTasksByTranscriptId(transcript.id);
    res.json(tasks);
  });

  app.put("/api/transcript-tasks/:id", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const task = await storage.getTranscriptTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const taskUpdateSchema = z.object({
      text: z.string().optional(),
      assignee: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
    });

    const parseResult = taskUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid update data", details: parseResult.error.errors });
    }

    const updates: any = { ...parseResult.data };
    if (parseResult.data.dueDate) {
      updates.dueDate = new Date(parseResult.data.dueDate);
    }
    if (parseResult.data.status === "completed") {
      updates.completedAt = new Date();
    }

    const updated = await storage.updateTranscriptTask(req.params.id, updates);
    res.json(updated);
  });

  // ==================== VOICE COMMANDS ====================
  app.get("/api/voice-commands", async (req, res) => {
    res.json({ commands: SUPPORTED_VOICE_COMMANDS });
  });

  app.post("/api/voice-command", audioUpload.single("audio"), async (req, res) => {
    const userId = req.query.userId as string;
    const transcriptId = req.query.transcriptId as string;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const validation = validateAudioFile(req.file.mimetype, req.file.size);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    if (!checkTranscriptionRateLimit(userId)) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }

    const estimatedMinutes = Math.ceil(req.file.size / (16000 * 60));
    const usageCheck = await incrementTranscriptionMinutes(userId, estimatedMinutes);
    if (!usageCheck.success) {
      return res.status(403).json({
        error: "Monthly transcription limit reached",
        limitType: 'transcription',
        current: usageCheck.current,
        limit: usageCheck.limit,
        upgradeUrl: '/app/settings?tab=subscription'
      });
    }

    try {
      const commandResult = await processVoiceCommand(req.file.buffer, req.file.mimetype);

      if (commandResult.command === "unknown") {
        return res.json({
          success: false,
          command: commandResult,
          response: generateVoiceResponse("unknown", false),
        });
      }

      let data: any = null;
      
      if (transcriptId) {
        const transcript = await storage.getTranscript(transcriptId);
        if (transcript && transcript.userId === userId) {
          const summary = await storage.getTranscriptSummaryByTranscriptId(transcriptId);
          if (summary) {
            const tasks = await storage.getTranscriptTasks(summary.id);
            data = { 
              summary: summary.summary, 
              decisions: summary.decisions,
              sentiment: { overall: summary.sentiment, score: summary.sentimentScore },
              topKeywords: summary.topKeywords,
              tasks 
            };
          }
        }
      }

      const response = generateVoiceResponse(commandResult.command, !!data, data);

      res.json({
        success: true,
        command: commandResult,
        response,
        data,
      });
    } catch (error: any) {
      console.error("[Voice Command Error]", error);
      res.status(500).json({
        success: false,
        error: error.message || "Voice command processing failed",
        response: generateVoiceResponse("unknown", false),
      });
    }
  });

  app.post("/api/voice-command/text", async (req, res) => {
    const userId = req.query.userId as string;
    const transcriptId = req.query.transcriptId as string;
    const { text } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    const commandResult = parseVoiceCommand(text);

    if (commandResult.command === "unknown") {
      return res.json({
        success: false,
        command: commandResult,
        response: generateVoiceResponse("unknown", false),
      });
    }

    let data: any = null;
    
    if (transcriptId) {
      const transcript = await storage.getTranscript(transcriptId);
      if (transcript && transcript.userId === userId) {
        const summary = await storage.getTranscriptSummaryByTranscriptId(transcriptId);
        if (summary) {
          const tasks = await storage.getTranscriptTasks(summary.id);
          data = { 
            summary: summary.summary, 
            decisions: summary.decisions,
            sentiment: { overall: summary.sentiment, score: summary.sentimentScore },
            topKeywords: summary.topKeywords,
            tasks 
          };
        }
      }
    }

    const response = generateVoiceResponse(commandResult.command, !!data, data);

    res.json({
      success: true,
      command: commandResult,
      response,
      data,
    });
  });

  // ==================== PROJECTS ====================
  const { parseTaskInput, suggestProjectsForTask, calculateNextOccurrence } = await import("./tasks/nlp-parser");
  
  app.get("/api/projects", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const workspaceId = req.query.workspaceId as string;
    
    if (workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'workspace', 'read');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    const projects = await storage.getProjects(userId, workspaceId || undefined);
    res.json(projects);
  });
  
  app.post("/api/projects", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { workspaceId, name, description, color, icon, keywords } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required" });
    }
    
    if (workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'workspace', 'write');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    const project = await storage.createProject({
      userId,
      workspaceId: workspaceId || null,
      name: name.trim(),
      description: description || null,
      color: color || '#8B5CF6',
      icon: icon || null,
      keywords: Array.isArray(keywords) ? keywords : [],
    });
    res.status(201).json(project);
  });
  
  app.put("/api/projects/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const updates = req.body;
    
    const existingProject = await storage.getProject(id);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (existingProject.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const project = await storage.updateProject(id, updates);
    res.json(project);
  });
  
  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    
    const existingProject = await storage.getProject(id);
    if (!existingProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (existingProject.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteProject(id);
    res.status(204).send();
  });

  // ==================== TASKS ====================
  app.get("/api/tasks", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const workspaceId = req.query.workspaceId as string;
    const projectId = req.query.projectId as string;
    const status = req.query.status as string;
    
    if (workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'workspace', 'read');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    const tasks = await storage.getTasks(userId, {
      workspaceId: workspaceId || undefined,
      projectId: projectId || undefined,
      status: status || undefined,
    });
    res.json(tasks);
  });
  
  app.post("/api/tasks", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { workspaceId, projectId, title, description, dueDate, priority, status, recurrence, recurrenceEndDate, sourceType, sourceId, tags, estimatedMinutes } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: "title is required" });
    }
    
    if (workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'workspace', 'write');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    if (projectId) {
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(400).json({ error: "Invalid project" });
      }
      if (workspaceId && project.workspaceId !== workspaceId) {
        return res.status(400).json({ error: "Project does not belong to this workspace" });
      }
    }
    
    let nextOccurrence = null;
    if (recurrence && dueDate) {
      nextOccurrence = calculateNextOccurrence(new Date(dueDate), recurrence);
    }
    
    const task = await storage.createTask({
      userId,
      workspaceId: workspaceId || null,
      projectId: projectId || null,
      title: title.trim(),
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      status: status || 'todo',
      recurrence: recurrence || null,
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
      nextOccurrence,
      sourceType: sourceType || null,
      sourceId: sourceId || null,
      tags: Array.isArray(tags) ? tags : [],
      estimatedMinutes: typeof estimatedMinutes === 'number' ? estimatedMinutes : null,
      position: 0,
    });
    res.status(201).json(task);
  });
  
  app.post("/api/tasks/parse", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { input, workspaceId } = req.body;
    
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: "input is required" });
    }
    
    if (workspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, workspaceId, 'workspace', 'read');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    const parsed = parseTaskInput(input);
    
    let projectSuggestions: { projectId: string; name: string; score: number }[] = [];
    if (parsed.suggestedProjectKeywords.length > 0) {
      const userProjects = await storage.getProjects(userId, workspaceId || undefined);
      projectSuggestions = suggestProjectsForTask(input, userProjects.map(p => ({
        id: p.id,
        name: p.name,
        keywords: p.keywords || [],
      })));
    }
    
    res.json({
      ...parsed,
      projectSuggestions,
    });
  });
  
  app.put("/api/tasks/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    const updates = req.body;
    
    const existingTask = await storage.getTask(id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (existingTask.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const targetWorkspaceId = updates.workspaceId !== undefined ? updates.workspaceId : existingTask.workspaceId;
    const targetProjectId = updates.projectId !== undefined ? updates.projectId : existingTask.projectId;
    
    if (targetWorkspaceId) {
      const hasAccess = await checkWorkspaceAccess(userId, targetWorkspaceId, 'workspace', 'write');
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }
    }
    
    if (targetProjectId) {
      const project = await storage.getProject(targetProjectId);
      if (!project || project.userId !== userId) {
        return res.status(400).json({ error: "Invalid project" });
      }
      if (targetWorkspaceId && project.workspaceId !== targetWorkspaceId) {
        return res.status(400).json({ error: "Project does not belong to this workspace" });
      }
      if (!targetWorkspaceId && project.workspaceId) {
        return res.status(400).json({ error: "Cannot assign workspace project to personal task" });
      }
    }
    
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }
    if (updates.recurrenceEndDate) {
      updates.recurrenceEndDate = new Date(updates.recurrenceEndDate);
    }
    
    const task = await storage.updateTask(id, updates);
    res.json(task);
  });
  
  app.post("/api/tasks/:id/complete", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    
    const task = await storage.getTask(id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (task.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const result = await storage.completeTaskWithRecurrence(id, task, calculateNextOccurrence);
    res.json(result.completedTask);
  });
  
  app.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { id } = req.params;
    
    const existingTask = await storage.getTask(id);
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }
    if (existingTask.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    await storage.deleteTask(id);
    res.status(204).send();
  });
  
  app.get("/api/tasks/by-source/:sourceType/:sourceId", requireAuth, async (req, res) => {
    const userId = req.userId!;
    const { sourceType, sourceId } = req.params;
    
    if (sourceType === 'meeting') {
      const meeting = await storage.getMeeting(sourceId);
      if (!meeting || meeting.userId !== userId) {
        return res.status(403).json({ error: "Access denied to meeting" });
      }
    } else if (sourceType === 'transcript') {
      const transcript = await storage.getTranscript(sourceId);
      if (!transcript || transcript.userId !== userId) {
        return res.status(403).json({ error: "Access denied to transcript" });
      }
    }
    
    const tasks = await storage.getTasksBySource(sourceType, sourceId);
    const userTasks = tasks.filter(t => t.userId === userId);
    res.json(userTasks);
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

  // ==================== AI EXTRACTION ====================
  app.post("/api/meetings/:id/extract", async (req, res) => {
    const userId = req.query.userId as string;
    const meetingId = req.params.id;
    
    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const config = getAppConfig();
      if (!config.features.aiEnabled) {
        return res.status(503).json({ 
          error: "AI features disabled",
          message: "AI extraction is currently disabled. Enable AI_FEATURE_ENABLED to use this feature."
        });
      }

      if (userId) {
        const usageCheck = await incrementAiExtraction(userId);
        if (!usageCheck.success) {
          return res.status(403).json({
            error: "Monthly AI extraction limit reached",
            limitType: 'aiExtractions',
            current: usageCheck.current,
            limit: usageCheck.limit,
            upgradeUrl: '/app/settings?tab=subscription'
          });
        }
      }

      await storage.updateMeeting(meetingId, { parseState: "processing" });

      const attendees = await storage.getAttendeesForMeeting(meetingId);
      const attendeeNames = attendees.map(a => a.name);

      const result = await extractMeetingNotes(meeting.title, attendeeNames, meeting.rawNotes);

      if (!result.validJson && result.errorText) {
        if (userId) {
          await storage.createAiAuditLog({
            userId,
            workspaceId: meeting.workspaceId,
            meetingId: meeting.id,
            provider: result.provider,
            model: result.model,
            promptVersion: PROMPT_VERSION,
            inputHash: result.inputHash,
            outputJson: null,
            validJson: false,
            errorText: result.errorText,
          });
        }
        await storage.updateMeeting(meetingId, { parseState: "error" });
        return res.status(500).json({ 
          error: "Extraction failed",
          message: "AI returned invalid JSON. Your notes are safe - please try again.",
          retryable: true
        });
      }

      const { output } = result;

      await storage.updateMeeting(meetingId, { 
        parseState: "parsed",
        summary: output.summary
      });

      const existingTasks = userId ? await storage.getTasksBySource('meeting', meetingId) : [];
      const existingTaskTitles = new Set(existingTasks.filter(t => t.userId === userId).map(t => t.title));
      
      const safeParseDueDate = (dateStr: string | null | undefined): Date | null => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const createdTasks = [];
      for (const item of output.actionItems) {
        const status = mapConfidenceToStatus(item.confidenceOwner, item.confidenceDueDate);
        const parsedDueDate = safeParseDueDate(item.dueDate);
        const actionItem = await storage.createActionItem({
          meetingId,
          workspaceId: meeting.workspaceId,
          text: item.text,
          ownerName: item.ownerName || null,
          ownerEmail: item.ownerEmail || null,
          status,
          confidenceOwner: item.confidenceOwner,
          confidenceDueDate: item.confidenceDueDate,
          tags: [],
          dueDate: parsedDueDate
        });
        
        if (userId && !existingTaskTitles.has(item.text)) {
          const taskPriority = item.confidenceOwner >= 0.8 ? 'high' : 
                               item.confidenceOwner >= 0.5 ? 'medium' : 'low';
          const task = await storage.createTask({
            userId,
            workspaceId: meeting.workspaceId || null,
            projectId: null,
            title: item.text,
            description: `From meeting: ${meeting.title}`,
            status: status === 'needs_review' ? 'pending' : 'todo',
            priority: taskPriority,
            dueDate: parsedDueDate,
            recurrence: null,
            recurrenceEndDate: null,
            nextOccurrence: null,
            sourceType: 'meeting',
            sourceId: meetingId,
            tags: [],
            estimatedMinutes: null,
          });
          createdTasks.push(task);
          existingTaskTitles.add(item.text);
        }
      }

      for (const decision of output.decisions) {
        await storage.createDecision({ meetingId, text: decision.text });
      }

      for (const risk of output.risks) {
        await storage.createRisk({ meetingId, text: risk.text, severity: risk.severity });
      }

      for (const question of output.clarifyingQuestions) {
        await storage.createClarifyingQuestion({ 
          meetingId, 
          text: question.text, 
          options: question.options || null 
        });
      }

      if (userId) {
        await storage.createAiAuditLog({
          userId,
          workspaceId: meeting.workspaceId,
          meetingId: meeting.id,
          provider: result.provider,
          model: result.model,
          promptVersion: PROMPT_VERSION,
          inputHash: result.inputHash,
          outputJson: output,
          validJson: true,
        });
      }

      res.json({ 
        success: true, 
        provider: result.provider,
        summary: output.summary,
        actionItemsCount: output.actionItems.length,
        decisionsCount: output.decisions.length,
        risksCount: output.risks.length,
        tasksCreated: createdTasks.length,
        qualityFlags: output.qualityFlags
      });
    } catch (error) {
      console.error("[Extract Error]", error);
      await storage.updateMeeting(meetingId, { parseState: "error" });
      res.status(500).json({ 
        error: "Extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
        retryable: true
      });
    }
  });

  // ==================== DRAFT GENERATION ====================
  app.post("/api/meetings/:id/generate-drafts", async (req, res) => {
    const userId = req.query.userId as string;
    const meetingId = req.params.id;

    try {
      const meeting = await storage.getMeeting(meetingId);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const config = getAppConfig();
      if (!config.features.aiEnabled) {
        return res.status(503).json({ 
          error: "AI features disabled",
          message: "Draft generation is currently disabled."
        });
      }

      const actionItems = await storage.getActionItemsForMeeting(meetingId);
      const decisions = await storage.getDecisionsForMeeting(meetingId);

      const result = await generateFollowUpDrafts(
        meeting.title,
        meeting.summary || "",
        actionItems.map(a => ({ text: a.text, ownerName: a.ownerName || undefined })),
        decisions.map(d => ({ text: d.text })),
        user.tone
      );

      if (!result.validJson && result.errorText) {
        await storage.createAiAuditLog({
          userId,
          workspaceId: meeting.workspaceId,
          meetingId: meeting.id,
          provider: result.provider,
          model: result.model,
          promptVersion: PROMPT_VERSION,
          inputHash: result.inputHash,
          outputJson: null,
          validJson: false,
          errorText: result.errorText,
        });
        return res.status(500).json({ 
          error: "Draft generation failed",
          message: "AI returned invalid JSON. Please try again.",
          retryable: true
        });
      }

      const createdDrafts = [];
      for (const draft of result.output.drafts) {
        const created = await storage.createDraft({
          meetingId,
          userId,
          workspaceId: meeting.workspaceId,
          type: draft.type,
          recipientName: draft.recipientName || null,
          recipientEmail: draft.recipientEmail || null,
          subject: draft.subject,
          body: draft.body,
          tone: user.tone,
          state: 'generated'
        });
        createdDrafts.push(created);
      }

      await storage.createAiAuditLog({
        userId,
        workspaceId: meeting.workspaceId,
        meetingId: meeting.id,
        provider: result.provider,
        model: result.model,
        promptVersion: PROMPT_VERSION,
        inputHash: result.inputHash,
        outputJson: result.output,
        validJson: true,
      });

      res.json({ 
        success: true,
        provider: result.provider,
        draftsCount: createdDrafts.length,
        drafts: createdDrafts
      });
    } catch (error) {
      console.error("[Draft Generation Error]", error);
      res.status(500).json({ 
        error: "Draft generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
        retryable: true
      });
    }
  });

  // ==================== FEEDBACK ROUTES ====================
  const feedbackUpdateSchema = z.object({
    status: z.enum(['new', 'in_progress', 'done']),
  });

  const requireAdminAccess = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const isAdmin = user.email?.includes("admin") || 
                    user.email === "test@actionminutes.com" ||
                    user.email === "demo@actionminutes.com";
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  app.post("/api/feedback", async (req, res) => {
    try {
      const validatedFeedback = insertFeedbackSchema.parse(req.body);
      const fb = await storage.createFeedback(validatedFeedback);
      res.json(fb);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
    }
  });

  app.get("/api/admin/feedback", requireAdminAccess, async (req, res) => {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const feedbackList = await storage.getAllFeedback(search, status);
    res.json(feedbackList);
  });

  app.get("/api/admin/feedback/:id", requireAdminAccess, async (req, res) => {
    const fb = await storage.getFeedback(req.params.id);
    if (!fb) return res.status(404).json({ error: "Feedback not found" });
    res.json(fb);
  });

  app.patch("/api/admin/feedback/:id", requireAdminAccess, async (req, res) => {
    try {
      const validatedUpdate = feedbackUpdateSchema.parse(req.body);
      const fb = await storage.updateFeedback(req.params.id, validatedUpdate);
      if (!fb) return res.status(404).json({ error: "Feedback not found" });
      res.json(fb);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid status value" });
    }
  });

  // ==================== GEO DETECTION ====================
  const EU_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]);

  app.get("/api/geo", async (req, res) => {
    try {
      const cfCountry = req.headers['cf-ipcountry'] as string | undefined;
      const xCountry = req.headers['x-country'] as string | undefined;
      const countryCode = cfCountry || xCountry || null;
      
      const isEU = countryCode ? EU_COUNTRIES.has(countryCode.toUpperCase()) : false;
      const currency = isEU ? 'EUR' : 'USD';
      
      // Get publishable key from Stripe connector
      let publishableKey: string | null = null;
      try {
        const { getStripePublishableKey } = await import('./stripeClient');
        publishableKey = await getStripePublishableKey();
      } catch (stripeError) {
        // Stripe connector not configured - key will be null
        console.log('Stripe connector not available for geo endpoint');
      }
      
      res.json({
        countryCode: countryCode?.toUpperCase() || null,
        isEU,
        currency,
        pricingTableId: process.env.STRIPE_PRICING_TABLE_ID || null,
        publishableKey
      });
    } catch (error) {
      res.json({
        countryCode: null,
        isEU: false,
        currency: 'USD',
        pricingTableId: process.env.STRIPE_PRICING_TABLE_ID || null,
        publishableKey: null
      });
    }
  });

  // ==================== GLOBAL TAGS ROUTES ====================
  app.get("/api/tags", requireAuth, async (req, res) => {
    const tags = await storage.getGlobalTags(req.userId!);
    res.json(tags);
  });

  app.post("/api/tags", requireAuth, async (req, res) => {
    const tag = await storage.createGlobalTag({
      userId: req.userId!,
      name: req.body.name,
      color: req.body.color || null,
    });
    res.json(tag);
  });

  app.delete("/api/tags/:id", requireAuth, async (req, res) => {
    await storage.deleteGlobalTag(req.params.id);
    res.json({ success: true });
  });

  // ==================== USER LOCATIONS ROUTES ====================
  app.get("/api/locations", requireAuth, async (req, res) => {
    const search = req.query.search as string | undefined;
    const locations = await storage.getUserLocations(req.userId!, search);
    res.json(locations);
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    const location = await storage.upsertUserLocation(req.userId!, req.body.name);
    res.json(location);
  });

  // Apply global error handler last
  app.use(errorHandler);

  return httpServer;
}
