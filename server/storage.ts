import { 
  users, meetings, attendees, decisions, risks, clarifyingQuestions,
  actionItems, followUpDrafts, personalEntries,
  type User, type InsertUser,
  type Meeting, type InsertMeeting,
  type Attendee, type InsertAttendee,
  type Decision, type InsertDecision,
  type Risk, type InsertRisk,
  type ClarifyingQuestion, type InsertClarifyingQuestion,
  type ActionItem, type InsertActionItem,
  type FollowUpDraft, type InsertFollowUpDraft,
  type PersonalEntry, type InsertPersonalEntry
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  getMeetings(userId: string): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<void>;
  
  getAttendeesForMeeting(meetingId: string): Promise<Attendee[]>;
  createAttendee(attendee: InsertAttendee): Promise<Attendee>;
  deleteAttendeesForMeeting(meetingId: string): Promise<void>;
  
  getDecisionsForMeeting(meetingId: string): Promise<Decision[]>;
  createDecision(decision: InsertDecision): Promise<Decision>;
  deleteDecisionsForMeeting(meetingId: string): Promise<void>;
  
  getRisksForMeeting(meetingId: string): Promise<Risk[]>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  
  getClarifyingQuestionsForMeeting(meetingId: string): Promise<ClarifyingQuestion[]>;
  createClarifyingQuestion(question: InsertClarifyingQuestion): Promise<ClarifyingQuestion>;
  
  getActionItems(userId: string): Promise<ActionItem[]>;
  getActionItemsForMeeting(meetingId: string): Promise<ActionItem[]>;
  getActionItem(id: string): Promise<ActionItem | undefined>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem | undefined>;
  deleteActionItem(id: string): Promise<void>;
  
  getDrafts(userId: string): Promise<FollowUpDraft[]>;
  getDraftsForMeeting(meetingId: string): Promise<FollowUpDraft[]>;
  createDraft(draft: InsertFollowUpDraft): Promise<FollowUpDraft>;
  updateDraft(id: string, updates: Partial<FollowUpDraft>): Promise<FollowUpDraft | undefined>;
  deleteDraft(id: string): Promise<void>;
  
  getPersonalEntries(userId: string): Promise<PersonalEntry[]>;
  createPersonalEntry(entry: InsertPersonalEntry): Promise<PersonalEntry>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getMeetings(userId: string): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.userId, userId)).orderBy(desc(meetings.date));
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

  async getRisksForMeeting(meetingId: string): Promise<Risk[]> {
    return await db.select().from(risks).where(eq(risks.meetingId, meetingId));
  }

  async createRisk(risk: InsertRisk): Promise<Risk> {
    const [newRisk] = await db.insert(risks).values(risk).returning();
    return newRisk;
  }

  async getClarifyingQuestionsForMeeting(meetingId: string): Promise<ClarifyingQuestion[]> {
    return await db.select().from(clarifyingQuestions).where(eq(clarifyingQuestions.meetingId, meetingId));
  }

  async createClarifyingQuestion(question: InsertClarifyingQuestion): Promise<ClarifyingQuestion> {
    const [newQuestion] = await db.insert(clarifyingQuestions).values(question).returning();
    return newQuestion;
  }

  async getActionItems(userId: string): Promise<ActionItem[]> {
    return await db
      .select({ actionItems })
      .from(actionItems)
      .innerJoin(meetings, eq(actionItems.meetingId, meetings.id))
      .where(eq(meetings.userId, userId))
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

  async getDrafts(userId: string): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts).where(eq(followUpDrafts.userId, userId)).orderBy(desc(followUpDrafts.updatedAt));
  }

  async getDraftsForMeeting(meetingId: string): Promise<FollowUpDraft[]> {
    return await db.select().from(followUpDrafts).where(eq(followUpDrafts.meetingId, meetingId));
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

  async getPersonalEntries(userId: string): Promise<PersonalEntry[]> {
    return await db.select().from(personalEntries).where(eq(personalEntries.userId, userId)).orderBy(desc(personalEntries.date));
  }

  async createPersonalEntry(entry: InsertPersonalEntry): Promise<PersonalEntry> {
    const [newEntry] = await db.insert(personalEntries).values(entry).returning();
    return newEntry;
  }
}

export const storage = new DatabaseStorage();
