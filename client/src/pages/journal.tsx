import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Smiley, SmileyMeh, SmileySad, Sparkle, CaretRight, 
  Warning, Target, Heart, Lightbulb, CheckCircle, SpinnerGap, Plus,
  Video, ChartBar, SunHorizon, MoonStars, Lightning, ArrowRight,
  Trophy, Tag, Clock
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/skeleton-loader";
import { EmptyState } from "@/components/empty-state";

const MOOD_OPTIONS = [
  { value: "good", icon: Smiley, label: "Good", color: "text-emerald-400", bgSelected: "bg-emerald-500/20 border-emerald-500/50", bgHover: "hover:bg-emerald-500/10" },
  { value: "okay", icon: SmileyMeh, label: "Okay", color: "text-amber-400", bgSelected: "bg-amber-500/20 border-amber-500/50", bgHover: "hover:bg-amber-500/10" },
  { value: "tough", icon: SmileySad, label: "Tough", color: "text-red-400", bgSelected: "bg-red-500/20 border-red-500/50", bgHover: "hover:bg-red-500/10" },
];

const SIGNAL_ICONS: Record<string, typeof Warning> = {
  overwhelm: Warning,
  deadlines: Target,
  conflict: Heart,
  decision: Lightbulb,
  avoidance: CheckCircle,
};

const SIGNAL_LABELS: Record<string, string> = {
  overwhelm: "Feeling overwhelmed",
  deadlines: "Deadline pressure",
  conflict: "Navigating conflict",
  decision: "Decision pending",
  avoidance: "Might be avoiding something",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  normal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const TEMPLATES = [
  {
    id: "morning",
    title: "Morning Intention",
    icon: SunHorizon,
    color: "text-amber-500",
    pillBg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
    pillBgSelected: "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30",
    content: `🌅 Morning Intentions

**Today I want to focus on:**
- 

**My top 3 priorities:**
1. 
2. 
3. 

**I'm grateful for:**
- 

**One thing that would make today great:**

`,
  },
  {
    id: "evening",
    title: "Evening Wind-down",
    icon: MoonStars,
    color: "text-indigo-500",
    pillBg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20",
    pillBgSelected: "bg-indigo-500/20 border-indigo-500/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/30",
    content: `🌙 Evening Reflection

**Today's wins:**
- 

**Challenges I faced:**
- 

**What I learned:**
- 

**Tomorrow I want to:**
- 
`,
  },
  {
    id: "weekly_win",
    title: "Weekly Win",
    icon: Trophy,
    color: "text-emerald-500",
    pillBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
    pillBgSelected: "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30",
    content: `🏆 Weekly Win

**My biggest win this week:**


**What made it possible:**
- 

**What I'm proud of:**
- 

**Momentum to carry forward:**
- 
`,
  },
];

const DAILY_PROMPTS = [
  "What is one thing you could delegate tomorrow to free up focus time?",
  "What's the most important decision you need to make this week?",
  "What would you tell your future self about today?",
  "What's one habit that served you well today?",
  "If you could only accomplish one thing tomorrow, what would it be?",
  "What's something you've been avoiding that deserves attention?",
  "Who helped you today, and how can you pay it forward?",
  "What's a small win you can celebrate right now?",
  "What boundary do you need to set to protect your energy?",
  "What's one thing you learned today that surprised you?",
  "How did your energy change throughout the day?",
  "What conversation had the biggest impact on you today?",
  "What would make tomorrow 10% better than today?",
  "What's weighing on your mind that you can write down and release?",
];

type JournalPrompt = {
  id: string;
  intent: string;
  text: string;
  signalMatch: string[];
};

type JournalSummary = {
  summary: string;
  top3: string[];
  nextSteps: string[];
  detectedTone?: string;
};

type ExtractedAction = {
  text: string;
  priority: "high" | "normal" | "low";
  context: string;
};

type AnalyticsData = {
  moodCounts: Record<string, number>;
  moodByDay: Record<number, { good: number; okay: number; tough: number; total: number }>;
  tasksByDay: Record<number, number>;
  moodProductivityAvg: Record<string, number>;
  recentMoodTrend: { date: string; mood: string; value: number }[];
  insights: {
    mostProductiveMood: string | null;
    mostProductiveAvg: number;
    highestStressDay: string | null;
    highestStressDayCount: number;
    totalEntries: number;
    totalMoodEntries: number;
  };
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function WeeklyMoodChart({ data }: { data: AnalyticsData }) {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const moodByDay = data.moodByDay || {};
  const tasksByDay = data.tasksByDay || {};

  const maxVal = Math.max(
    ...Object.values(moodByDay).map(d => d.total || 0),
    ...Object.values(tasksByDay).map(v => v || 0),
    1
  );

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-1 h-[60px]">
        {days.map((day, i) => {
          const dayNum = i + 1;
          const mood = moodByDay[dayNum];
          const tasks = tasksByDay[dayNum] || 0;
          const total = mood ? mood.total : 0;
          const barHeight = total > 0 ? Math.max(8, (total / maxVal) * 52) : 4;
          const taskHeight = tasks > 0 ? Math.max(4, (tasks / maxVal) * 52) : 0;

          let barColor = "var(--muted)";
          if (mood) {
            if (mood.good >= mood.okay && mood.good >= mood.tough) barColor = "#34d399";
            else if (mood.okay >= mood.tough) barColor = "#fbbf24";
            else barColor = "#f87171";
          }

          return (
            <div key={day} className="flex flex-col items-center gap-0.5 flex-1">
              <div className="flex items-end gap-[2px]">
                <div
                  className="w-3 rounded-sm transition-all"
                  style={{ height: `${barHeight}px`, backgroundColor: barColor, opacity: total > 0 ? 1 : 0.3 }}
                  title={`Mood entries: ${total}`}
                />
                {taskHeight > 0 && (
                  <div
                    className="w-3 rounded-sm transition-all opacity-50"
                    style={{ height: `${taskHeight}px`, backgroundColor: "var(--primary)" }}
                    title={`Tasks: ${tasks}`}
                  />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDailyPrompt(): string {
  const today = new Date();
  const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[dayIndex];
}

export default function JournalPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newText, setNewText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<JournalPrompt[]>([]);
  const [detectedSignals, setDetectedSignals] = useState<string[]>([]);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<any | null>(null);
  const [entryAnalysis, setEntryAnalysis] = useState<{ summary: JournalSummary | null; signals: string[] } | null>(null);
  const [moveLowPriorityTasks, setMoveLowPriorityTasks] = useState(false);
  const [templateUsed, setTemplateUsed] = useState<string | null>(null);
  const [linkedMeetingId, setLinkedMeetingId] = useState<string | null>(null);
  const [liveActions, setLiveActions] = useState<ExtractedAction[]>([]);
  const [viewActions, setViewActions] = useState<ExtractedAction[]>([]);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set());
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const dailyPrompt = useMemo(() => getDailyPrompt(), []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/journal?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load journal');
      return res.json();
    },
    enabled: !!user.id && user.isAuthenticated,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/meetings?userId=${user.id}`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id && user.isAuthenticated,
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['journal-analytics', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/journal/analytics?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load analytics');
      return res.json();
    },
    enabled: !!user.id && user.isAuthenticated,
  });

  const fetchPrompts = async (text: string) => {
    if (text.length < 10) {
      setSuggestedPrompts([]);
      setDetectedSignals([]);
      setSafetyMessage(null);
      return;
    }
    
    try {
      const res = await fetch(`/api/personal/journal/prompts?userId=${user.id}&text=${encodeURIComponent(text)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestedPrompts(data.prompts || []);
        setDetectedSignals(data.signals || []);
        if (data.safetyRisk) {
          setSafetyMessage("If you're going through a difficult time, please consider reaching out. You're not alone, and support is available.");
        } else {
          setSafetyMessage(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch prompts', e);
    }
  };

  const fetchLiveActions = useCallback(async (text: string) => {
    if (text.length < 30) {
      setLiveActions([]);
      return;
    }
    try {
      const res = await fetch('/api/personal/journal/extract-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, text }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiveActions(data.actions || []);
      }
    } catch (e) {
      console.error('Failed to extract live actions', e);
    }
  }, [user.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newText.length >= 10) {
        fetchPrompts(newText);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newText]);

  useEffect(() => {
    if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    extractTimerRef.current = setTimeout(() => {
      if (newText.length >= 30) {
        fetchLiveActions(newText);
      } else {
        setLiveActions([]);
      }
    }, 800);
    return () => {
      if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    };
  }, [newText, fetchLiveActions]);
  
  const createEntry = useMutation({
    mutationFn: async (data: { rawText: string; mood?: string; promptUsed?: string; templateUsed?: string; linkedMeetingId?: string }) => {
      const res = await fetch('/api/personal/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user.id, date: new Date() }),
      });
      if (!res.ok) throw new Error('Failed to create entry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      queryClient.invalidateQueries({ queryKey: ['journal-analytics'] });
      setNewText("");
      setSelectedMood(null);
      setSelectedPrompt(null);
      setSuggestedPrompts([]);
      setDetectedSignals([]);
      setSafetyMessage(null);
      setMoveLowPriorityTasks(false);
      setTemplateUsed(null);
      setLinkedMeetingId(null);
      setLiveActions([]);
      toast({ title: "Entry saved" });
    },
  });

  const analyzeEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await fetch(`/api/personal/journal/${entryId}/analyze?userId=${user.id}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to analyze');
      return res.json();
    },
    onSuccess: (data) => {
      setEntryAnalysis({
        summary: data.summary,
        signals: data.signals || [],
      });
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });

  const extractActions = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/personal/journal/extract-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, text }),
      });
      if (!res.ok) throw new Error('Failed to extract actions');
      return res.json();
    },
    onSuccess: (data) => {
      setViewActions(data.actions || []);
    },
  });

  const createTaskFromAction = useMutation({
    mutationFn: async ({ action, entryId }: { action: ExtractedAction; entryId: string }) => {
      const res = await fetch('/api/personal/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          text: action.text,
          priority: action.priority,
          bucket: "today",
          sourceType: "journal",
          sourceId: entryId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: (_, variables) => {
      setCreatedTaskIds(prev => new Set(prev).add(variables.action.text));
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: "Task created", description: variables.action.text });
    },
  });
  
  const handleSave = async () => {
    if (!newText.trim()) {
      toast({ title: "Please write something", variant: "destructive" });
      return;
    }
    
    if (moveLowPriorityTasks && selectedMood === 'tough') {
      try {
        await fetch('/api/reminders/snooze-low-priority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        toast({ title: "Low-priority tasks moved to tomorrow" });
      } catch (e) {
        console.error('Failed to snooze tasks', e);
      }
    }
    
    createEntry.mutate({ 
      rawText: newText, 
      mood: selectedMood || undefined, 
      promptUsed: selectedPrompt || undefined,
      templateUsed: templateUsed || undefined,
      linkedMeetingId: linkedMeetingId || undefined,
    });
  };
  
  const selectPrompt = (prompt: JournalPrompt) => {
    setSelectedPrompt(prompt.text);
    setNewText(prev => prev ? `${prev}\n\n${prompt.text}\n` : `${prompt.text}\n`);
  };

  const selectTemplate = (template: typeof TEMPLATES[number]) => {
    setTemplateUsed(template.id);
    setNewText(template.content);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleAnswerPrompt = () => {
    setNewText(prev => prev ? `${prev}\n\n${dailyPrompt}\n` : `${dailyPrompt}\n`);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const openEntry = (entry: any) => {
    setViewingEntry(entry);
    setEntryAnalysis(null);
    setViewActions([]);
    setCreatedTaskIds(new Set());
    if (entry.aiProcessed && entry.summary) {
      setEntryAnalysis({
        summary: { summary: entry.summary, top3: entry.top3 || [], nextSteps: entry.nextSteps || [] },
        signals: entry.detectedSignals || [],
      });
    }
  };

  const getMeetingById = (id: string) => {
    return (meetings as any[]).find((m: any) => m.id === id);
  };

  const insightText = useMemo(() => {
    if (!analytics?.insights?.mostProductiveMood) return null;
    const mood = analytics.insights.mostProductiveMood;
    const avg = analytics.insights.mostProductiveAvg;
    const pct = avg ? Math.round(avg * 100) : 0;
    return `You are most productive (${pct}%) on days you rate "${mood.charAt(0).toUpperCase() + mood.slice(1)}".`;
  }, [analytics]);
  
  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal & Reflection</h1>
            <p className="text-muted-foreground text-sm mt-1">Capture thoughts, clear your mind, and plan ahead.</p>
          </div>
        </div>
        <SkeletonList count={3} type="journal" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-journal-title">
            Journal & Reflection
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Capture thoughts, clear your mind, and plan ahead.</p>
        </div>
        <Button 
          onClick={() => {
            setNewText("");
            setTemplateUsed(null);
            setSelectedMood(null);
            setTimeout(() => textareaRef.current?.focus(), 100);
          }}
          className="rounded-xl btn-gradient"
          data-testid="button-new-entry"
        >
          <Plus className="h-4 w-4 mr-2" weight="bold" />
          New Entry
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Left column */}
        <div className="space-y-4">
          {/* Quick Reflection card */}
          <Card className="glass-panel rounded-2xl overflow-hidden" data-testid="card-quick-reflection">
            <CardContent className="p-5 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Reflection</p>

              {/* Template pills */}
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => {
                  const TIcon = t.icon;
                  const isSelected = templateUsed === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all",
                        isSelected ? t.pillBgSelected : t.pillBg
                      )}
                      data-testid={`template-${t.id}`}
                    >
                      <TIcon className={cn("h-4 w-4", t.color)} weight="fill" />
                      {t.title}
                    </button>
                  );
                })}
              </div>

              {/* Mood selector (compact inline) */}
              {selectedMood === null ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Mood:</span>
                  {MOOD_OPTIONS.map((mood) => {
                    const MoodIcon = mood.icon;
                    return (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        className={cn(
                          "p-1.5 rounded-lg border border-transparent transition-all",
                          mood.bgHover
                        )}
                        title={mood.label}
                        data-testid={`mood-${mood.value}`}
                      >
                        <MoodIcon className={cn("h-5 w-5", mood.color)} weight="duotone" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Mood:</span>
                  {MOOD_OPTIONS.map((mood) => {
                    const MoodIcon = mood.icon;
                    const isSelected = selectedMood === mood.value;
                    return (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        className={cn(
                          "p-1.5 rounded-lg border transition-all",
                          isSelected ? mood.bgSelected : `border-transparent ${mood.bgHover}`
                        )}
                        title={mood.label}
                        data-testid={`mood-${mood.value}`}
                      >
                        <MoodIcon className={cn("h-5 w-5", mood.color)} weight={isSelected ? "fill" : "duotone"} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Safety message */}
              {safetyMessage && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm flex items-start gap-3">
                  <Heart className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" weight="fill" />
                  <div>
                    <p className="font-medium text-foreground">You matter</p>
                    <p className="mt-1 text-muted-foreground">{safetyMessage}</p>
                    <a 
                      href="https://988lifeline.org" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline mt-2 inline-block"
                    >
                      988 Suicide & Crisis Lifeline
                    </a>
                  </div>
                </div>
              )}

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="What's on your mind right now?"
                className="min-h-[120px] bg-accent/50 border-border rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:ring-1 focus:ring-primary"
                data-testid="input-journal-text"
              />

              {/* Detected signals */}
              {detectedSignals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detectedSignals.map((signal) => {
                    const Icon = SIGNAL_ICONS[signal] || Warning;
                    return (
                      <span 
                        key={signal}
                        className="text-xs bg-accent text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1 border border-border"
                      >
                        <Icon className="h-3 w-3 text-primary" weight="duotone" />
                        {SIGNAL_LABELS[signal] || signal}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Suggested prompts */}
              <AnimatePresence>
                {suggestedPrompts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Sparkle className="h-3.5 w-3.5 text-primary" weight="fill" />
                      Suggested prompts
                    </label>
                    <div className="space-y-1.5">
                      {suggestedPrompts.slice(0, 3).map((prompt) => (
                        <button
                          key={prompt.id}
                          onClick={() => selectPrompt(prompt)}
                          className="w-full text-left p-2.5 rounded-xl bg-accent/50 hover:bg-accent text-sm text-foreground transition-colors border border-border"
                          data-testid={`prompt-${prompt.id}`}
                        >
                          <CaretRight className="h-3 w-3 inline mr-1.5 text-primary" weight="bold" />
                          {prompt.text}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live detected actions */}
              <AnimatePresence>
                {liveActions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-2"
                  >
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Lightning className="h-3.5 w-3.5 text-amber-400" weight="fill" />
                      Detected actions
                    </label>
                    <div className="space-y-1.5">
                      {liveActions.map((action, i) => (
                        <div key={i} className="p-2.5 bg-accent/50 rounded-xl border border-border flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" weight="bold" />
                          <span className="text-sm text-foreground flex-1">{action.text}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", PRIORITY_COLORS[action.priority])}>
                            {action.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tough day option */}
              <AnimatePresence>
                {selectedMood === 'tough' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <Checkbox
                        id="move-tasks"
                        checked={moveLowPriorityTasks}
                        onCheckedChange={(checked) => setMoveLowPriorityTasks(checked === true)}
                        className="mt-0.5 border-red-400/50 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      />
                      <label 
                        htmlFor="move-tasks" 
                        className="text-sm text-muted-foreground cursor-pointer leading-snug"
                      >
                        Move today's low-priority tasks to tomorrow?
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom bar: emoji + save */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedMood(selectedMood ? null : "good")}
                    title="Set mood"
                    data-testid="button-mood-toggle"
                  >
                    <Smiley className="h-5 w-5" weight="duotone" />
                  </button>
                  <div className="relative">
                    <select
                      value={linkedMeetingId || ""}
                      onChange={(e) => setLinkedMeetingId(e.target.value || null)}
                      className="appearance-none bg-transparent p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground cursor-pointer w-7 h-7"
                      title="Link to meeting"
                      data-testid="select-linked-meeting"
                    >
                      <option value="">No meeting</option>
                      {(meetings as any[]).slice(0, 20).map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.title || "Untitled"} — {m.date ? format(new Date(m.date), "MMM d") : ""}
                        </option>
                      ))}
                    </select>
                    <Video className="h-5 w-5 absolute inset-0 m-auto pointer-events-none text-muted-foreground" weight="duotone" />
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={createEntry.isPending || !newText.trim()}
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    newText.trim() ? "text-primary hover:text-primary/80 cursor-pointer" : "text-muted-foreground cursor-not-allowed"
                  )}
                  data-testid="button-save-draft"
                >
                  {createEntry.isPending ? (
                    <SpinnerGap className="h-4 w-4 animate-spin inline" weight="bold" />
                  ) : (
                    "Save Draft"
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Entry feed */}
          {entries.length === 0 ? (
            <EmptyState 
              variant="journal"
              onAction={() => textareaRef.current?.focus()}
              showTutorial={false}
            />
          ) : (
            <div className="space-y-3">
              {entries.map((entry: any) => {
                const linkedMeeting = entry.linkedMeetingId ? getMeetingById(entry.linkedMeetingId) : null;
                const entryDate = new Date(entry.date);
                const entryTime = format(entryDate, "hh:mm a");
                const entryDay = format(entryDate, "EEEE, MMM d");

                return (
                  <Card 
                    key={entry.id} 
                    className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:bg-accent/50 transition-all group"
                    onClick={() => openEntry(entry)}
                    data-testid={`card-entry-${entry.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Entry header: date, time, mood */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground" data-testid={`text-date-${entry.id}`}>{entryDay}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-time-${entry.id}`}>
                          <Clock className="h-3 w-3" weight="bold" />
                          {entryTime}
                        </span>
                        <div className="flex items-center gap-1.5 ml-auto">
                          {linkedMeeting && (
                            <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-500/20" data-testid={`badge-meeting-${entry.id}`}>
                              <Video className="h-3 w-3" weight="fill" />
                              {(linkedMeeting as any).title?.substring(0, 20) || "Meeting"}
                            </span>
                          )}
                          {entry.templateUsed && (
                            <span className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1" data-testid={`badge-template-${entry.id}`}>
                              {entry.templateUsed === 'morning' ? <SunHorizon className="h-3 w-3" weight="fill" /> : 
                               entry.templateUsed === 'weekly_win' ? <Trophy className="h-3 w-3" weight="fill" /> :
                               <MoonStars className="h-3 w-3" weight="fill" />}
                            </span>
                          )}
                          {entry.mood && (
                            <span className={cn(
                              "flex items-center",
                              entry.mood === 'good' ? 'text-emerald-400' : 
                              entry.mood === 'okay' ? 'text-amber-400' : 'text-red-400'
                            )} data-testid={`mood-indicator-${entry.id}`}>
                              {entry.mood === 'good' && <Smiley className="h-5 w-5" weight="fill" />}
                              {entry.mood === 'okay' && <SmileyMeh className="h-5 w-5" weight="fill" />}
                              {entry.mood === 'tough' && <SmileySad className="h-5 w-5" weight="fill" />}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Entry content preview */}
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3 leading-relaxed" data-testid={`text-content-${entry.id}`}>
                        {entry.rawText}
                      </p>

                      {/* Suggested action bar */}
                      {entry.aiProcessed && entry.nextSteps && entry.nextSteps.length > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-xl" data-testid={`suggested-action-${entry.id}`}>
                          <Sparkle className="h-4 w-4 text-primary flex-shrink-0" weight="fill" />
                          <span className="text-xs font-medium text-foreground flex-1 truncate">
                            <span className="text-primary font-semibold">Suggested Action:</span>{" "}
                            {entry.nextSteps[0]}
                          </span>
                          <Button
                            size="sm"
                            className="h-6 px-2.5 text-xs rounded-lg btn-gradient flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              createTaskFromAction.mutate({ 
                                action: { text: entry.nextSteps[0], priority: "normal", context: "" },
                                entryId: entry.id 
                              });
                            }}
                            data-testid={`button-add-task-${entry.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" weight="bold" />
                            Add Task
                          </Button>
                        </div>
                      )}

                      {/* Signal tags */}
                      {entry.detectedSignals && entry.detectedSignals.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.detectedSignals.slice(0, 3).map((signal: string) => {
                            return (
                              <span 
                                key={signal}
                                className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 border border-border"
                                data-testid={`tag-signal-${entry.id}-${signal}`}
                              >
                                <Tag className="h-3 w-3" weight="bold" />
                                #{SIGNAL_LABELS[signal] || signal}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Mood vs. Output card */}
          <Card className="glass-panel rounded-2xl" data-testid="card-mood-output">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ChartBar className="h-4 w-4 text-primary" weight="fill" />
                <h3 className="text-sm font-semibold text-foreground">Mood vs. Output</h3>
              </div>

              {analytics ? (
                <>
                  <WeeklyMoodChart data={analytics} />
                  {insightText && (
                    <div className="p-2.5 bg-accent/50 rounded-xl border border-border">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">Insight:</span> {insightText}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-6">
                  <SpinnerGap className="h-4 w-4 animate-spin text-muted-foreground" weight="bold" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Prompt card */}
          <Card 
            className="rounded-2xl overflow-hidden border-0"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #a855f7, #7c3aed)",
            }}
            data-testid="card-daily-prompt"
          >
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">Daily Prompt</h3>
              <p className="text-sm text-white/90 italic leading-relaxed">
                "{dailyPrompt}"
              </p>
              <button
                onClick={handleAnswerPrompt}
                className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-white/80 transition-colors"
                data-testid="button-answer-prompt"
              >
                <ArrowRight className="h-4 w-4" weight="bold" />
                Answer
              </button>
            </CardContent>
          </Card>

          {/* Quick stats */}
          {analytics && (
            <Card className="glass-panel rounded-2xl" data-testid="card-journal-stats">
              <CardContent className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-accent/50 rounded-xl">
                    <p className="text-lg font-bold text-foreground">{analytics.insights.totalEntries}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Entries</p>
                  </div>
                  <div className="text-center p-2 bg-accent/50 rounded-xl">
                    <p className="text-lg font-bold text-foreground">{analytics.insights.totalMoodEntries}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">With Mood</p>
                  </div>
                </div>
                {analytics.moodCounts && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex h-2 rounded-full overflow-hidden bg-accent">
                      {(analytics.moodCounts.good || 0) > 0 && (
                        <div className="bg-emerald-400 transition-all" style={{ width: `${Math.round(((analytics.moodCounts.good || 0) / ((analytics.moodCounts.good || 0) + (analytics.moodCounts.okay || 0) + (analytics.moodCounts.tough || 0))) * 100)}%` }} />
                      )}
                      {(analytics.moodCounts.okay || 0) > 0 && (
                        <div className="bg-amber-400 transition-all" style={{ width: `${Math.round(((analytics.moodCounts.okay || 0) / ((analytics.moodCounts.good || 0) + (analytics.moodCounts.okay || 0) + (analytics.moodCounts.tough || 0))) * 100)}%` }} />
                      )}
                      {(analytics.moodCounts.tough || 0) > 0 && (
                        <div className="bg-red-400 transition-all" style={{ width: `${Math.round(((analytics.moodCounts.tough || 0) / ((analytics.moodCounts.good || 0) + (analytics.moodCounts.okay || 0) + (analytics.moodCounts.tough || 0))) * 100)}%` }} />
                      )}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Good</span>
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Okay</span>
                      <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Tough</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* View entry dialog */}
      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-panel border-border text-foreground">
          {viewingEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  {format(new Date(viewingEntry.date), "EEEE, MMMM d, yyyy")}
                  {viewingEntry.mood && (
                    <span className={cn(
                      "ml-auto flex items-center gap-1 text-sm",
                      viewingEntry.mood === 'good' ? 'text-emerald-400' : 
                      viewingEntry.mood === 'okay' ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {viewingEntry.mood === 'good' && <Smiley className="h-4 w-4" weight="duotone" />}
                      {viewingEntry.mood === 'okay' && <SmileyMeh className="h-4 w-4" weight="duotone" />}
                      {viewingEntry.mood === 'tough' && <SmileySad className="h-4 w-4" weight="duotone" />}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {viewingEntry.linkedMeetingId && (() => {
                  const lm = getMeetingById(viewingEntry.linkedMeetingId);
                  return lm ? (
                    <div
                      className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-indigo-500/15 transition-colors"
                      onClick={() => window.open(`/meetings/${(lm as any).id}`, '_blank')}
                      data-testid="card-linked-meeting"
                    >
                      <Video className="h-5 w-5 text-indigo-400" weight="fill" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{(lm as any).title || "Untitled Meeting"}</p>
                        {(lm as any).date && (
                          <p className="text-xs text-muted-foreground">{format(new Date((lm as any).date), "MMM d, yyyy")}</p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" weight="bold" />
                    </div>
                  ) : null;
                })()}

                <div className="p-4 bg-accent rounded-xl border border-border">
                  <p className="text-foreground whitespace-pre-wrap">{viewingEntry.rawText}</p>
                </div>

                {entryAnalysis?.summary && (
                  <div className="space-y-3">
                    <div className="p-4 bg-accent rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkle className="h-4 w-4 text-primary" weight="fill" />
                        <span className="text-sm font-medium text-foreground">AI Summary</span>
                      </div>
                      <p className="text-foreground text-sm">{entryAnalysis.summary.summary}</p>
                    </div>

                    {entryAnalysis.summary.top3 && entryAnalysis.summary.top3.length > 0 && (
                      <div className="p-4 bg-accent rounded-xl border border-border">
                        <p className="text-sm font-medium text-foreground mb-2">Top 3 Points</p>
                        <ul className="space-y-1">
                          {entryAnalysis.summary.top3.map((point, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary font-medium">{i + 1}.</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entryAnalysis.summary.nextSteps && entryAnalysis.summary.nextSteps.length > 0 && (
                      <div className="p-4 bg-accent rounded-xl border border-border">
                        <p className="text-sm font-medium text-foreground mb-2">Suggested Next Steps</p>
                        <ul className="space-y-1">
                          {entryAnalysis.summary.nextSteps.map((step, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" weight="fill" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {entryAnalysis?.signals && entryAnalysis.signals.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {entryAnalysis.signals.map((signal) => {
                      const Icon = SIGNAL_ICONS[signal] || Warning;
                      return (
                        <span 
                          key={signal}
                          className="text-xs bg-accent text-muted-foreground px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          <Icon className="h-3 w-3" weight="duotone" />
                          {SIGNAL_LABELS[signal] || signal}
                        </span>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {viewActions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Lightning className="h-4 w-4 text-amber-400" weight="fill" />
                        <span className="text-sm font-medium text-foreground">Extracted Actions</span>
                      </div>
                      {viewActions.map((action, i) => {
                        const isCreated = createdTaskIds.has(action.text);
                        return (
                          <div key={i} className="p-3 bg-accent rounded-xl border border-border space-y-2" data-testid={`action-card-${i}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm text-foreground font-medium flex-1">{action.text}</span>
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0", PRIORITY_COLORS[action.priority])}>
                                {action.priority}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground italic">"{action.context}"</p>
                            <Button
                              size="sm"
                              variant={isCreated ? "outline" : "default"}
                              className="w-full rounded-lg text-xs h-8"
                              disabled={isCreated || createTaskFromAction.isPending}
                              onClick={() => createTaskFromAction.mutate({ action, entryId: viewingEntry.id })}
                              data-testid={`button-create-task-${i}`}
                            >
                              {isCreated ? (
                                <><CheckCircle className="h-3 w-3 mr-1" weight="fill" /> Task Created</>
                              ) : createTaskFromAction.isPending ? (
                                <SpinnerGap className="h-3 w-3 animate-spin" weight="bold" />
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" weight="bold" /> Create Task</>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!entryAnalysis?.summary && user.personalAiEnabled !== false && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        analyzeEntry.mutate(viewingEntry.id);
                        extractActions.mutate(viewingEntry.rawText);
                      }}
                      disabled={analyzeEntry.isPending || extractActions.isPending}
                      variant="outline"
                      className="flex-1 rounded-xl"
                      data-testid="button-analyze-entry"
                    >
                      {analyzeEntry.isPending ? (
                        <SpinnerGap className="h-4 w-4 animate-spin mr-2" weight="bold" />
                      ) : (
                        <Sparkle className="h-4 w-4 mr-2 text-primary" weight="fill" />
                      )}
                      Get AI Insights
                    </Button>
                  </div>
                )}

                {entryAnalysis?.summary && viewActions.length === 0 && !extractActions.isPending && (
                  <Button
                    onClick={() => extractActions.mutate(viewingEntry.rawText)}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    data-testid="button-extract-actions"
                  >
                    <Lightning className="h-4 w-4 mr-2 text-amber-400" weight="fill" />
                    Extract Actions
                  </Button>
                )}

                {extractActions.isPending && (
                  <div className="flex items-center justify-center py-3">
                    <SpinnerGap className="h-4 w-4 animate-spin text-muted-foreground mr-2" weight="bold" />
                    <span className="text-sm text-muted-foreground">Extracting actions...</span>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
