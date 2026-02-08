import { 
  users, meetings, attendees, decisions, risks, clarifyingQuestions,
  actionItems, followUpDrafts, personalEntries, personalReminders, journalPrompts, journalPromptShown,
  workspaces, workspaceMembers, workspaceInvites,
  oauthConnections, calendarExports, aiAuditLogs, feedback, transcripts,
  transcriptSummaries, transcriptTasks, projects, tasks,
  refreshTokens, passwordResetTokens, calendarEvents, calendarWebhooks,
  notes, noteTags, noteTagMap, noteLinks, noteAttachments,
  customLists, customListItems,
  globalTags, userLocations, taskAttachments,
  type User, type InsertUser,
  type Meeting, type InsertMeeting,
  type Attendee, type InsertAttendee,
  type Decision, type InsertDecision,
  type Risk, type InsertRisk,
  type ClarifyingQuestion, type InsertClarifyingQuestion,
  type ActionItem, type InsertActionItem,
  type FollowUpDraft, type InsertFollowUpDraft,
  type PersonalEntry, type InsertPersonalEntry,
  type PersonalReminder, type InsertPersonalReminder,
  type JournalPrompt, type InsertJournalPrompt,
  type Workspace, type InsertWorkspace,
  type WorkspaceMember, type InsertWorkspaceMember,
  type WorkspaceInvite, type InsertWorkspaceInvite,
  type OAuthConnection, type InsertOAuthConnection,
  type CalendarExport, type InsertCalendarExport,
  type AiAuditLog, type InsertAiAuditLog,
  type Feedback, type InsertFeedback,
  type Transcript, type InsertTranscript,
  type TranscriptSummary, type InsertTranscriptSummary,
  type TranscriptTask, type InsertTranscriptTask,
  type Project, type InsertProject,
  type Task, type InsertTask,
  type WorkspaceRole,
  type RefreshToken, type PasswordResetToken,
  type CalendarEvent, type InsertCalendarEvent,
  type CalendarWebhook, type InsertCalendarWebhook,
  type Note, type InsertNote,
  type NoteTag, type InsertNoteTag,
  type NoteLink, type InsertNoteLink,
  type NoteAttachment, type InsertNoteAttachment,
  type CustomList, type InsertCustomList,
  type CustomListItem, type InsertCustomListItem,
  type GlobalTag, type InsertGlobalTag,
  type UserLocation, type InsertUserLocation,
  type TaskAttachment, type InsertTaskAttachment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, isNull, ilike, gte, lte, inArray, lt, not } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByClerkId(clerkId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionPlan?: string | null;
  }): Promise<User | undefined>;
  
  // Refresh Tokens
  createRefreshToken(token: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string | null; ipAddress?: string | null }): Promise<RefreshToken>;
  getRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | undefined>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;
  
  // Password Reset Tokens
  createPasswordResetToken(token: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordResetToken>;
  getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  
  // Meetings
  getMeetings(userId: string, workspaceId?: string): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<void>;
  
  // Attendees
  getAttendeesForMeeting(meetingId: string): Promise<Attendee[]>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  deleteAttendeesForMeeting(meetingId: string): Promise<void>;
  
  // Decisions
  getDecisionsForMeeting(meetingId: string): Promise<Decision[]>;
  createDecision(decision: InsertDecision): Promise<Decision>;
  deleteDecisionsForMeeting(meetingId: string): Promise<void>;
  
  // Risks
  getRisksForMeeting(meetingId: string): Promise<Risk[]>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  
  // Questions
  getClarifyingQuestionsForMeeting(meetingId: string): Promise<ClarifyingQuestion[]>;
  createClarifyingQuestion(question: InsertClarifyingQuestion): Promise<ClarifyingQuestion>;
  
  // Action Items
  getActionItems(userId: string, workspaceId?: string): Promise<ActionItem[]>;
  getActionItemsForMeeting(meetingId: string): Promise<ActionItem[]>;
  getActionItem(id: string): Promise<ActionItem | undefined>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem | undefined>;
  deleteActionItem(id: string): Promise<void>;
  
  // Drafts
  getDrafts(userId: string, workspaceId?: string): Promise<FollowUpDraft[]>;
  getDraftsForMeeting(meetingId: string): Promise<FollowUpDraft[]>;
  getDraft(id: string): Promise<FollowUpDraft | undefined>;
  createDraft(draft: InsertFollowUpDraft): Promise<FollowUpDraft>;
  updateDraft(id: string, updates: Partial<FollowUpDraft>): Promise<FollowUpDraft | undefined>;
  deleteDraft(id: string): Promise<void>;
  
  // Personal Entries (Journal)
  getPersonalEntries(userId: string): Promise<PersonalEntry[]>;
  getPersonalEntry(id: string): Promise<PersonalEntry | undefined>;
  createPersonalEntry(entry: InsertPersonalEntry): Promise<PersonalEntry>;
  updatePersonalEntry(id: string, updates: Partial<PersonalEntry>): Promise<PersonalEntry | undefined>;
  deletePersonalEntry(id: string): Promise<void>;
  
  // Personal Reminders
  getPersonalReminders(userId: string, bucket?: string): Promise<PersonalReminder[]>;
  getPersonalReminder(id: string): Promise<PersonalReminder | undefined>;
  createPersonalReminder(reminder: InsertPersonalReminder): Promise<PersonalReminder>;
  updatePersonalReminder(id: string, updates: Partial<PersonalReminder>): Promise<PersonalReminder | undefined>;
  deletePersonalReminder(id: string): Promise<void>;
  
  // Journal Prompts
  getJournalPrompts(category?: string, intent?: string): Promise<JournalPrompt[]>;
  createJournalPrompt(prompt: InsertJournalPrompt): Promise<JournalPrompt>;
  
  // Journal Prompt Tracking
  getShownPromptsForUser(userId: string): Promise<string[]>;
  trackPromptShown(userId: string, promptId: string, entryId?: string): Promise<void>;
  trackPromptResponse(userId: string, promptId: string, entryId: string): Promise<void>;
  
  // Workspaces
  getWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;
  updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | undefined>;
  deleteWorkspace(id: string): Promise<void>;
  
  // Workspace Members
  getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]>;
  getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined>;
  getUserWorkspaces(userId: string): Promise<(WorkspaceMember & { workspace: Workspace })[]>;
  createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
  updateWorkspaceMember(id: string, updates: Partial<WorkspaceMember>): Promise<WorkspaceMember | undefined>;
  deleteWorkspaceMember(id: string): Promise<void>;
  
  // Workspace Invites
  getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]>;
  getWorkspaceInviteByToken(token: string): Promise<WorkspaceInvite | undefined>;
  createWorkspaceInvite(invite: InsertWorkspaceInvite): Promise<WorkspaceInvite>;
  updateWorkspaceInvite(id: string, updates: Partial<WorkspaceInvite>): Promise<WorkspaceInvite | undefined>;
  deleteWorkspaceInvite(id: string): Promise<void>;
  
  // OAuth Connections
  getOAuthConnections(userId: string): Promise<OAuthConnection[]>;
  getOAuthConnection(userId: string, provider: string): Promise<OAuthConnection | undefined>;
  createOAuthConnection(connection: InsertOAuthConnection): Promise<OAuthConnection>;
  updateOAuthConnection(id: string, updates: Partial<OAuthConnection>): Promise<OAuthConnection | undefined>;
  deleteOAuthConnection(id: string): Promise<void>;
  
  // Calendar Exports
  getCalendarExports(userId: string): Promise<CalendarExport[]>;
  createCalendarExport(exportData: InsertCalendarExport): Promise<CalendarExport>;
  
  // AI Audit Logs
  getAiAuditLogs(userId: string, workspaceId?: string): Promise<AiAuditLog[]>;
  getAiAuditLogsForMeeting(meetingId: string): Promise<AiAuditLog[]>;
  createAiAuditLog(log: InsertAiAuditLog): Promise<AiAuditLog>;
  
  // Feedback
  getAllFeedback(search?: string, status?: string): Promise<Feedback[]>;
  getFeedback(id: string): Promise<Feedback | undefined>;
  createFeedback(fb: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback | undefined>;
  
  // Transcripts
  getTranscripts(userId: string, workspaceId?: string): Promise<Transcript[]>;
  getTranscript(id: string): Promise<Transcript | undefined>;
  createTranscript(transcript: InsertTranscript): Promise<Transcript>;
  updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript | undefined>;
  deleteTranscript(id: string): Promise<void>;
  searchTranscripts(userId: string, query: string, workspaceId?: string): Promise<Transcript[]>;
  
  // Transcript Summaries
  getTranscriptSummary(id: string): Promise<TranscriptSummary | undefined>;
  getTranscriptSummaryByTranscriptId(transcriptId: string): Promise<TranscriptSummary | undefined>;
  createTranscriptSummary(summary: InsertTranscriptSummary): Promise<TranscriptSummary>;
  deleteTranscriptSummary(id: string): Promise<void>;
  deleteSummariesForTranscript(transcriptId: string): Promise<void>;
  createSummaryWithTasks(
    transcriptId: string,
    summary: InsertTranscriptSummary,
    tasks: Omit<InsertTranscriptTask, 'summaryId'>[]
  ): Promise<{ summary: TranscriptSummary; tasks: TranscriptTask[] }>;
  
  // Transcript Tasks
  getTranscriptTasks(summaryId: string): Promise<TranscriptTask[]>;
  getTranscriptTasksByTranscriptId(transcriptId: string): Promise<TranscriptTask[]>;
  getTranscriptTask(id: string): Promise<TranscriptTask | undefined>;
  createTranscriptTask(task: InsertTranscriptTask): Promise<TranscriptTask>;
  updateTranscriptTask(id: string, updates: Partial<TranscriptTask>): Promise<TranscriptTask | undefined>;
  deleteTranscriptTask(id: string): Promise<void>;
  
  // Projects
  getProjects(userId: string, workspaceId?: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  
  // Tasks
  getTasks(userId: string, options?: { workspaceId?: string; projectId?: string; status?: string }): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;
  softDeleteTask(id: string): Promise<void>;
  getTasksBySource(sourceType: string, sourceId: string): Promise<Task[]>;
  completeTaskWithRecurrence(
    id: string, 
    task: Task, 
    calculateNextOccurrence: (date: Date, recurrence: string) => Date
  ): Promise<{ completedTask: Task; nextTask?: Task }>;
  getActionedItems(userId: string): Promise<{ tasks: Task[]; reminders: PersonalReminder[] }>;
  getDeletedItems(userId: string): Promise<{ tasks: Task[]; reminders: PersonalReminder[] }>;
  restoreItem(type: string, id: string): Promise<void>;
  
  // Calendar Events
  getCalendarEvents(userId: string, startTime?: Date, endTime?: Date): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  getCalendarEventByProvider(userId: string, provider: string, providerEventId: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: string): Promise<void>;
  deleteCalendarEventsByProvider(connectionId: string, providerEventIds: string[]): Promise<void>;
  upsertCalendarEvents(events: InsertCalendarEvent[]): Promise<CalendarEvent[]>;
  
  // Calendar Webhooks
  getCalendarWebhook(connectionId: string): Promise<CalendarWebhook | undefined>;
  createCalendarWebhook(webhook: InsertCalendarWebhook): Promise<CalendarWebhook>;
  deleteCalendarWebhook(id: string): Promise<void>;
  deleteExpiredWebhooks(): Promise<void>;
  
  // Notes
  getNotes(userId: string, options?: { search?: string; tagId?: string; isJournal?: boolean; limit?: number }): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;
  searchNotes(userId: string, query: string): Promise<Note[]>;
  
  // Note Tags
  getNoteTags(userId: string): Promise<NoteTag[]>;
  getNoteTag(id: string): Promise<NoteTag | undefined>;
  createNoteTag(tag: InsertNoteTag): Promise<NoteTag>;
  updateNoteTag(id: string, updates: Partial<NoteTag>): Promise<NoteTag | undefined>;
  deleteNoteTag(id: string): Promise<void>;
  
  // Note Tag Mappings
  getNoteTagsForNote(noteId: string): Promise<NoteTag[]>;
  addTagToNote(noteId: string, tagId: string): Promise<void>;
  removeTagFromNote(noteId: string, tagId: string): Promise<void>;
  
  // Note Links
  getNoteLinks(noteId: string): Promise<{ fromNote: Note; toNote: Note }[]>;
  createNoteLink(fromNoteId: string, toNoteId: string): Promise<NoteLink>;
  deleteNoteLink(fromNoteId: string, toNoteId: string): Promise<void>;
  
  // Note Attachments
  getNoteAttachments(noteId: string): Promise<NoteAttachment[]>;
  createNoteAttachment(attachment: InsertNoteAttachment): Promise<NoteAttachment>;
  deleteNoteAttachment(id: string): Promise<void>;
  
  // Notes Feed
  getNotesFeed(userId: string, limit?: number): Promise<Note[]>;
  
  // Custom Lists
  getCustomLists(userId: string): Promise<CustomList[]>;
  getCustomList(id: string): Promise<CustomList | undefined>;
  createCustomList(list: InsertCustomList): Promise<CustomList>;
  updateCustomList(id: string, updates: Partial<CustomList>): Promise<CustomList | undefined>;
  deleteCustomList(id: string): Promise<void>;
  
  // Custom List Items
  getCustomListItems(listId: string): Promise<CustomListItem[]>;
  getCustomListItemsWithDetails(listId: string, userId: string): Promise<(CustomListItem & { reminder?: any; task?: any; actionItem?: any })[]>;
  addItemToList(item: InsertCustomListItem): Promise<CustomListItem>;
  getCustomListItem(id: string): Promise<CustomListItem | undefined>;
  getListItemByReminderId(reminderId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined>;
  getListItemByTaskId(taskId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined>;
  getListItemByActionItemId(actionItemId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined>;
  removeItemFromList(id: string, listId: string): Promise<void>;
  removeItemByReminderId(reminderId: string): Promise<void>;
  removeItemByTaskId(taskId: string): Promise<void>;
  removeItemByActionItemId(actionItemId: string): Promise<void>;
  updateListItemPosition(id: string, position: number): Promise<void>;
  
  // Global Tags
  getGlobalTags(userId: string): Promise<GlobalTag[]>;
  createGlobalTag(tag: InsertGlobalTag): Promise<GlobalTag>;
  deleteGlobalTag(id: string): Promise<void>;
  
  // User Locations
  getUserLocations(userId: string, search?: string): Promise<UserLocation[]>;
  upsertUserLocation(userId: string, name: string): Promise<UserLocation>;

  // Task Attachments
  getTaskAttachments(parentType: string, parentId: string): Promise<TaskAttachment[]>;
  createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment>;
  deleteTaskAttachment(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ==================== USERS ====================
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByClerkId(clerkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    return user || undefined;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscriptionStatus?: string | null;
    subscriptionPlan?: string | null;
  }): Promise<User | undefined> {
    const [user] = await db.update(users).set(stripeInfo).where(eq(users.id, userId)).returning();
    return user || undefined;
  }

  // ==================== REFRESH TOKENS ====================
  async createRefreshToken(token: { userId: string; tokenHash: string; expiresAt: Date; userAgent?: string | null; ipAddress?: string | null }): Promise<RefreshToken> {
    const [newToken] = await db.insert(refreshTokens).values(token).returning();
    return newToken;
  }

  async getRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | undefined> {
    const [token] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
    return token || undefined;
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(
      and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt))
    );
  }

  // ==================== PASSWORD RESET TOKENS ====================
  async createPasswordResetToken(token: { userId: string; tokenHash: string; expiresAt: Date }): Promise<PasswordResetToken> {
    const [newToken] = await db.insert(passwordResetTokens).values(token).returning();
    return newToken;
  }

  async getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [token] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash));
    return token || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  // ==================== MEETINGS ====================
  async getMeetings(userId: string, workspaceId?: string): Promise<Meeting[]> {
    if (workspaceId) {
      return await db.select().from(meetings)
        .where(eq(meetings.workspaceId, workspaceId))
        .orderBy(desc(meetings.date));
    }
    return await db.select().from(meetings)
      .where(and(eq(meetings.userId, userId), isNull(meetings.workspaceId)))
      .orderBy(desc(meetings.date));
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db.insert(meetings).values(meeting).returning();
    return newMeeting;
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined> {
    const [meeting] = await db.update(meetings).set({ ...updates, updatedAt: new Date() }).where(eq(meetings.id, id)).returning();
    return meeting || undefined;
  }

  async deleteMeeting(id: string): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id));
  }

  // ==================== ATTENDEES ====================
  async getAttendeesForMeeting(meetingId: string): Promise<Attendee[]> {
    return await db.select().from(attendees).where(eq(attendees.meetingId, meetingId));
  }

  async createAttendee(attendee: InsertAttendee): Promise<Attendee> {
    const [newAttendee] = await db.insert(attendees).values(attendee).returning();
    return newAttendee;
  }

  async deleteAttendeesForMeeting(meetingId: string): Promise<void> {
    await db.delete(attendees).where(eq(attendees.meetingId, meetingId));
  }

  // ==================== DECISIONS ====================
  async getDecisionsForMeeting(meetingId: string): Promise<Decision[]> {
    return await db.select().from(decisions).where(eq(decisions.meetingId, meetingId));
  }

  async createDecision(decision: InsertDecision): Promise<Decision> {
    const [newDecision] = await db.insert(decisions).values(decision).returning();
    return newDecision;
  }

  async deleteDecisionsForMeeting(meetingId: string): Promise<void> {
    await db.delete(decisions).where(eq(decisions.meetingId, meetingId));
  }

  // ==================== RISKS ====================
  async getRisksForMeeting(meetingId: string): Promise<Risk[]> {
    return await db.select().from(risks).where(eq(risks.meetingId, meetingId));
  }

  async createRisk(risk: InsertRisk): Promise<Risk> {
    const [newRisk] = await db.insert(risks).values(risk).returning();
    return newRisk;
  }

  // ==================== CLARIFYING QUESTIONS ====================
  async getClarifyingQuestionsForMeeting(meetingId: string): Promise<ClarifyingQuestion[]> {
    return await db.select().from(clarifyingQuestions).where(eq(clarifyingQuestions.meetingId, meetingId));
  }

  async createClarifyingQuestion(question: InsertClarifyingQuestion): Promise<ClarifyingQuestion> {
    const [newQuestion] = await db.insert(clarifyingQuestions).values(question).returning();
    return newQuestion;
  }

  // ==================== ACTION ITEMS ====================
  async getActionItems(userId: string, workspaceId?: string): Promise<ActionItem[]> {
    if (workspaceId) {
      return await db.select().from(actionItems)
        .where(eq(actionItems.workspaceId, workspaceId))
        .orderBy(desc(actionItems.createdAt));
    }
    return await db
      .select({ actionItems })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(and(eq(meetings.userId, userId), isNull(actionItems.workspaceId)))
      .orderBy(desc(actionItems.createdAt))
      .then(rows => rows.map(r => r.actionItems));
  }

  async getActionItemsForMeeting(meetingId: string): Promise<ActionItem[]> {
    return await db.select().from(actionItems).where(eq(actionItems.meetingId, meetingId));
  }

  async getActionItem(id: string): Promise<ActionItem | undefined> {
    const [item] = await db.select().from(actionItems).where(eq(actionItems.id, id));
    return item || undefined;
  }

  async createActionItem(item: InsertActionItem): Promise<ActionItem> {
    const [newItem] = await db.insert(actionItems).values(item).returning();
    return newItem;
  }

  async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem | undefined> {
    const [item] = await db.update(actionItems).set(updates).where(eq(actionItems.id, id)).returning();
    return item || undefined;
  }

  async deleteActionItem(id: string): Promise<void> {
    await db.delete(actionItems).where(eq(actionItems.id, id));
  }

  // ==================== DRAFTS ====================
  async getDrafts(userId: string, workspaceId?: string): Promise<FollowUpDraft[]> {
    if (workspaceId) {
      return await db.select().from(followUpDrafts)
        .where(eq(followUpDrafts.workspaceId, workspaceId))
        .orderBy(desc(followUpDrafts.updatedAt));
    }
    return await db.select().from(followUpDrafts)
      .where(and(eq(followUpDrafts.userId, userId), isNull(followUpDrafts.workspaceId)))
      .orderBy(desc(followUpDrafts.updatedAt));
  }

  async getDraftsForMeeting(meetingId: string): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts).where(eq(followUpDrafts.meetingId, meetingId));
  }

  async getDraft(id: string): Promise<FollowUpDraft | undefined> {
    const [draft] = await db.select().from(followUpDrafts).where(eq(followUpDrafts.id, id));
    return draft || undefined;
  }

  async createDraft(draft: InsertFollowUpDraft): Promise<FollowUpDraft> {
    const [newDraft] = await db.insert(followUpDrafts).values(draft).returning();
    return newDraft;
  }

  async updateDraft(id: string, updates: Partial<FollowUpDraft>): Promise<FollowUpDraft | undefined> {
    const [draft] = await db.update(followUpDrafts).set({ ...updates, updatedAt: new Date() }).where(eq(followUpDrafts.id, id)).returning();
    return draft || undefined;
  }

  async deleteDraft(id: string): Promise<void> {
    await db.delete(followUpDrafts).where(eq(followUpDrafts.id, id));
  }

  // ==================== PERSONAL ENTRIES ====================
  async getPersonalEntries(userId: string): Promise<PersonalEntry[]> {
    return await db.select().from(personalEntries).where(eq(personalEntries.userId, userId)).orderBy(desc(personalEntries.date));
  }

  async getPersonalEntry(id: string): Promise<PersonalEntry | undefined> {
    const [entry] = await db.select().from(personalEntries).where(eq(personalEntries.id, id));
    return entry || undefined;
  }

  async createPersonalEntry(entry: InsertPersonalEntry): Promise<PersonalEntry> {
    const [newEntry] = await db.insert(personalEntries).values(entry).returning();
    return newEntry;
  }

  async updatePersonalEntry(id: string, updates: Partial<PersonalEntry>): Promise<PersonalEntry | undefined> {
    const [entry] = await db.update(personalEntries).set(updates).where(eq(personalEntries.id, id)).returning();
    return entry || undefined;
  }

  async deletePersonalEntry(id: string): Promise<void> {
    await db.delete(personalEntries).where(eq(personalEntries.id, id));
  }

  // ==================== PERSONAL REMINDERS ====================
  async getPersonalReminders(userId: string, bucket?: string): Promise<PersonalReminder[]> {
    if (bucket) {
      return await db.select().from(personalReminders)
        .where(and(eq(personalReminders.userId, userId), eq(personalReminders.bucket, bucket), isNull(personalReminders.deletedAt)))
        .orderBy(desc(personalReminders.createdAt));
    }
    return await db.select().from(personalReminders)
      .where(and(eq(personalReminders.userId, userId), isNull(personalReminders.deletedAt)))
      .orderBy(desc(personalReminders.createdAt));
  }

  async getPersonalReminder(id: string): Promise<PersonalReminder | undefined> {
    const [reminder] = await db.select().from(personalReminders).where(eq(personalReminders.id, id));
    return reminder || undefined;
  }

  async createPersonalReminder(reminder: InsertPersonalReminder): Promise<PersonalReminder> {
    const [newReminder] = await db.insert(personalReminders).values(reminder).returning();
    return newReminder;
  }

  async updatePersonalReminder(id: string, updates: Partial<PersonalReminder>): Promise<PersonalReminder | undefined> {
    const updateData = { ...updates, updatedAt: new Date() };
    if (updates.isCompleted === true && !updates.completedAt) {
      updateData.completedAt = new Date();
    }
    const [reminder] = await db.update(personalReminders).set(updateData).where(eq(personalReminders.id, id)).returning();
    return reminder || undefined;
  }

  async deletePersonalReminder(id: string): Promise<void> {
    await db.delete(personalReminders).where(eq(personalReminders.id, id));
  }

  // ==================== JOURNAL PROMPTS ====================
  async getJournalPrompts(category?: string, intent?: string): Promise<JournalPrompt[]> {
    const conditions = [eq(journalPrompts.isActive, true)];
    if (category) conditions.push(eq(journalPrompts.category, category));
    if (intent) conditions.push(eq(journalPrompts.intent, intent));
    return await db.select().from(journalPrompts).where(and(...conditions));
  }

  async createJournalPrompt(prompt: InsertJournalPrompt): Promise<JournalPrompt> {
    const [newPrompt] = await db.insert(journalPrompts).values(prompt).returning();
    return newPrompt;
  }

  async getShownPromptsForUser(userId: string): Promise<string[]> {
    const results = await db.select({ promptId: journalPromptShown.promptId })
      .from(journalPromptShown)
      .where(eq(journalPromptShown.userId, userId));
    return results.map(r => r.promptId);
  }

  async trackPromptShown(userId: string, promptId: string, entryId?: string): Promise<void> {
    await db.insert(journalPromptShown).values({
      userId,
      promptId,
      entryId: entryId || null,
      shown: true,
      responded: false,
    });
  }

  async trackPromptResponse(userId: string, promptId: string, entryId: string): Promise<void> {
    await db.update(journalPromptShown)
      .set({ responded: true, entryId })
      .where(and(
        eq(journalPromptShown.userId, userId),
        eq(journalPromptShown.promptId, promptId)
      ));
  }

  // ==================== WORKSPACES ====================
  async getWorkspaces(userId: string): Promise<Workspace[]> {
    const memberWorkspaces = await db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
    return memberWorkspaces.map(r => r.workspace);
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async createWorkspace(workspace: InsertWorkspace): Promise<Workspace> {
    const [newWorkspace] = await db.insert(workspaces).values(workspace).returning();
    return newWorkspace;
  }

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | undefined> {
    const [workspace] = await db.update(workspaces).set(updates).where(eq(workspaces.id, id)).returning();
    return workspace || undefined;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await db.delete(workspaces).where(eq(workspaces.id, id));
  }

  // ==================== WORKSPACE MEMBERS ====================
  async getWorkspaceMembers(workspaceId: string): Promise<(WorkspaceMember & { user: User })[]> {
    const rows = await db
      .select({ member: workspaceMembers, user: users })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return rows.map(r => ({ ...r.member, user: r.user }));
  }

  async getWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember | undefined> {
    const [member] = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    return member || undefined;
  }

  async getUserWorkspaces(userId: string): Promise<(WorkspaceMember & { workspace: Workspace })[]> {
    const rows = await db
      .select({ member: workspaceMembers, workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
    return rows.map(r => ({ ...r.member, workspace: r.workspace }));
  }

  async createWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
    const [newMember] = await db.insert(workspaceMembers).values(member).returning();
    return newMember;
  }

  async updateWorkspaceMember(id: string, updates: Partial<WorkspaceMember>): Promise<WorkspaceMember | undefined> {
    const [member] = await db.update(workspaceMembers).set(updates).where(eq(workspaceMembers.id, id)).returning();
    return member || undefined;
  }

  async deleteWorkspaceMember(id: string): Promise<void> {
    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, id));
  }

  // ==================== WORKSPACE INVITES ====================
  async getWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
    return await db.select().from(workspaceInvites)
      .where(eq(workspaceInvites.workspaceId, workspaceId))
      .orderBy(desc(workspaceInvites.createdAt));
  }

  async getWorkspaceInviteByToken(token: string): Promise<WorkspaceInvite | undefined> {
    const [invite] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token));
    return invite || undefined;
  }

  async createWorkspaceInvite(invite: InsertWorkspaceInvite): Promise<WorkspaceInvite> {
    const [newInvite] = await db.insert(workspaceInvites).values(invite).returning();
    return newInvite;
  }

  async updateWorkspaceInvite(id: string, updates: Partial<WorkspaceInvite>): Promise<WorkspaceInvite | undefined> {
    const [invite] = await db.update(workspaceInvites).set(updates).where(eq(workspaceInvites.id, id)).returning();
    return invite || undefined;
  }

  async deleteWorkspaceInvite(id: string): Promise<void> {
    await db.delete(workspaceInvites).where(eq(workspaceInvites.id, id));
  }

  // ==================== OAUTH CONNECTIONS ====================
  async getOAuthConnections(userId: string): Promise<OAuthConnection[]> {
    return await db.select().from(oauthConnections).where(eq(oauthConnections.userId, userId));
  }

  async getOAuthConnection(userId: string, provider: string): Promise<OAuthConnection | undefined> {
    const [connection] = await db.select().from(oauthConnections)
      .where(and(eq(oauthConnections.userId, userId), eq(oauthConnections.provider, provider)));
    return connection || undefined;
  }

  async createOAuthConnection(connection: InsertOAuthConnection): Promise<OAuthConnection> {
    const [newConnection] = await db.insert(oauthConnections).values(connection).returning();
    return newConnection;
  }

  async updateOAuthConnection(id: string, updates: Partial<OAuthConnection>): Promise<OAuthConnection | undefined> {
    const [connection] = await db.update(oauthConnections)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(oauthConnections.id, id))
      .returning();
    return connection || undefined;
  }

  async deleteOAuthConnection(id: string): Promise<void> {
    await db.delete(oauthConnections).where(eq(oauthConnections.id, id));
  }

  // ==================== CALENDAR EXPORTS ====================
  async getCalendarExports(userId: string): Promise<CalendarExport[]> {
    return await db.select().from(calendarExports)
      .where(eq(calendarExports.userId, userId))
      .orderBy(desc(calendarExports.createdAt));
  }

  async createCalendarExport(exportData: InsertCalendarExport): Promise<CalendarExport> {
    const [newExport] = await db.insert(calendarExports).values(exportData).returning();
    return newExport;
  }

  // ==================== AI AUDIT LOGS ====================
  async getAiAuditLogs(userId: string, workspaceId?: string): Promise<AiAuditLog[]> {
    if (workspaceId) {
      return await db.select().from(aiAuditLogs)
        .where(eq(aiAuditLogs.workspaceId, workspaceId))
        .orderBy(desc(aiAuditLogs.createdAt));
    }
    return await db.select().from(aiAuditLogs)
      .where(and(eq(aiAuditLogs.userId, userId), isNull(aiAuditLogs.workspaceId)))
      .orderBy(desc(aiAuditLogs.createdAt));
  }

  async getAiAuditLogsForMeeting(meetingId: string): Promise<AiAuditLog[]> {
    return await db.select().from(aiAuditLogs)
      .where(eq(aiAuditLogs.meetingId, meetingId))
      .orderBy(desc(aiAuditLogs.createdAt));
  }

  async createAiAuditLog(log: InsertAiAuditLog): Promise<AiAuditLog> {
    const [newLog] = await db.insert(aiAuditLogs).values(log).returning();
    return newLog;
  }

  // ==================== FEEDBACK ====================
  async getAllFeedback(search?: string, status?: string): Promise<Feedback[]> {
    let query = db.select().from(feedback);
    const conditions = [];
    
    if (status && status !== 'all') {
      conditions.push(eq(feedback.status, status));
    }
    
    if (search) {
      conditions.push(
        or(
          ilike(feedback.message, `%${search}%`),
          ilike(feedback.email, `%${search}%`),
          ilike(feedback.type, `%${search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(feedback)
        .where(and(...conditions))
        .orderBy(desc(feedback.createdAt));
    }
    
    return await db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async getFeedback(id: string): Promise<Feedback | undefined> {
    const [fb] = await db.select().from(feedback).where(eq(feedback.id, id));
    return fb || undefined;
  }

  async createFeedback(fb: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(fb).returning();
    return newFeedback;
  }

  async updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback | undefined> {
    const [fb] = await db.update(feedback).set(updates).where(eq(feedback.id, id)).returning();
    return fb || undefined;
  }

  // ==================== TRANSCRIPTS ====================
  async getTranscripts(userId: string, workspaceId?: string): Promise<Transcript[]> {
    if (workspaceId) {
      return await db.select().from(transcripts)
        .where(and(eq(transcripts.userId, userId), eq(transcripts.workspaceId, workspaceId)))
        .orderBy(desc(transcripts.createdAt));
    }
    return await db.select().from(transcripts)
      .where(eq(transcripts.userId, userId))
      .orderBy(desc(transcripts.createdAt));
  }

  async getTranscript(id: string): Promise<Transcript | undefined> {
    const [transcript] = await db.select().from(transcripts).where(eq(transcripts.id, id));
    return transcript || undefined;
  }

  async createTranscript(transcript: InsertTranscript): Promise<Transcript> {
    const [newTranscript] = await db.insert(transcripts).values(transcript).returning();
    return newTranscript;
  }

  async updateTranscript(id: string, updates: Partial<Transcript>): Promise<Transcript | undefined> {
    const [transcript] = await db.update(transcripts).set(updates).where(eq(transcripts.id, id)).returning();
    return transcript || undefined;
  }

  async deleteTranscript(id: string): Promise<void> {
    await db.delete(transcripts).where(eq(transcripts.id, id));
  }

  async searchTranscripts(userId: string, query: string, workspaceId?: string): Promise<Transcript[]> {
    const searchPattern = `%${query}%`;
    const conditions = [
      eq(transcripts.userId, userId),
      or(
        ilike(transcripts.title, searchPattern),
        ilike(transcripts.text, searchPattern)
      )
    ];
    
    if (workspaceId) {
      conditions.push(eq(transcripts.workspaceId, workspaceId));
    }
    
    return await db.select().from(transcripts)
      .where(and(...conditions))
      .orderBy(desc(transcripts.createdAt));
  }

  // ==================== TRANSCRIPT SUMMARIES ====================
  async getTranscriptSummary(id: string): Promise<TranscriptSummary | undefined> {
    const [summary] = await db.select().from(transcriptSummaries).where(eq(transcriptSummaries.id, id));
    return summary || undefined;
  }

  async getTranscriptSummaryByTranscriptId(transcriptId: string): Promise<TranscriptSummary | undefined> {
    const [summary] = await db.select().from(transcriptSummaries)
      .where(eq(transcriptSummaries.transcriptId, transcriptId))
      .orderBy(desc(transcriptSummaries.createdAt))
      .limit(1);
    return summary || undefined;
  }

  async createTranscriptSummary(summary: InsertTranscriptSummary): Promise<TranscriptSummary> {
    const [newSummary] = await db.insert(transcriptSummaries).values(summary).returning();
    return newSummary;
  }

  async deleteTranscriptSummary(id: string): Promise<void> {
    await db.delete(transcriptSummaries).where(eq(transcriptSummaries.id, id));
  }
  
  async deleteSummariesForTranscript(transcriptId: string): Promise<void> {
    await db.delete(transcriptTasks).where(eq(transcriptTasks.transcriptId, transcriptId));
    await db.delete(transcriptSummaries).where(eq(transcriptSummaries.transcriptId, transcriptId));
  }
  
  async createSummaryWithTasks(
    transcriptId: string,
    summary: InsertTranscriptSummary,
    tasks: Omit<InsertTranscriptTask, 'summaryId'>[]
  ): Promise<{ summary: TranscriptSummary; tasks: TranscriptTask[] }> {
    return await db.transaction(async (tx) => {
      await tx.delete(transcriptTasks).where(eq(transcriptTasks.transcriptId, transcriptId));
      await tx.delete(transcriptSummaries).where(eq(transcriptSummaries.transcriptId, transcriptId));
      
      const [newSummary] = await tx.insert(transcriptSummaries).values(summary).returning();
      
      const createdTasks: TranscriptTask[] = [];
      for (const task of tasks) {
        const [newTask] = await tx.insert(transcriptTasks).values({
          ...task,
          summaryId: newSummary.id,
        }).returning();
        createdTasks.push(newTask);
      }
      
      return { summary: newSummary, tasks: createdTasks };
    });
  }

  // ==================== TRANSCRIPT TASKS ====================
  async getTranscriptTasks(summaryId: string): Promise<TranscriptTask[]> {
    return await db.select().from(transcriptTasks)
      .where(eq(transcriptTasks.summaryId, summaryId))
      .orderBy(desc(transcriptTasks.createdAt));
  }

  async getTranscriptTasksByTranscriptId(transcriptId: string): Promise<TranscriptTask[]> {
    return await db.select().from(transcriptTasks)
      .where(eq(transcriptTasks.transcriptId, transcriptId))
      .orderBy(desc(transcriptTasks.createdAt));
  }

  async getTranscriptTask(id: string): Promise<TranscriptTask | undefined> {
    const [task] = await db.select().from(transcriptTasks).where(eq(transcriptTasks.id, id));
    return task || undefined;
  }

  async createTranscriptTask(task: InsertTranscriptTask): Promise<TranscriptTask> {
    const [newTask] = await db.insert(transcriptTasks).values(task).returning();
    return newTask;
  }

  async updateTranscriptTask(id: string, updates: Partial<TranscriptTask>): Promise<TranscriptTask | undefined> {
    const [task] = await db.update(transcriptTasks).set(updates).where(eq(transcriptTasks.id, id)).returning();
    return task || undefined;
  }

  async deleteTranscriptTask(id: string): Promise<void> {
    await db.delete(transcriptTasks).where(eq(transcriptTasks.id, id));
  }

  // ==================== PROJECTS ====================
  async getProjects(userId: string, workspaceId?: string): Promise<Project[]> {
    if (workspaceId) {
      return await db.select().from(projects)
        .where(and(eq(projects.workspaceId, workspaceId), eq(projects.isArchived, false)))
        .orderBy(desc(projects.createdAt));
    }
    return await db.select().from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.workspaceId), eq(projects.isArchived, false)))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // ==================== TASKS ====================
  async getTasks(userId: string, options?: { workspaceId?: string; projectId?: string; status?: string }): Promise<Task[]> {
    const conditions = [eq(tasks.userId, userId), isNull(tasks.deletedAt)];
    
    if (options?.workspaceId) {
      conditions.push(eq(tasks.workspaceId, options.workspaceId));
    } else {
      conditions.push(isNull(tasks.workspaceId));
    }
    
    if (options?.projectId) {
      conditions.push(eq(tasks.projectId, options.projectId));
    }
    
    if (options?.status) {
      conditions.push(eq(tasks.status, options.status));
    }
    
    return await db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(tasks.position, desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const updateData: Partial<Task> = { ...updates, updatedAt: new Date() };
    
    if (updates.status === 'done' && !updates.completedAt) {
      updateData.completedAt = new Date();
    } else if (updates.status && updates.status !== 'done') {
      updateData.completedAt = null;
    }
    
    const [task] = await db.update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async softDeleteTask(id: string): Promise<void> {
    await db.update(tasks).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(tasks.id, id));
  }

  async getActionedItems(userId: string): Promise<{ tasks: Task[]; reminders: PersonalReminder[] }> {
    const completedTasks = await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, 'done'), isNull(tasks.deletedAt)))
      .orderBy(desc(tasks.completedAt));
    const completedReminders = await db.select().from(personalReminders)
      .where(and(eq(personalReminders.userId, userId), eq(personalReminders.status, 'done'), isNull(personalReminders.deletedAt)))
      .orderBy(desc(personalReminders.completedAt));
    return { tasks: completedTasks, reminders: completedReminders };
  }

  async getDeletedItems(userId: string): Promise<{ tasks: Task[]; reminders: PersonalReminder[] }> {
    const deletedTasks = await db.select().from(tasks)
      .where(and(eq(tasks.userId, userId), not(isNull(tasks.deletedAt))))
      .orderBy(desc(tasks.deletedAt));
    const deletedReminders = await db.select().from(personalReminders)
      .where(and(eq(personalReminders.userId, userId), not(isNull(personalReminders.deletedAt))))
      .orderBy(desc(personalReminders.deletedAt));
    return { tasks: deletedTasks, reminders: deletedReminders };
  }

  async restoreItem(type: string, id: string): Promise<void> {
    if (type === 'task') {
      await db.update(tasks).set({ deletedAt: null, updatedAt: new Date() }).where(eq(tasks.id, id));
    } else if (type === 'reminder') {
      await db.update(personalReminders).set({ deletedAt: null, updatedAt: new Date() }).where(eq(personalReminders.id, id));
    }
  }

  async getTasksBySource(sourceType: string, sourceId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(eq(tasks.sourceType, sourceType), eq(tasks.sourceId, sourceId)))
      .orderBy(desc(tasks.createdAt));
  }

  async completeTaskWithRecurrence(
    id: string, 
    task: Task, 
    calculateNextOccurrence: (date: Date, recurrence: string) => Date
  ): Promise<{ completedTask: Task; nextTask?: Task }> {
    return await db.transaction(async (tx) => {
      const [completedTask] = await tx.update(tasks)
        .set({ 
          status: 'done', 
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();
      
      let nextTask: Task | undefined;
      
      if (task.recurrence && task.dueDate) {
        const currentDueDate = new Date(task.dueDate);
        const newNextOccurrence = calculateNextOccurrence(currentDueDate, task.recurrence);
        
        const withinEndDate = !task.recurrenceEndDate || newNextOccurrence <= task.recurrenceEndDate;
        
        if (withinEndDate) {
          const [createdTask] = await tx.insert(tasks).values({
            userId: task.userId,
            workspaceId: task.workspaceId,
            projectId: task.projectId,
            title: task.title,
            description: task.description,
            dueDate: newNextOccurrence,
            priority: task.priority,
            status: 'todo',
            recurrence: task.recurrence,
            recurrenceEndDate: task.recurrenceEndDate,
            nextOccurrence: calculateNextOccurrence(newNextOccurrence, task.recurrence),
            sourceType: task.sourceType,
            sourceId: task.sourceId,
            tags: task.tags,
            estimatedMinutes: task.estimatedMinutes,
            position: task.position,
          }).returning();
          nextTask = createdTask;
        }
      }
      
      return { completedTask, nextTask };
    });
  }

  // ==================== CALENDAR EVENTS ====================
  async getCalendarEvents(userId: string, startTime?: Date, endTime?: Date): Promise<CalendarEvent[]> {
    const conditions = [eq(calendarEvents.userId, userId)];
    if (startTime) conditions.push(gte(calendarEvents.startTime, startTime));
    if (endTime) conditions.push(lte(calendarEvents.endTime, endTime));
    
    return await db.select().from(calendarEvents)
      .where(and(...conditions))
      .orderBy(calendarEvents.startTime);
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  async getCalendarEventByProvider(userId: string, provider: string, providerEventId: string): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents)
      .where(and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.provider, provider),
        eq(calendarEvents.providerEventId, providerEventId)
      ));
    return event || undefined;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const [event] = await db.update(calendarEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(calendarEvents.id, id))
      .returning();
    return event || undefined;
  }

  async deleteCalendarEvent(id: string): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async deleteCalendarEventsByProvider(connectionId: string, providerEventIds: string[]): Promise<void> {
    if (providerEventIds.length === 0) return;
    await db.delete(calendarEvents)
      .where(and(
        eq(calendarEvents.connectionId, connectionId),
        inArray(calendarEvents.providerEventId, providerEventIds)
      ));
  }

  async upsertCalendarEvents(events: InsertCalendarEvent[]): Promise<CalendarEvent[]> {
    if (events.length === 0) return [];
    
    const results: CalendarEvent[] = [];
    for (const event of events) {
      if (event.providerEventId && event.userId && event.provider) {
        const existing = await this.getCalendarEventByProvider(event.userId, event.provider, event.providerEventId);
        if (existing) {
          const updated = await this.updateCalendarEvent(existing.id, event);
          if (updated) results.push(updated);
        } else {
          const created = await this.createCalendarEvent(event);
          results.push(created);
        }
      } else {
        const created = await this.createCalendarEvent(event);
        results.push(created);
      }
    }
    return results;
  }

  // ==================== CALENDAR WEBHOOKS ====================
  async getCalendarWebhook(connectionId: string): Promise<CalendarWebhook | undefined> {
    const [webhook] = await db.select().from(calendarWebhooks)
      .where(eq(calendarWebhooks.connectionId, connectionId));
    return webhook || undefined;
  }

  async createCalendarWebhook(webhook: InsertCalendarWebhook): Promise<CalendarWebhook> {
    const [newWebhook] = await db.insert(calendarWebhooks).values(webhook).returning();
    return newWebhook;
  }

  async deleteCalendarWebhook(id: string): Promise<void> {
    await db.delete(calendarWebhooks).where(eq(calendarWebhooks.id, id));
  }

  async deleteExpiredWebhooks(): Promise<void> {
    await db.delete(calendarWebhooks).where(lt(calendarWebhooks.expiresAt, new Date()));
  }

  // ==================== NOTES ====================
  async getNotes(userId: string, options?: { search?: string; tagId?: string; isJournal?: boolean; limit?: number }): Promise<Note[]> {
    const conditions = [eq(notes.userId, userId)];
    if (options?.isJournal !== undefined) {
      conditions.push(eq(notes.isJournal, options.isJournal));
    }
    if (options?.search) {
      conditions.push(ilike(notes.searchVector, `%${options.search}%`));
    }
    
    let query = db.select().from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
    
    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }
    
    return await query;
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [newNote] = await db.insert(notes).values(note).returning();
    return newNote;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const [note] = await db.update(notes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(notes.id, id))
      .returning();
    return note || undefined;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async searchNotes(userId: string, query: string): Promise<Note[]> {
    return await db.select().from(notes)
      .where(and(
        eq(notes.userId, userId),
        or(
          ilike(notes.title, `%${query}%`),
          ilike(notes.searchVector, `%${query}%`)
        )
      ))
      .orderBy(desc(notes.updatedAt));
  }

  // ==================== NOTE TAGS ====================
  async getNoteTags(userId: string): Promise<NoteTag[]> {
    return await db.select().from(noteTags)
      .where(eq(noteTags.userId, userId))
      .orderBy(noteTags.name);
  }

  async getNoteTag(id: string): Promise<NoteTag | undefined> {
    const [tag] = await db.select().from(noteTags).where(eq(noteTags.id, id));
    return tag || undefined;
  }

  async createNoteTag(tag: InsertNoteTag): Promise<NoteTag> {
    const [newTag] = await db.insert(noteTags).values(tag).returning();
    return newTag;
  }

  async updateNoteTag(id: string, updates: Partial<NoteTag>): Promise<NoteTag | undefined> {
    const [tag] = await db.update(noteTags)
      .set(updates)
      .where(eq(noteTags.id, id))
      .returning();
    return tag || undefined;
  }

  async deleteNoteTag(id: string): Promise<void> {
    await db.delete(noteTags).where(eq(noteTags.id, id));
  }

  // ==================== NOTE TAG MAPPINGS ====================
  async getNoteTagsForNote(noteId: string): Promise<NoteTag[]> {
    const result = await db.select({ tag: noteTags })
      .from(noteTagMap)
      .innerJoin(noteTags, eq(noteTagMap.tagId, noteTags.id))
      .where(eq(noteTagMap.noteId, noteId));
    return result.map(r => r.tag);
  }

  async addTagToNote(noteId: string, tagId: string): Promise<void> {
    await db.insert(noteTagMap).values({ noteId, tagId }).onConflictDoNothing();
  }

  async removeTagFromNote(noteId: string, tagId: string): Promise<void> {
    await db.delete(noteTagMap)
      .where(and(eq(noteTagMap.noteId, noteId), eq(noteTagMap.tagId, tagId)));
  }

  // ==================== NOTE LINKS ====================
  async getNoteLinks(noteId: string): Promise<{ fromNote: Note; toNote: Note }[]> {
    const linksFrom = await db.select()
      .from(noteLinks)
      .innerJoin(notes, eq(noteLinks.toNoteId, notes.id))
      .where(eq(noteLinks.fromNoteId, noteId));
    
    const results: { fromNote: Note; toNote: Note }[] = [];
    for (const link of linksFrom) {
      const [fromNote] = await db.select().from(notes).where(eq(notes.id, noteId));
      if (fromNote) {
        results.push({ fromNote, toNote: link.notes });
      }
    }
    return results;
  }

  async createNoteLink(fromNoteId: string, toNoteId: string): Promise<NoteLink> {
    const [link] = await db.insert(noteLinks).values({ fromNoteId, toNoteId }).returning();
    return link;
  }

  async deleteNoteLink(fromNoteId: string, toNoteId: string): Promise<void> {
    await db.delete(noteLinks)
      .where(and(eq(noteLinks.fromNoteId, fromNoteId), eq(noteLinks.toNoteId, toNoteId)));
  }

  // ==================== NOTE ATTACHMENTS ====================
  async getNoteAttachments(noteId: string): Promise<NoteAttachment[]> {
    return await db.select().from(noteAttachments)
      .where(eq(noteAttachments.noteId, noteId))
      .orderBy(desc(noteAttachments.createdAt));
  }

  async createNoteAttachment(attachment: InsertNoteAttachment): Promise<NoteAttachment> {
    const [newAttachment] = await db.insert(noteAttachments).values(attachment).returning();
    return newAttachment;
  }

  async deleteNoteAttachment(id: string): Promise<void> {
    await db.delete(noteAttachments).where(eq(noteAttachments.id, id));
  }

  // ==================== NOTES FEED ====================
  async getNotesFeed(userId: string, limit: number = 20): Promise<Note[]> {
    return await db.select().from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(limit);
  }

  // ==================== CUSTOM LISTS ====================
  async getCustomLists(userId: string): Promise<CustomList[]> {
    return await db.select().from(customLists)
      .where(eq(customLists.userId, userId))
      .orderBy(customLists.position);
  }

  async getCustomList(id: string): Promise<CustomList | undefined> {
    const [list] = await db.select().from(customLists).where(eq(customLists.id, id));
    return list || undefined;
  }

  async createCustomList(list: InsertCustomList): Promise<CustomList> {
    const [newList] = await db.insert(customLists).values(list).returning();
    return newList;
  }

  async updateCustomList(id: string, updates: Partial<CustomList>): Promise<CustomList | undefined> {
    const [updated] = await db.update(customLists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customLists.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomList(id: string): Promise<void> {
    await db.delete(customLists).where(eq(customLists.id, id));
  }

  // ==================== CUSTOM LIST ITEMS ====================
  async getCustomListItems(listId: string): Promise<CustomListItem[]> {
    return await db.select().from(customListItems)
      .where(eq(customListItems.listId, listId))
      .orderBy(customListItems.position);
  }

  async addItemToList(item: InsertCustomListItem): Promise<CustomListItem> {
    const [newItem] = await db.insert(customListItems).values(item).returning();
    return newItem;
  }

  async getCustomListItem(id: string): Promise<CustomListItem | undefined> {
    const [item] = await db.select().from(customListItems).where(eq(customListItems.id, id));
    return item || undefined;
  }

  async getListItemByReminderId(reminderId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined> {
    const results = await db.select({
      id: customListItems.id,
      listId: customListItems.listId,
      reminderId: customListItems.reminderId,
      taskId: customListItems.taskId,
      actionItemId: customListItems.actionItemId,
      position: customListItems.position,
      createdAt: customListItems.createdAt,
      listName: customLists.name,
      listIcon: customLists.icon,
    })
    .from(customListItems)
    .innerJoin(customLists, eq(customListItems.listId, customLists.id))
    .where(eq(customListItems.reminderId, reminderId))
    .limit(1);
    return results[0] || undefined;
  }

  async removeItemFromList(id: string, listId: string): Promise<void> {
    await db.delete(customListItems).where(
      and(eq(customListItems.id, id), eq(customListItems.listId, listId))
    );
  }

  async getListItemByTaskId(taskId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined> {
    const results = await db.select({
      id: customListItems.id,
      listId: customListItems.listId,
      reminderId: customListItems.reminderId,
      taskId: customListItems.taskId,
      actionItemId: customListItems.actionItemId,
      position: customListItems.position,
      createdAt: customListItems.createdAt,
      listName: customLists.name,
      listIcon: customLists.icon,
    })
    .from(customListItems)
    .innerJoin(customLists, eq(customListItems.listId, customLists.id))
    .where(eq(customListItems.taskId, taskId))
    .limit(1);
    return results[0] || undefined;
  }

  async removeItemByReminderId(reminderId: string): Promise<void> {
    await db.delete(customListItems).where(eq(customListItems.reminderId, reminderId));
  }

  async getListItemByActionItemId(actionItemId: string): Promise<(CustomListItem & { listName: string; listIcon?: string | null }) | undefined> {
    const results = await db.select({
      id: customListItems.id,
      listId: customListItems.listId,
      reminderId: customListItems.reminderId,
      taskId: customListItems.taskId,
      actionItemId: customListItems.actionItemId,
      position: customListItems.position,
      createdAt: customListItems.createdAt,
      listName: customLists.name,
      listIcon: customLists.icon,
    })
    .from(customListItems)
    .innerJoin(customLists, eq(customListItems.listId, customLists.id))
    .where(eq(customListItems.actionItemId, actionItemId))
    .limit(1);
    return results[0] || undefined;
  }

  async removeItemByTaskId(taskId: string): Promise<void> {
    await db.delete(customListItems).where(eq(customListItems.taskId, taskId));
  }

  async removeItemByActionItemId(actionItemId: string): Promise<void> {
    await db.delete(customListItems).where(eq(customListItems.actionItemId, actionItemId));
  }

  async updateListItemPosition(id: string, position: number): Promise<void> {
    await db.update(customListItems)
      .set({ position })
      .where(eq(customListItems.id, id));
  }

  async getCustomListItemsWithDetails(listId: string, userId: string): Promise<(CustomListItem & { reminder?: any; task?: any; actionItem?: any })[]> {
    const items = await db.select().from(customListItems)
      .where(eq(customListItems.listId, listId))
      .orderBy(customListItems.position);
    
    const result = [];
    for (const item of items) {
      let reminder = undefined;
      let task = undefined;
      let actionItem = undefined;
      
      if (item.reminderId) {
        const r = await this.getPersonalReminder(item.reminderId);
        if (r && r.userId === userId) {
          reminder = r;
        }
      }
      if (item.taskId) {
        const t = await this.getTask(item.taskId);
        if (t && t.userId === userId) {
          task = t;
        }
      }
      if (item.actionItemId) {
        const a = await this.getActionItem(item.actionItemId);
        if (a) {
          const meeting = await this.getMeeting(a.meetingId);
          if (meeting && meeting.userId === userId) {
            actionItem = a;
          }
        }
      }
      
      result.push({ ...item, reminder, task, actionItem });
    }
    
    return result;
  }

  // ==================== GLOBAL TAGS ====================
  async getGlobalTags(userId: string): Promise<GlobalTag[]> {
    return await db.select().from(globalTags).where(eq(globalTags.userId, userId)).orderBy(globalTags.name);
  }

  async createGlobalTag(tag: InsertGlobalTag): Promise<GlobalTag> {
    const [created] = await db.insert(globalTags).values(tag).returning();
    return created;
  }

  async deleteGlobalTag(id: string): Promise<void> {
    await db.delete(globalTags).where(eq(globalTags.id, id));
  }

  // ==================== USER LOCATIONS ====================
  async getUserLocations(userId: string, search?: string): Promise<UserLocation[]> {
    const conditions = [eq(userLocations.userId, userId)];
    if (search) {
      conditions.push(ilike(userLocations.name, `%${search}%`));
    }
    return await db.select().from(userLocations)
      .where(and(...conditions))
      .orderBy(desc(userLocations.usageCount), desc(userLocations.lastUsedAt));
  }

  async upsertUserLocation(userId: string, name: string): Promise<UserLocation> {
    const [existing] = await db.select().from(userLocations)
      .where(and(eq(userLocations.userId, userId), ilike(userLocations.name, name)));
    
    if (existing) {
      const [updated] = await db.update(userLocations)
        .set({
          usageCount: existing.usageCount + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(userLocations.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(userLocations).values({ userId, name }).returning();
    return created;
  }

  async getTaskAttachments(parentType: string, parentId: string): Promise<TaskAttachment[]> {
    return await db.select().from(taskAttachments).where(
      and(eq(taskAttachments.parentType, parentType), eq(taskAttachments.parentId, parentId))
    ).orderBy(taskAttachments.createdAt);
  }

  async createTaskAttachment(attachment: InsertTaskAttachment): Promise<TaskAttachment> {
    const [result] = await db.insert(taskAttachments).values(attachment).returning();
    return result;
  }

  async deleteTaskAttachment(id: string): Promise<void> {
    await db.delete(taskAttachments).where(eq(taskAttachments.id, id));
  }
}

export const storage = new DatabaseStorage();
