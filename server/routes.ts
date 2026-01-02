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
import { getAppConfig, getAppConfigAsync } from "./config";
import { extractMeetingNotes, generateFollowUpDrafts, mapConfidenceToStatus, PROMPT_VERSION } from "./ai";
import multer from "multer";
import { extractTextFromImage, validateImageFile, MAX_FILE_SIZE } from "./ocr";
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
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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
  
  // ==================== SESSION SETUP ====================
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "action-minutes-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );
  
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

  // ==================== AUTHENTICATION ROUTES ====================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        tone: "direct",
        timezone: "UTC",
        aiEnabled: true,
        autoGenerateDrafts: true,
        enablePersonal: true,
      });
      
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/demo", async (req, res) => {
    const demoEmail = "demo@actionminutes.com";
    const demoPassword = "demo123";
    let user = await storage.getUserByEmail(demoEmail);
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(demoPassword, 10);
      user = await storage.createUser({
        email: demoEmail,
        password: hashedPassword,
        name: "Demo User",
        tone: "direct",
        timezone: "UTC",
        aiEnabled: true,
        autoGenerateDrafts: true,
        enablePersonal: true
      });
    }
    
    req.session.userId = user.id;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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
    const action = await storage.updateActionItem(req.params.id, updates);
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

  // ==================== PERSONAL ENTRIES (JOURNAL) ====================
  app.get("/api/personal/journal", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const entries = await storage.getPersonalEntries(userId);
    res.json(entries);
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
      const analysis = await analyzeJournalEntry(rawText);
      const safetyRisk = detectSafetyRisk(rawText);
      
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
      res.status(400).json({ error: error instanceof Error ? error.message : "Validation error" });
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
      res.status(500).json({ error: "Failed to get prompts" });
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
    
    const updated = await storage.updatePersonalReminder(req.params.id, req.body);
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
    
    // Check which providers are configured (Replit connector or manual credentials)
    const googleConfigured = !!(
      process.env.GOOGLE_MAIL_CONNECTION_ID || 
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    );
    const microsoftConfigured = !!(
      process.env.OUTLOOK_CONNECTION_ID || 
      (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
    );
    
    // Check if using Replit-managed connectors
    const useReplitGmail = !!process.env.GOOGLE_MAIL_CONNECTION_ID;
    const useReplitOutlook = !!process.env.OUTLOOK_CONNECTION_ID;
    
    res.json({
      google: {
        configured: googleConfigured,
        replitManaged: useReplitGmail,
        connected: connections.find(c => c.provider === 'google') || null,
      },
      microsoft: {
        configured: microsoftConfigured,
        replitManaged: useReplitOutlook,
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

  // ==================== OAUTH ROUTES ====================
  app.get("/api/oauth/google/start", async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
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
      providerDraftId: result.draftId,
      providerMetadata: { provider: 'gmail', webLink: result.webLink, createdAt: new Date().toISOString() },
    });
    
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
      providerDraftId: result.draftId,
      providerMetadata: { provider: 'outlook', webLink: result.webLink, createdAt: new Date().toISOString() },
    });
    
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

      for (const item of output.actionItems) {
        const status = mapConfidenceToStatus(item.confidenceOwner, item.confidenceDueDate);
        await storage.createActionItem({
          meetingId,
          workspaceId: meeting.workspaceId,
          text: item.text,
          ownerName: item.ownerName || null,
          ownerEmail: item.ownerEmail || null,
          status,
          confidenceOwner: item.confidenceOwner,
          confidenceDueDate: item.confidenceDueDate,
          tags: [],
          dueDate: item.dueDate ? new Date(item.dueDate) : null
        });
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
    const isAdmin = user.email.includes("admin") || 
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

  // Apply global error handler last
  app.use(errorHandler);

  return httpServer;
}
