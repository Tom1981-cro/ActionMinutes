import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, Plus, Loader2, Smile, Meh, Frown, Sparkles, ChevronRight, 
  AlertTriangle, Target, CheckCircle2, Lightbulb, Heart
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MOOD_OPTIONS = [
  { value: "good", icon: Smile, label: "Good", color: "text-green-500", bg: "bg-green-50 border-green-200" },
  { value: "okay", icon: Meh, label: "Okay", color: "text-amber-500", bg: "bg-amber-50 border-amber-200" },
  { value: "tough", icon: Frown, label: "Tough", color: "text-red-500", bg: "bg-red-50 border-red-200" },
];

const SIGNAL_ICONS: Record<string, typeof AlertTriangle> = {
  overwhelm: AlertTriangle,
  deadlines: Target,
  conflict: Heart,
  decision: Lightbulb,
  avoidance: CheckCircle2,
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
  
  const handleSave = () => {
    if (!newText.trim()) {
      toast({ title: "Please write something", variant: "destructive" });
      return;
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Journal</h1>
          <p className="text-gray-500 text-base mt-1">Private reflections and notes</p>
        </div>
        <Button 
          onClick={() => setShowNewEntry(true)}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg"
          data-testid="button-new-entry"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>
      
      {entries.length === 0 ? (
        <Card className="bg-gray-50/50 border-dashed border-gray-300 rounded-xl">
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">Start your journal</p>
              <p className="text-gray-500 text-base mt-1">Capture your thoughts, reflections, and ideas</p>
            </div>
            <Button 
              onClick={() => setShowNewEntry(true)}
              variant="outline" 
              className="rounded-xl mt-4"
            >
              Write your first entry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <Card 
              key={entry.id} 
              className="bg-white border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEntry(entry)}
              data-testid={`card-entry-${entry.id}`}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {format(new Date(entry.date), "EEEE, MMM d")}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.aiProcessed && (
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </span>
                    )}
                    {entry.mood && (
                      <span className={`flex items-center gap-1 text-sm ${
                        entry.mood === 'good' ? 'text-green-500' : 
                        entry.mood === 'okay' ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {entry.mood === 'good' && <Smile className="h-4 w-4" />}
                        {entry.mood === 'okay' && <Meh className="h-4 w-4" />}
                        {entry.mood === 'tough' && <Frown className="h-4 w-4" />}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap line-clamp-3">
                  {entry.rawText}
                </p>
                {entry.detectedSignals && entry.detectedSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.detectedSignals.slice(0, 2).map((signal: string) => {
                      const Icon = SIGNAL_ICONS[signal] || AlertTriangle;
                      return (
                        <span 
                          key={signal}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1"
                        >
                          <Icon className="h-3 w-3" />
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
      
      <Dialog open={showNewEntry} onOpenChange={setShowNewEntry}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {safetyMessage && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
                <Heart className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">You matter</p>
                  <p className="mt-1">{safetyMessage}</p>
                  <a 
                    href="https://988lifeline.org" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-700 underline mt-2 inline-block"
                  >
                    988 Suicide & Crisis Lifeline
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">How are you feeling?</label>
              <div className="flex gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                      selectedMood === mood.value 
                        ? `${mood.bg}` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`mood-${mood.value}`}
                  >
                    <mood.icon className={`h-6 w-6 mx-auto ${mood.color}`} />
                    <span className="text-xs text-gray-600 mt-1 block">{mood.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {detectedSignals.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 mb-2">I noticed:</p>
                <div className="flex flex-wrap gap-2">
                  {detectedSignals.map((signal) => {
                    const Icon = SIGNAL_ICONS[signal] || AlertTriangle;
                    return (
                      <span 
                        key={signal}
                        className="text-xs bg-white text-slate-600 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1"
                      >
                        <Icon className="h-3 w-3 text-indigo-500" />
                        {SIGNAL_LABELS[signal] || signal}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            
            {suggestedPrompts.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Suggested prompts
                </label>
                <div className="grid gap-2">
                  {suggestedPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => selectPrompt(prompt)}
                      className="text-left p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-sm text-slate-700 transition-colors border border-indigo-100"
                      data-testid={`prompt-${prompt.id}`}
                    >
                      <ChevronRight className="h-3 w-3 inline mr-2 text-indigo-400" />
                      {prompt.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Your thoughts</label>
              <Textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Write whatever's on your mind..."
                className="min-h-[200px] bg-gray-50 border-gray-200 rounded-xl focus:bg-white"
                data-testid="input-journal-text"
              />
            </div>
            
            <div className="flex gap-2">
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
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
                data-testid="button-save-entry"
              >
                {createEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEntry} onOpenChange={() => setViewingEntry(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewingEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {format(new Date(viewingEntry.date), "EEEE, MMMM d, yyyy")}
                  {viewingEntry.mood && (
                    <span className={`ml-auto flex items-center gap-1 text-sm ${
                      viewingEntry.mood === 'good' ? 'text-green-500' : 
                      viewingEntry.mood === 'okay' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {viewingEntry.mood === 'good' && <Smile className="h-4 w-4" />}
                      {viewingEntry.mood === 'okay' && <Meh className="h-4 w-4" />}
                      {viewingEntry.mood === 'tough' && <Frown className="h-4 w-4" />}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingEntry.rawText}</p>
                </div>

                {entryAnalysis?.summary && (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium text-slate-700">AI Summary</span>
                      </div>
                      <p className="text-slate-600 text-sm">{entryAnalysis.summary.summary}</p>
                    </div>

                    {entryAnalysis.summary.top3 && entryAnalysis.summary.top3.length > 0 && (
                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Top 3 Points</p>
                        <ul className="space-y-1">
                          {entryAnalysis.summary.top3.map((point, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-indigo-500 font-medium">{i + 1}.</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entryAnalysis.summary.nextSteps && entryAnalysis.summary.nextSteps.length > 0 && (
                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                        <p className="text-sm font-medium text-slate-700 mb-2">Suggested Next Steps</p>
                        <ul className="space-y-1">
                          {entryAnalysis.summary.nextSteps.map((step, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
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
                      const Icon = SIGNAL_ICONS[signal] || AlertTriangle;
                      return (
                        <span 
                          key={signal}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center gap-1"
                        >
                          <Icon className="h-3 w-3" />
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
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
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
