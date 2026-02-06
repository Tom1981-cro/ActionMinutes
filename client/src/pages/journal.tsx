import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Smiley, SmileyMeh, SmileySad, Sparkle, CaretRight, 
  Warning, Target, Heart, Lightbulb, CheckCircle, SpinnerGap, Plus, BookOpen
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
  
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/journal?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load journal');
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (newText.length >= 10) {
        fetchPrompts(newText);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [newText]);
  
  const createEntry = useMutation({
    mutationFn: async (data: { rawText: string; mood?: string; promptUsed?: string }) => {
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
      promptUsed: selectedPrompt || undefined 
    });
  };
  
  const selectPrompt = (prompt: JournalPrompt) => {
    setSelectedPrompt(prompt.text);
    setNewText(prev => prev ? `${prev}\n\n${prompt.text}\n` : `${prompt.text}\n`);
  };

  const openEntry = (entry: any) => {
    setViewingEntry(entry);
    setEntryAnalysis(null);
    if (entry.aiProcessed && entry.summary) {
      setEntryAnalysis({
        summary: { summary: entry.summary, top3: entry.top3 || [], nextSteps: entry.nextSteps || [] },
        signals: entry.detectedSignals || [],
      });
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gradient-light">Journal</h1>
            <p className="text-muted-foreground text-base mt-1">Private reflections and notes</p>
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
          <h1 className="text-4xl font-black tracking-tight text-gradient-light">Journal</h1>
          <p className="text-muted-foreground text-base mt-1">Private reflections and notes</p>
        </div>
        <Button 
          onClick={() => setShowNewEntry(true)}
          className="rounded-xl btn-gradient"
          data-testid="button-new-entry"
        >
          <Plus className="h-4 w-4 mr-2" weight="bold" />
          New Entry
        </Button>
      </div>
      
      {entries.length === 0 ? (
        <EmptyState 
          variant="journal"
          onAction={() => setShowNewEntry(true)}
          showTutorial={false}
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
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
                <p className="text-foreground whitespace-pre-wrap line-clamp-3">
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
          ))}
        </div>
      )}
      
      {/* New Entry Modal with Glass Panel */}
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

            {/* Mood Selection with Framer Motion */}
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

            {/* Conditional checkbox for "Tough" mood */}
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

      {/* View Entry Modal with Glass Panel */}
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

                {!entryAnalysis?.summary && user.personalAiEnabled !== false && (
                  <Button
                    onClick={() => analyzeEntry.mutate(viewingEntry.id)}
                    disabled={analyzeEntry.isPending}
                    variant="outline"
                    className="w-full rounded-xl"
                    data-testid="button-analyze-entry"
                  >
                    {analyzeEntry.isPending ? (
                      <SpinnerGap className="h-4 w-4 animate-spin mr-2" weight="bold" />
                    ) : (
                      <Sparkle className="h-4 w-4 mr-2 text-primary" weight="fill" />
                    )}
                    Get AI Insights
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
