import { describe, it, expect } from 'vitest';
import { addDays, addMonths, format } from 'date-fns';

type ReminderBucket = 'today' | 'tomorrow' | 'next_week' | 'next_month' | 'sometime';

interface Reminder {
  id: string;
  userId: string;
  text: string;
  bucket: ReminderBucket;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  priority: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function computeBucketFromDate(date: Date): ReminderBucket {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 0) return 'today';
  if (daysDiff === 1) return 'tomorrow';
  if (daysDiff <= 7) return 'next_week';
  if (daysDiff <= 30) return 'next_month';
  return 'sometime';
}

function getDueDateForBucket(bucket: ReminderBucket): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (bucket) {
    case 'today': return today;
    case 'tomorrow': return addDays(today, 1);
    case 'next_week': return addDays(today, 3);
    case 'next_month': return addDays(today, 14);
    case 'sometime': return null;
  }
}

function generateICS(reminders: Reminder[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ActionMinutes//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const reminder of reminders) {
    if (!reminder.dueDate || reminder.isCompleted) continue;
    
    const date = new Date(reminder.dueDate);
    const nextDay = addDays(date, 1);
    const dateStr = format(date, 'yyyyMMdd');
    const endDateStr = format(nextDay, 'yyyyMMdd');
    const uid = `${reminder.id}@actionminutes`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
    lines.push(`SUMMARY:${reminder.text.replace(/[,;\\]/g, ' ')}`);
    if (reminder.notes) {
      lines.push(`DESCRIPTION:${reminder.notes.replace(/[,;\\]/g, ' ').replace(/\n/g, '\\n')}`);
    }
    lines.push(`CATEGORIES:${reminder.priority.toUpperCase()}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

describe('Reminders - Bucket Logic', () => {
  it('should compute "today" bucket for current date', () => {
    const today = new Date();
    expect(computeBucketFromDate(today)).toBe('today');
  });

  it('should compute "tomorrow" bucket for next day', () => {
    const tomorrow = addDays(new Date(), 1);
    expect(computeBucketFromDate(tomorrow)).toBe('tomorrow');
  });

  it('should compute "next_week" bucket for dates 2-7 days out', () => {
    const inThreeDays = addDays(new Date(), 3);
    const inSixDays = addDays(new Date(), 6);
    const inSevenDays = addDays(new Date(), 7);
    expect(computeBucketFromDate(inThreeDays)).toBe('next_week');
    expect(computeBucketFromDate(inSixDays)).toBe('next_week');
    expect(computeBucketFromDate(inSevenDays)).toBe('next_week');
  });

  it('should compute "next_month" bucket for dates 8-30 days out', () => {
    const inTwoWeeks = addDays(new Date(), 14);
    const inThreeWeeks = addDays(new Date(), 21);
    const inThirtyDays = addDays(new Date(), 30);
    expect(computeBucketFromDate(inTwoWeeks)).toBe('next_month');
    expect(computeBucketFromDate(inThreeWeeks)).toBe('next_month');
    expect(computeBucketFromDate(inThirtyDays)).toBe('next_month');
  });

  it('should compute "sometime" bucket for dates beyond 30 days', () => {
    const inTwoMonths = addDays(new Date(), 60);
    expect(computeBucketFromDate(inTwoMonths)).toBe('sometime');
  });

  it('should handle dates in the past as "today"', () => {
    const yesterday = addDays(new Date(), -1);
    expect(computeBucketFromDate(yesterday)).toBe('today');
  });
});

describe('Reminders - Due Date Generation', () => {
  it('should return today for "today" bucket', () => {
    const dueDate = getDueDateForBucket('today');
    const today = new Date();
    expect(dueDate).not.toBeNull();
    expect(dueDate?.getDate()).toBe(today.getDate());
  });

  it('should return tomorrow for "tomorrow" bucket', () => {
    const dueDate = getDueDateForBucket('tomorrow');
    const tomorrow = addDays(new Date(), 1);
    expect(dueDate).not.toBeNull();
    expect(dueDate?.getDate()).toBe(tomorrow.getDate());
  });

  it('should return a date within next_week range for "next_week" bucket', () => {
    const dueDate = getDueDateForBucket('next_week');
    expect(dueDate).not.toBeNull();
    expect(computeBucketFromDate(dueDate!)).toBe('next_week');
  });

  it('should return a date within next_month range for "next_month" bucket', () => {
    const dueDate = getDueDateForBucket('next_month');
    expect(dueDate).not.toBeNull();
    expect(computeBucketFromDate(dueDate!)).toBe('next_month');
  });

  it('should return null for "sometime" bucket', () => {
    const dueDate = getDueDateForBucket('sometime');
    expect(dueDate).toBeNull();
  });
});

describe('Reminders - Bucket Consistency (Rebucket)', () => {
  it('should maintain bucket consistency when rebucketing all buckets', () => {
    const buckets: ReminderBucket[] = ['today', 'tomorrow', 'next_week', 'next_month'];
    
    for (const bucket of buckets) {
      const dueDate = getDueDateForBucket(bucket);
      if (dueDate) {
        const recomputed = computeBucketFromDate(dueDate);
        expect(recomputed).toBe(bucket);
      }
    }
  });

  it('should snooze today to tomorrow correctly', () => {
    const dueDate = getDueDateForBucket('tomorrow');
    expect(dueDate).not.toBeNull();
    expect(computeBucketFromDate(dueDate!)).toBe('tomorrow');
  });

  it('should snooze tomorrow to next_week correctly', () => {
    const dueDate = getDueDateForBucket('next_week');
    expect(dueDate).not.toBeNull();
    expect(computeBucketFromDate(dueDate!)).toBe('next_week');
  });
});

describe('Reminders - ICS Export', () => {
  const baseReminder: Reminder = {
    id: 'test-1',
    userId: 'user-1',
    text: 'Test reminder',
    bucket: 'today',
    dueDate: new Date().toISOString(),
    isCompleted: false,
    completedAt: null,
    priority: 'normal',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should generate valid ICS format', () => {
    const ics = generateICS([baseReminder]);
    
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//ActionMinutes//Reminders//EN');
  });

  it('should include VEVENT for reminder with dueDate', () => {
    const ics = generateICS([baseReminder]);
    
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('SUMMARY:Test reminder');
    expect(ics).toContain(`UID:${baseReminder.id}@actionminutes`);
  });

  it('should skip reminders without dueDate', () => {
    const noDueDate = { ...baseReminder, dueDate: null };
    const ics = generateICS([noDueDate]);
    
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).not.toContain('SUMMARY:Test reminder');
  });

  it('should skip completed reminders', () => {
    const completed = { ...baseReminder, isCompleted: true };
    const ics = generateICS([completed]);
    
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('should include notes as DESCRIPTION', () => {
    const withNotes = { ...baseReminder, notes: 'Some notes here' };
    const ics = generateICS([withNotes]);
    
    expect(ics).toContain('DESCRIPTION:Some notes here');
  });

  it('should escape special characters in text', () => {
    const withSpecial = { ...baseReminder, text: 'Test, with; special\\chars' };
    const ics = generateICS([withSpecial]);
    
    expect(ics).toContain('SUMMARY:Test  with  special chars');
  });

  it('should include priority as category', () => {
    const highPriority = { ...baseReminder, priority: 'high' };
    const ics = generateICS([highPriority]);
    
    expect(ics).toContain('CATEGORIES:HIGH');
  });

  it('should export multiple reminders', () => {
    const reminder2: Reminder = {
      ...baseReminder,
      id: 'test-2',
      text: 'Second reminder',
      dueDate: addDays(new Date(), 1).toISOString(),
    };
    
    const ics = generateICS([baseReminder, reminder2]);
    
    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(2);
    expect(ics).toContain('SUMMARY:Test reminder');
    expect(ics).toContain('SUMMARY:Second reminder');
  });

  it('should format date correctly as all-day event with DTEND = DTSTART + 1', () => {
    const date = new Date(2025, 5, 15);
    const reminder: Reminder = { ...baseReminder, dueDate: date.toISOString() };
    const ics = generateICS([reminder]);
    
    expect(ics).toContain('DTSTART;VALUE=DATE:20250615');
    expect(ics).toContain('DTEND;VALUE=DATE:20250616');
  });

  it('should have DTEND one day after DTSTART for proper calendar display', () => {
    const ics = generateICS([baseReminder]);
    
    const dtStartMatch = ics.match(/DTSTART;VALUE=DATE:(\d{8})/);
    const dtEndMatch = ics.match(/DTEND;VALUE=DATE:(\d{8})/);
    
    expect(dtStartMatch).not.toBeNull();
    expect(dtEndMatch).not.toBeNull();
    
    const startDate = parseInt(dtStartMatch![1]);
    const endDate = parseInt(dtEndMatch![1]);
    
    expect(endDate).toBeGreaterThan(startDate);
  });
});

describe('Reminders - Empty States', () => {
  it('should generate minimal ICS for empty array', () => {
    const ics = generateICS([]);
    
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('should handle reminders with only sometime bucket', () => {
    const sometime: Reminder = {
      id: 'test',
      userId: 'user',
      text: 'Someday task',
      bucket: 'sometime',
      dueDate: null,
      isCompleted: false,
      completedAt: null,
      priority: 'low',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const ics = generateICS([sometime]);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
