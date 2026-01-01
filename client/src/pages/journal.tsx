import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, Plus, Loader2, Smile, Meh, Frown, Sparkles, X, ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SMART_PROMPTS = [
  { category: "reflection", text: "What went well today and what could be better?" },
  { category: "gratitude", text: "What are three things you're grateful for right now?" },
  { category: "goals", text: "What's one thing you want to accomplish this week?" },
  { category: "challenges", text: "What's a challenge you're facing and how might you address it?" },
];

const MOOD_OPTIONS = [
  { value: "good", icon: Smile, label: "Good", color: "text-green-500" },
  { value: "okay", icon: Meh, label: "Okay", color: "text-amber-500" },
  { value: "tough", icon: Frown, label: "Tough", color: "text-red-500" },
];

export default function JournalPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [newText, setNewText] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/journal?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load journal');
      return res.json();
    },
    enabled: !!user.id && user.isAuthenticated,
  });
  
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
      toast({ title: "Entry saved" });
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
  
  const selectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setNewText(prev => prev ? `${prev}\n\n${prompt}\n` : `${prompt}\n`);
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
            <Card key={entry.id} className="bg-white border-gray-200 rounded-xl overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {format(new Date(entry.date), "EEEE, MMM d")}
                  </span>
                  {entry.mood && (
                    <span className={`flex items-center gap-1 text-sm ${
                      entry.mood === 'good' ? 'text-green-500' : 
                      entry.mood === 'okay' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {entry.mood === 'good' && <Smile className="h-4 w-4" />}
                      {entry.mood === 'okay' && <Meh className="h-4 w-4" />}
                      {entry.mood === 'tough' && <Frown className="h-4 w-4" />}
                      {entry.mood}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 whitespace-pre-wrap line-clamp-4">
                  {entry.rawText}
                </p>
                {entry.promptUsed && (
                  <p className="text-xs text-indigo-500 italic">
                    Prompt: {entry.promptUsed}
                  </p>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">How are you feeling?</label>
              <div className="flex gap-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => setSelectedMood(mood.value)}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                      selectedMood === mood.value 
                        ? 'border-indigo-500 bg-indigo-50' 
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Need a prompt?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SMART_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => selectPrompt(prompt.text)}
                    className="text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3 inline mr-1 text-gray-400" />
                    {prompt.text.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>
            
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
                disabled={createEntry.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
                data-testid="button-save-entry"
              >
                {createEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
