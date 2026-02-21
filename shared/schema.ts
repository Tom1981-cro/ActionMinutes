import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, real, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Import users for references in this file, then re-export everything from auth models
import { users, sessions, refreshTokens, passwordResetTokens, usageTracking } from "./models/auth";
export { users, sessions, refreshTokens, passwordResetTokens, usageTracking } from "./models/auth";
export type { User, UpsertUser, RefreshToken, PasswordResetToken, UsageTracking } from "./models/auth";

// ==================== WORKSPACES (Phase 2) ====================
export const workspaces = pgTable("workspaces", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdByUserId: varchar("created_by_user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text("role").notNull().default('member'), // owner, admin, member, viewer
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaceInvites = pgTable("workspace_invites", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id", { length: 36 }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default('member'),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

// ==================== OAUTH CONNECTIONS (Phase 2) ====================
export const oauthConnections = pgTable("oauth_connections", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(), // google, microsoft
  accountEmail: text("account_email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scopes: text("scopes").array(),
  calendarSyncToken: text("calendar_sync_token"), // Google syncToken or Microsoft deltaLink
  calendarId: text("calendar_id"), // Primary calendar ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  lastCalendarSync: timestamp("last_calendar_sync"),
});

// ==================== CALENDAR EVENTS (Provider Sync) ====================
export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  connectionId: varchar("connection_id", { length: 36 }).references(() => oauthConnections.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(), // google, microsoft, local
  providerEventId: text("provider_event_id"), // null for local events
  calendarId: text("calendar_id"), // provider's calendar ID
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  allDay: boolean("all_day").notNull().default(false),
  recurrenceRule: text("recurrence_rule"), // RRULE format
  status: text("status").notNull().default('confirmed'), // confirmed, tentative, cancelled
  transparency: text("transparency").default('opaque'), // opaque (busy) or transparent (free)
  attendees: jsonb("attendees").$type<{ email: string; name?: string; status?: string }[]>(),
  reminders: jsonb("reminders").$type<{ method: string; minutes: number }[]>(),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  color: text("color"),
  isReadOnly: boolean("is_read_only").notNull().default(false),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const calendarWebhooks = pgTable("calendar_webhooks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id", { length: 36 }).notNull().references(() => oauthConnections.id, { onDelete: 'cascade' }),
  provider: text("provider").notNull(),
  channelId: text("channel_id").notNull(), // Google: channel_id, Microsoft: subscription_id
  resourceId: text("resource_id"), // Google's resource ID
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== CALENDAR EXPORTS (Phase 2) ====================
export const calendarExports = pgTable("calendar_exports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  filename: text("filename").notNull(),
  contentHash: text("content_hash"),
  options: jsonb("options"), // { includeActionItems: boolean }
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== AI AUDIT LOGS (Phase 2) ====================
export const aiAuditLogs = pgTable("ai_audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  provider: text("provider").notNull(), // openai, google, mock
  model: text("model").notNull(),
  promptVersion: text("prompt_version"),
  inputHash: text("input_hash"),
  outputJson: jsonb("output_json"),
  validJson: boolean("valid_json").notNull().default(true),
  errorText: text("error_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== MEETINGS ====================
export const meetings = pgTable("meetings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time"),
  duration: text("duration"),
  location: text("location"),
  rawNotes: text("raw_notes").notNull(),
  parseState: text("parse_state").notNull().default('draft'),
  summary: text("summary"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const attendees = pgTable("attendees", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email"),
});

export const decisions = pgTable("decisions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
});

export const risks = pgTable("risks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  severity: text("severity").notNull().default('medium'),
});

export const clarifyingQuestions = pgTable("clarifying_questions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  options: text("options").array(),
  answer: text("answer"),
});

// ==================== ACTION ITEMS ====================
export const actionItems = pgTable("action_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  ownerUserId: varchar("owner_user_id", { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  dueDate: timestamp("due_date"),
  deadline: timestamp("deadline"),
  status: text("status").notNull().default('needs_review'),
  priority: text("priority").notNull().default('normal'),
  source: text("source").notNull().default('meeting'),
  confidenceOwner: real("confidence_owner").notNull().default(0),
  confidenceDueDate: real("confidence_due_date").notNull().default(0),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  description: text("description"),
  subtasks: jsonb("subtasks"),
  notes: text("notes"),
  location: text("location"),
  recurrence: text("recurrence"),
  reminderAt: timestamp("reminder_at"),
  completedAt: timestamp("completed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== DRAFTS ====================
export const followUpDrafts = pgTable("follow_up_drafts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id", { length: 36 }).notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  type: text("type").notNull(),
  recipientName: text("recipient_name"),
  recipientEmail: text("recipient_email"),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  tone: text("tone").notNull(),
  state: text("state").notNull().default('generated'),
  providerDraftId: text("provider_draft_id"),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== PERSONAL ENTRIES (Journal) ====================
export const personalEntries = pgTable("personal_entries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  rawText: text("raw_text").notNull(),
  summary: text("summary"),
  top3: text("top3").array(),
  nextSteps: text("next_steps").array(),
  mood: text("mood"), // good, okay, tough
  promptUsed: text("prompt_used"), // which smart prompt was used
  templateUsed: text("template_used"), // morning_intentions, evening_winddown
  linkedMeetingId: varchar("linked_meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  detectedSignals: text("detected_signals").array(), // overwhelm, deadlines, conflict, decision, avoidance
  extractedActions: text("extracted_actions").array(), // AI-detected potential tasks from entry text
  aiProcessed: boolean("ai_processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== JOURNAL PROMPTS ====================
export const journalPrompts = pgTable("journal_prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(), // reflection, goals, gratitude, challenges
  intent: text("intent").notNull().default('reflect'), // clarify, prioritize, unblock, reflect, plan
  text: text("text").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const journalPromptShown = pgTable("journal_prompt_shown", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  promptId: varchar("prompt_id", { length: 36 }).notNull().references(() => journalPrompts.id, { onDelete: 'cascade' }),
  entryId: varchar("entry_id", { length: 36 }).references(() => personalEntries.id, { onDelete: 'set null' }),
  shown: boolean("shown").notNull().default(true),
  responded: boolean("responded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== FEEDBACK ====================
export const feedback = pgTable("feedback", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // bug, feature, ux, other
  message: text("message").notNull(),
  email: text("email"),
  route: text("route"),
  viewport: text("viewport"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default('new'), // new, in_progress, done
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== TRANSCRIPTS ====================
export const transcripts = pgTable("transcripts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  title: text("title"),
  text: text("text").notNull(),
  language: text("language").notNull().default('en'),
  duration: integer("duration"), // in seconds
  provider: text("provider").notNull().default('gemini'), // gemini, whisper, whisper-self-hosted
  modelSize: text("model_size").default('base'), // tiny, base, small, medium, large
  confidence: real("confidence"),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  segments: jsonb("segments"), // Array of {start, end, text} for SRT generation
  sourceFileName: text("source_file_name"),
  sourceFileSize: integer("source_file_size"),
  sourceMimeType: text("source_mime_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== TRANSCRIPT SUMMARIES ====================
export const transcriptSummaries = pgTable("transcript_summaries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  transcriptId: varchar("transcript_id", { length: 36 }).notNull().references(() => transcripts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  summary: text("summary").notNull(),
  decisions: jsonb("decisions").notNull().default(sql`'[]'::jsonb`), // Array of {text, context}
  sentiment: text("sentiment").notNull().default('neutral'), // positive, negative, neutral, mixed
  sentimentScore: real("sentiment_score"), // -1.0 to 1.0
  sentimentDetails: jsonb("sentiment_details"), // {positive: number, negative: number, neutral: number}
  topKeywords: text("top_keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  aiProvider: text("ai_provider").notNull().default('openai'),
  aiModel: text("ai_model").notNull().default('gpt-4o-mini'),
  promptVersion: text("prompt_version"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== TRANSCRIPT TASKS ====================
export const transcriptTasks = pgTable("transcript_tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  summaryId: varchar("summary_id", { length: 36 }).notNull().references(() => transcriptSummaries.id, { onDelete: 'cascade' }),
  transcriptId: varchar("transcript_id", { length: 36 }).notNull().references(() => transcripts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  assignee: text("assignee"), // Name of person assigned
  assigneeEmail: text("assignee_email"),
  dueDate: timestamp("due_date"),
  dueDateConfidence: real("due_date_confidence"), // 0.0 to 1.0
  priority: text("priority").default('medium'), // low, medium, high, urgent
  status: text("status").notNull().default('pending'), // pending, in_progress, completed
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  context: text("context"), // Relevant portion of transcript
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ==================== PROJECTS ====================
export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default('#8B5CF6'),
  icon: text("icon"),
  keywords: text("keywords").array().notNull().default(sql`ARRAY[]::text[]`),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== TASKS ====================
export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").notNull().default('medium'),
  status: text("status").notNull().default('todo'),
  recurrence: text("recurrence"),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  nextOccurrence: timestamp("next_occurrence"),
  sourceType: text("source_type"),
  sourceId: varchar("source_id", { length: 36 }),
  tags: text("tags").array().notNull().default(sql`ARRAY[]::text[]`),
  estimatedMinutes: integer("estimated_minutes"),
  position: integer("position").notNull().default(0),
  completedAt: timestamp("completed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ==================== INSERT SCHEMAS ====================
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceInviteSchema = createInsertSchema(workspaceInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export const insertOAuthConnectionSchema = createInsertSchema(oauthConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsedAt: true,
});

export const insertCalendarExportSchema = createInsertSchema(calendarExports).omit({
  id: true,
  createdAt: true,
});

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.coerce.date(),
});

export const insertAttendeeSchema = createInsertSchema(attendees).omit({
  id: true,
});

export const insertDecisionSchema = createInsertSchema(decisions).omit({
  id: true,
});

export const insertRiskSchema = createInsertSchema(risks).omit({
  id: true,
});

export const insertClarifyingQuestionSchema = createInsertSchema(clarifyingQuestions).omit({
  id: true,
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
});

export const insertFollowUpDraftSchema = createInsertSchema(followUpDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPersonalEntrySchema = createInsertSchema(personalEntries).omit({
  id: true,
  createdAt: true,
});

export const insertJournalPromptSchema = createInsertSchema(journalPrompts).omit({
  id: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export const insertTranscriptSchema = createInsertSchema(transcripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscriptSummarySchema = createInsertSchema(transcriptSummaries).omit({
  id: true,
  createdAt: true,
});

export const insertTranscriptTaskSchema = createInsertSchema(transcriptTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  deletedAt: true,
});

// ==================== TYPES ====================
// Note: User and UpsertUser types are exported from ./models/auth
export type InsertUser = z.infer<typeof insertUserSchema>;

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;

export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;

export type InsertWorkspaceInvite = z.infer<typeof insertWorkspaceInviteSchema>;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;

export type InsertOAuthConnection = z.infer<typeof insertOAuthConnectionSchema>;
export type OAuthConnection = typeof oauthConnections.$inferSelect;

export type InsertCalendarExport = z.infer<typeof insertCalendarExportSchema>;
export type CalendarExport = typeof calendarExports.$inferSelect;

export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;
export type AiAuditLog = typeof aiAuditLogs.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendees.$inferSelect;

export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisions.$inferSelect;

export type InsertRisk = z.infer<typeof insertRiskSchema>;
export type Risk = typeof risks.$inferSelect;

export type InsertClarifyingQuestion = z.infer<typeof insertClarifyingQuestionSchema>;
export type ClarifyingQuestion = typeof clarifyingQuestions.$inferSelect;

export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;

export type InsertFollowUpDraft = z.infer<typeof insertFollowUpDraftSchema>;
export type FollowUpDraft = typeof followUpDrafts.$inferSelect;

export type InsertPersonalEntry = z.infer<typeof insertPersonalEntrySchema>;
export type PersonalEntry = typeof personalEntries.$inferSelect;

export type InsertJournalPrompt = z.infer<typeof insertJournalPromptSchema>;
export type JournalPrompt = typeof journalPrompts.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export type InsertTranscript = z.infer<typeof insertTranscriptSchema>;
export type Transcript = typeof transcripts.$inferSelect;

export type InsertTranscriptSummary = z.infer<typeof insertTranscriptSummarySchema>;
export type TranscriptSummary = typeof transcriptSummaries.$inferSelect;

export type InsertTranscriptTask = z.infer<typeof insertTranscriptTaskSchema>;
export type TranscriptTask = typeof transcriptTasks.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ==================== ADDITIONAL TYPES ====================
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type TaskSourceType = 'manual' | 'meeting' | 'transcript' | 'email';
export type TranscriptionProvider = 'gemini' | 'whisper' | 'whisper-self-hosted';
export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}
export type ReminderBucket = 'today' | 'tomorrow' | 'next_week' | 'next_month' | 'sometime';
export type ReminderPriority = 'low' | 'normal' | 'high';
export type JournalMood = 'good' | 'okay' | 'tough';
export type PromptCategory = 'reflection' | 'goals' | 'gratitude' | 'challenges';
export type PromptIntent = 'clarify' | 'prioritize' | 'unblock' | 'reflect' | 'plan';
export type EntrySignal = 'overwhelm' | 'deadlines' | 'conflict' | 'decision' | 'avoidance';

export type JournalPromptShown = typeof journalPromptShown.$inferSelect;

// ==================== ROLE TYPES ====================
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type OAuthProvider = 'google' | 'microsoft';
export type CalendarProvider = 'google' | 'microsoft' | 'local';
export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';

// ==================== CALENDAR SCHEMAS & TYPES ====================
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCalendarWebhookSchema = createInsertSchema(calendarWebhooks).omit({
  id: true,
  createdAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarWebhook = z.infer<typeof insertCalendarWebhookSchema>;
export type CalendarWebhook = typeof calendarWebhooks.$inferSelect;

// ==================== NOTES MODULE ====================
export const notes = pgTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: varchar("workspace_id", { length: 36 }).references(() => workspaces.id, { onDelete: 'set null' }),
  title: text("title").notNull(),
  contentEncrypted: text("content_encrypted").notNull(),
  contentIv: text("content_iv").notNull(),
  contentPlaintext: text("content_plaintext"),
  searchVector: text("search_vector"),
  isJournal: boolean("is_journal").notNull().default(false),
  visibility: text("visibility").notNull().default('private'),
  isPinned: boolean("is_pinned").notNull().default(false),
  color: text("color"),
  moodScore: integer("mood_score"),
  moodLabel: text("mood_label"),
  promptId: varchar("prompt_id", { length: 36 }),
  meetingId: varchar("meeting_id", { length: 36 }).references(() => meetings.id, { onDelete: 'set null' }),
  collection: text("collection"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const noteTags = pgTable("note_tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const noteTagMap = pgTable("note_tag_map", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: varchar("tag_id", { length: 36 }).notNull().references(() => noteTags.id, { onDelete: 'cascade' }),
});

export const noteLinks = pgTable("note_links", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  fromNoteId: varchar("from_note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  toNoteId: varchar("to_note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const noteAttachments = pgTable("note_attachments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  noteId: varchar("note_id", { length: 36 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  transcriptId: varchar("transcript_id", { length: 36 }).references(() => transcripts.id, { onDelete: 'set null' }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertNoteTagSchema = createInsertSchema(noteTags).omit({
  id: true,
  createdAt: true,
});
export const insertNoteLinkSchema = createInsertSchema(noteLinks).omit({
  id: true,
  createdAt: true,
});
export const insertNoteAttachmentSchema = createInsertSchema(noteAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNoteTag = z.infer<typeof insertNoteTagSchema>;
export type NoteTag = typeof noteTags.$inferSelect;
export type InsertNoteLink = z.infer<typeof insertNoteLinkSchema>;
export type NoteLink = typeof noteLinks.$inferSelect;
export type InsertNoteAttachment = z.infer<typeof insertNoteAttachmentSchema>;
export type NoteAttachment = typeof noteAttachments.$inferSelect;

// ==================== CUSTOM LISTS ====================
export const customLists = pgTable("custom_lists", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color").default('#8B5CF6'),
  icon: text("icon"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const customListItems = pgTable("custom_list_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  listId: varchar("list_id", { length: 36 }).notNull().references(() => customLists.id, { onDelete: 'cascade' }),
  reminderId: varchar("reminder_id", { length: 36 }),
  taskId: varchar("task_id", { length: 36 }).references(() => tasks.id, { onDelete: 'cascade' }),
  actionItemId: varchar("action_item_id", { length: 36 }).references(() => actionItems.id, { onDelete: 'cascade' }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomListSchema = createInsertSchema(customLists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCustomListItemSchema = createInsertSchema(customListItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomList = z.infer<typeof insertCustomListSchema>;
export type CustomList = typeof customLists.$inferSelect;
export type InsertCustomListItem = z.infer<typeof insertCustomListItemSchema>;
export type CustomListItem = typeof customListItems.$inferSelect;

// ==================== GLOBAL TAGS ====================
export const globalTags = pgTable("global_tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ==================== USER LOCATIONS (for autofill) ====================
export const userLocations = pgTable("user_locations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  usageCount: integer("usage_count").notNull().default(1),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGlobalTagSchema = createInsertSchema(globalTags).omit({
  id: true,
  createdAt: true,
});
export const insertUserLocationSchema = createInsertSchema(userLocations).omit({
  id: true,
  createdAt: true,
});

export type InsertGlobalTag = z.infer<typeof insertGlobalTagSchema>;
export type GlobalTag = typeof globalTags.$inferSelect;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
export type UserLocation = typeof userLocations.$inferSelect;

// ==================== CHAT (AI Integration) ====================
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// ==================== TASK ATTACHMENTS ====================
export const taskAttachments = pgTable("task_attachments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  parentType: text("parent_type").notNull(), // "action_item" or "reminder"
  parentId: varchar("parent_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskAttachmentSchema = createInsertSchema(taskAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertTaskAttachment = z.infer<typeof insertTaskAttachmentSchema>;
export type TaskAttachment = typeof taskAttachments.$inferSelect;
