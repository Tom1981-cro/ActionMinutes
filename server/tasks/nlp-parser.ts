import * as chrono from 'chrono-node';

export interface ParsedTaskInput {
  title: string;
  dueDate: Date | null;
  dueDateText: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  priorityDetected: boolean;
  suggestedProjectKeywords: string[];
  recurrence: string | null;
  estimatedMinutes: number | null;
  tags: string[];
}

const PRIORITY_PATTERNS: { pattern: RegExp; priority: 'low' | 'medium' | 'high' | 'urgent' }[] = [
  { pattern: /\b(urgent|asap|immediately|critical|emergency)\b/i, priority: 'urgent' },
  { pattern: /\b(high priority|important|priority|crucial)\b/i, priority: 'high' },
  { pattern: /\b(low priority|whenever|eventually|someday|maybe)\b/i, priority: 'low' },
  { pattern: /!{3,}/i, priority: 'urgent' },
  { pattern: /!{2}/i, priority: 'high' },
  { pattern: /!{1}/i, priority: 'medium' },
];

const RECURRENCE_PATTERNS: { pattern: RegExp; recurrence: string }[] = [
  { pattern: /\b(every day|daily)\b/i, recurrence: 'daily' },
  { pattern: /\b(every week|weekly)\b/i, recurrence: 'weekly' },
  { pattern: /\b(every two weeks|biweekly|bi-weekly|fortnightly)\b/i, recurrence: 'biweekly' },
  { pattern: /\b(every month|monthly)\b/i, recurrence: 'monthly' },
  { pattern: /\b(every year|yearly|annually)\b/i, recurrence: 'yearly' },
];

const TIME_ESTIMATE_PATTERNS: { pattern: RegExp; minutes: number }[] = [
  { pattern: /\b(\d+)\s*h(our)?s?\b/i, minutes: 0 },
  { pattern: /\b(\d+)\s*m(in(ute)?s?)?\b/i, minutes: 0 },
  { pattern: /\bquick\b/i, minutes: 15 },
  { pattern: /\bshort\b/i, minutes: 30 },
];

const PROJECT_KEYWORD_PATTERNS: { pattern: RegExp; keywords: string[] }[] = [
  { pattern: /\b(call|phone|ring|dial)\b/i, keywords: ['calls', 'communication'] },
  { pattern: /\b(email|mail|send|write)\b/i, keywords: ['email', 'communication'] },
  { pattern: /\b(meeting|meet|discuss|sync)\b/i, keywords: ['meetings', 'collaboration'] },
  { pattern: /\b(review|check|look at|examine)\b/i, keywords: ['review', 'analysis'] },
  { pattern: /\b(fix|bug|debug|repair)\b/i, keywords: ['development', 'bugs'] },
  { pattern: /\b(design|ui|ux|mockup)\b/i, keywords: ['design', 'ui'] },
  { pattern: /\b(test|qa|quality)\b/i, keywords: ['testing', 'qa'] },
  { pattern: /\b(document|docs|write up)\b/i, keywords: ['documentation'] },
  { pattern: /\b(research|investigate|explore)\b/i, keywords: ['research'] },
  { pattern: /\b(plan|planning|strategy)\b/i, keywords: ['planning'] },
  { pattern: /\b(report|analysis|data)\b/i, keywords: ['reporting', 'analysis'] },
  { pattern: /\b(client|customer)\b/i, keywords: ['clients'] },
  { pattern: /\b(invoice|payment|billing)\b/i, keywords: ['finance', 'billing'] },
  { pattern: /\b(hire|interview|candidate)\b/i, keywords: ['hiring', 'hr'] },
  { pattern: /\b(training|learn|course)\b/i, keywords: ['learning', 'training'] },
];

const TAG_PATTERNS: RegExp[] = [
  /#(\w+)/g,
  /@(\w+)/g,
];

export function parseTaskInput(input: string): ParsedTaskInput {
  let title = input.trim();
  let dueDate: Date | null = null;
  let dueDateText: string | null = null;
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  let priorityDetected = false;
  let recurrence: string | null = null;
  let estimatedMinutes: number | null = null;
  const suggestedProjectKeywords: string[] = [];
  const tags: string[] = [];

  const parsedDates = chrono.parse(input, new Date(), { forwardDate: true });
  if (parsedDates.length > 0) {
    const firstResult = parsedDates[0];
    dueDate = firstResult.start.date();
    dueDateText = firstResult.text;
    title = title.replace(firstResult.text, '').trim();
  }

  for (const { pattern, priority: p } of PRIORITY_PATTERNS) {
    if (pattern.test(title)) {
      priority = p;
      priorityDetected = true;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  for (const { pattern, recurrence: r } of RECURRENCE_PATTERNS) {
    if (pattern.test(title)) {
      recurrence = r;
      title = title.replace(pattern, '').trim();
      break;
    }
  }

  for (const { pattern, minutes } of TIME_ESTIMATE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      if (minutes > 0) {
        estimatedMinutes = minutes;
      } else if (match[1]) {
        const num = parseInt(match[1], 10);
        if (pattern.source.includes('hour')) {
          estimatedMinutes = num * 60;
        } else {
          estimatedMinutes = num;
        }
      }
      title = title.replace(match[0], '').trim();
      break;
    }
  }

  for (const { pattern, keywords } of PROJECT_KEYWORD_PATTERNS) {
    if (pattern.test(input)) {
      for (const kw of keywords) {
        if (!suggestedProjectKeywords.includes(kw)) {
          suggestedProjectKeywords.push(kw);
        }
      }
    }
  }

  for (const pattern of TAG_PATTERNS) {
    let match;
    while ((match = pattern.exec(input)) !== null) {
      const tag = match[1].toLowerCase();
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
      title = title.replace(match[0], '').trim();
    }
  }

  title = title
    .replace(/\s+/g, ' ')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();

  if (!title) {
    title = input.trim();
  }

  return {
    title,
    dueDate,
    dueDateText,
    priority,
    priorityDetected,
    suggestedProjectKeywords,
    recurrence,
    estimatedMinutes,
    tags,
  };
}

export function calculateNextOccurrence(
  currentDate: Date,
  recurrence: string
): Date {
  const next = new Date(currentDate);
  
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  
  return next;
}

export function suggestProjectsForTask(
  taskTitle: string,
  existingProjects: { id: string; name: string; keywords: string[] }[]
): { projectId: string; name: string; score: number }[] {
  const parsed = parseTaskInput(taskTitle);
  const taskKeywords = parsed.suggestedProjectKeywords;
  
  if (taskKeywords.length === 0) {
    return [];
  }
  
  const suggestions: { projectId: string; name: string; score: number }[] = [];
  
  for (const project of existingProjects) {
    let score = 0;
    
    for (const taskKw of taskKeywords) {
      if (project.keywords.some(pk => pk.toLowerCase() === taskKw.toLowerCase())) {
        score += 2;
      }
      if (project.name.toLowerCase().includes(taskKw.toLowerCase())) {
        score += 1;
      }
    }
    
    if (score > 0) {
      suggestions.push({
        projectId: project.id,
        name: project.name,
        score,
      });
    }
  }
  
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
}
