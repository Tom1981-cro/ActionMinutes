import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Smiley, SmileyMeh, SmileySad, Sparkle, CaretRight, 
  Warning, Target, Heart, Lightbulb, CheckCircle, SpinnerGap, Plus, BookOpen,
  Video, ChartBar, SunHorizon, MoonStars, Lightning, ArrowRight, TrendUp, CaretDown
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
    title: "Morning Intentions",
    description: "Set your focus and priorities for the day",
    icon: SunHorizon,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15",
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
    description: "Reflect on the day and plan ahead",
    icon: MoonStars,
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/15",
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

function MoodTrendChart({ data }: { data: { date: string; mood: string; value: number }[] }) {
  if (!data.length) return null;
  const barWidth = Math.max(6, Math.min(16, Math.floor(300 / data.length)));
  const colors: Record<number, string> = { 3: "#34d399", 2: "#fbbf24", 1: "#f87171" };

  return (
    <div className="flex items-end gap-[2px] h-[80px] w-full overflow-x-auto">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0" title={`${d.date}: ${d.mood}`}>
          <div
            className="rounded-sm transition-all"
            style={{
              width: `${barWidth}px`,
              height: `${(d.value / 3) * 64}px`,
              backgroundColor: colors[d.value] || "#6b7280",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function MoodDistribution({ counts }: { counts: Record<string, number> }) {
  const total = (counts.good || 0) + (counts.okay || 0) + (counts.tough || 0);
  if (!total) return null;
  const pct = (v: number) => Math.round((v / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-accent">
        {counts.good > 0 && (
          <div className="bg-emerald-400 transition-all" style={{ width: `${pct(counts.good)}%` }} />
        )}
        {counts.okay > 0 && (
          <div className="bg-amber-400 transition-all" style={{ width: `${pct(counts.okay)}%` }} />
        )}
        {counts.tough > 0 && (
          <div className="bg-red-400 transition-all" style={{ width: `${pct(counts.tough)}%` }} />
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Good {pct(counts.good || 0)}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Okay {pct(counts.okay || 0)}%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Tough {pct(counts.tough || 0)}%</span>
      </div>
    </div>
  );
}

export default function JournalPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showNewEntry, setShowNewEntry] = useState(false);
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
  const [showInsights, setShowInsights] = useState(false);
  const [liveActions, setLiveActions] = useState<ExtractedAction[]>([]);
  const [viewActions, setViewActions] = useState<ExtractedAction[]>([]);
  const [createdTaskIds, setCreatedTaskIds] = useState<Set<string>>(new Set());
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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
    enabled: !!user.id && user.isAuthenticated && showInsights,
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
      setShowNewEntry(false);
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
  
  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal</h1>
            <p className="text-muted-foreground text-sm mt-1">Private reflections and notes</p>
          </div>
        </div>
        <SkeletonList count={3} type="journal" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Journal</h1>
          <p className="text-muted-foreground text-sm mt-1">Private reflections and notes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInsights(!showInsights)}
            className="rounded-xl"
            data-testid="button-toggle-insights"
          >
            {showInsights ? <TrendUp className="h-4 w-4 mr-1" weight="bold" /> : <ChartBar className="h-4 w-4 mr-1" weight="bold" />}
            Insights
          </Button>
          <Button 
            onClick={() => setShowNewEntry(true)}
            className="rounded-xl btn-gradient"
            data-testid="button-new-entry"
          >
            <Plus className="h-4 w-4 mr-2" weight="bold" />
            New Entry
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className="glass-panel rounded-2xl" data-testid="section-insights">
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendUp className="h-5 w-5 text-primary" weight="bold" />
                  <h2 className="text-base font-semibold text-foreground">Mood & Productivity Insights</h2>
                </div>

                {analytics ? (
                  <div className="space-y-5">
                    {analytics.recentMoodTrend.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mood Trend (Last 30 entries)</p>
                        <div className="p-3 bg-accent rounded-xl border border-border">
                          <MoodTrendChart data={analytics.recentMoodTrend} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {analytics.insights.mostProductiveMood && (
                        <div className="p-3 bg-accent rounded-xl border border-border" data-testid="insight-productive-mood">
                          <div className="flex items-center gap-2 mb-1">
                            <Lightning className="h-4 w-4 text-amber-400" weight="fill" />
                            <span className="text-xs font-medium text-muted-foreground">Productivity Insight</span>
                          </div>
                          <p className="text-sm text-foreground">
                            You're most productive when feeling <span className={cn(
                              "font-semibold",
                              analytics.insights.mostProductiveMood === 'good' ? 'text-emerald-400' :
                              analytics.insights.mostProductiveMood === 'okay' ? 'text-amber-400' : 'text-red-400'
                            )}>{analytics.insights.mostProductiveMood}</span>
                          </p>
                        </div>
                      )}
                      {analytics.insights.highestStressDay && (
                        <div className="p-3 bg-accent rounded-xl border border-border" data-testid="insight-stress-day">
                          <div className="flex items-center gap-2 mb-1">
                            <Warning className="h-4 w-4 text-red-400" weight="fill" />
                            <span className="text-xs font-medium text-muted-foreground">Stress Pattern</span>
                          </div>
                          <p className="text-sm text-foreground">
                            <span className="font-semibold text-red-400">{analytics.insights.highestStressDay}</span> tends to be your highest stress day
                          </p>
                        </div>
                      )}
                    </div>

                    {analytics.moodCounts && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mood Distribution</p>
                        <MoodDistribution counts={analytics.moodCounts} />
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                      Based on {analytics.insights.totalEntries} entries ({analytics.insights.totalMoodEntries} with mood)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <SpinnerGap className="h-5 w-5 animate-spin text-muted-foreground" weight="bold" />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {entries.length === 0 ? (
        <EmptyState 
          variant="journal"
          onAction={() => setShowNewEntry(true)}
          showTutorial={false}
        />
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => {
            const linkedMeeting = entry.linkedMeetingId ? getMeetingById(entry.linkedMeetingId) : null;
            return (
              <Card 
                key={entry.id} 
                className="glass-panel rounded-2xl overflow-hidden cursor-pointer hover:bg-accent transition-all"
                onClick={() => openEntry(entry)}
                data-testid={`card-entry-${entry.id}`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.date), "EEEE, MMM d")}
                    </span>
                    <div className="flex items-center gap-2">
                      {linkedMeeting && (
                        <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-500/20" data-testid={`badge-meeting-${entry.id}`}>
                          <Video className="h-3 w-3" weight="fill" />
                          {(linkedMeeting as any).title?.substring(0, 20) || "Meeting"}
                        </span>
                      )}
                      {entry.templateUsed && (
                        <span className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                          {entry.templateUsed === 'morning' ? <SunHorizon className="h-3 w-3" weight="fill" /> : <MoonStars className="h-3 w-3" weight="fill" />}
                        </span>
                      )}
                      {entry.aiProcessed && (
                        <span className="text-xs bg-accent text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkle className="h-3 w-3" weight="fill" />
                          AI
                        </span>
                      )}
                      {entry.mood && (
                        <span className={cn(
                          "flex items-center gap-1 text-sm",
                          entry.mood === 'good' ? 'text-emerald-400' : 
                          entry.mood === 'okay' ? 'text-amber-400' : 'text-red-400'
                        )}>
                          {entry.mood === 'good' && <Smiley className="h-4 w-4" weight="duotone" />}
                          {entry.mood === 'okay' && <SmileyMeh className="h-4 w-4" weight="duotone" />}
                          {entry.mood === 'tough' && <SmileySad className="h-4 w-4" weight="duotone" />}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                    {entry.rawText}
                  </p>
                  {entry.detectedSignals && entry.detectedSignals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.detectedSignals.slice(0, 2).map((signal: string) => {
                        const Icon = SIGNAL_ICONS[signal] || Warning;
                        return (
                          <span 
                            key={signal}
                            className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1"
                          >
                            <Icon className="h-3 w-3" weight="duotone" />
                            {SIGNAL_LABELS[signal] || signal}
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
      
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto glass-panel border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-semibold">New Journal Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {safetyMessage && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-sm flex items-start gap-3">
                <Heart className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-400" weight="fill" />
                <div>
                  <p className="font-medium text-amber-300">You matter</p>
                  <p className="mt-1 text-amber-200/80">{safetyMessage}</p>
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-300 underline mt-2 inline-block hover:text-amber-200"
                  >
                    988 Suicide & Crisis Lifeline
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Start with a template</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => {
                  const TIcon = t.icon;
                  const isSelected = templateUsed === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      onClick={() => selectTemplate(t)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all",
                        isSelected ? "ring-2 ring-primary/50 " + t.bgColor : t.bgColor
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`template-${t.id}`}
                    >
                      <TIcon className={cn("h-5 w-5 mb-1", t.color)} weight="fill" />
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">How are you feeling?</label>
              <div className="flex gap-3">
                {MOOD_OPTIONS.map((mood) => {
                  const isSelected = selectedMood === mood.value;
                  const MoodIcon = mood.icon;
                  
                  return (
                    <motion.button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={cn(
                        "flex-1 py-4 rounded-xl border-2 transition-colors",
                        isSelected 
                          ? mood.bgSelected
                          : `border-border ${mood.bgHover}`
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      data-testid={`mood-${mood.value}`}
                    >
                      <motion.div
                        animate={isSelected ? { scale: [1, 1.2, 1.1] } : { scale: 1 }}
                        transition={isSelected ? { 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 10,
                          duration: 0.3 
                        } : {}}
                      >
                        <MoodIcon className={cn("h-8 w-8 mx-auto", mood.color)} weight="duotone" />
                      </motion.div>
                      <span className={cn(
                        "text-xs mt-2 block transition-colors",
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      )}>{mood.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Link to Meeting</label>
              <div className="relative">
                <select
                  value={linkedMeetingId || ""}
                  onChange={(e) => setLinkedMeetingId(e.target.value || null)}
                  className="w-full rounded-xl bg-accent border border-border text-foreground text-sm px-3 py-2.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="select-linked-meeting"
                >
                  <option value="">No linked meeting</option>
                  {(meetings as any[]).slice(0, 20).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.title || "Untitled Meeting"} — {m.date ? format(new Date(m.date), "MMM d") : "No date"}
                    </option>
                  ))}
                </select>
                <CaretDown className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" weight="bold" />
              </div>
            </div>

            {detectedSignals.length > 0 && (
              <div className="p-3 bg-accent rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-2">I noticed:</p>
                <div className="flex flex-wrap gap-2">
                  {detectedSignals.map((signal) => {
                    const Icon = SIGNAL_ICONS[signal] || Warning;
                    return (
                      <span 
                        key={signal}
                        className="text-xs bg-accent text-foreground px-2 py-1 rounded-lg border border-border flex items-center gap-1"
                      >
                        <Icon className="h-3 w-3 text-primary" weight="duotone" />
                        {SIGNAL_LABELS[signal] || signal}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {suggestedPrompts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkle className="h-4 w-4 text-primary" weight="fill" />
                  Suggested prompts
                </label>
                <div className="grid gap-2">
                  {suggestedPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => selectPrompt(prompt)}
                      className="text-left p-3 rounded-xl bg-accent hover:bg-accent text-sm text-foreground transition-colors border border-border"
                      data-testid={`prompt-${prompt.id}`}
                    >
                      <CaretRight className="h-3 w-3 inline mr-2 text-primary" weight="bold" />
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Your thoughts</label>
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Write whatever's on your mind..."
                className="min-h-[200px] bg-accent border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-border"
                data-testid="input-journal-text"
              />
            </div>

            <AnimatePresence>
              {liveActions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Lightning className="h-4 w-4 text-amber-400" weight="fill" />
                      Detected actions
                    </label>
                    <div className="grid gap-2">
                      {liveActions.map((action, i) => (
                        <div key={i} className="p-2.5 bg-accent rounded-xl border border-border flex items-center gap-2">
                          <ArrowRight className="h-3 w-3 text-primary flex-shrink-0" weight="bold" />
                          <span className="text-sm text-foreground flex-1">{action.text}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", PRIORITY_COLORS[action.priority])}>
                            {action.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {selectedMood === 'tough' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
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
                      className="text-sm text-red-200/80 cursor-pointer leading-snug"
                    >
                      Would you like to move today's low-priority tasks to tomorrow?
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewEntry(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createEntry.isPending || !newText.trim()}
                className="flex-1 rounded-xl btn-gradient"
                data-testid="button-save-entry"
              >
                {createEntry.isPending ? <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" /> : "Save Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
