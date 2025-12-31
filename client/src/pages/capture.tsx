import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCreateMeeting, useExtractMeeting } from "@/lib/hooks";

export default function CapturePage() {
  const [, setLocation] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const extractMeeting = useExtractMeeting();

  const [title, setTitle] = useState(`Meeting — ${format(new Date(), "MMM d")}`);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExtract = async () => {
    if (!notes.trim()) {
      toast({ title: "No notes", description: "Please add some notes first.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const meeting = await createMeeting.mutateAsync({
        userId: user.id,
        title,
        date: new Date(date),
        rawNotes: notes,
        parseState: 'draft',
      });
      
      await extractMeeting.mutateAsync(meeting.id);
      
      toast({ title: "Processing...", description: "AI is extracting actions." });
      
      setTimeout(() => {
        setIsSubmitting(false);
        setLocation(`/meeting/${meeting.id}`);
      }, 500);
    } catch (error) {
      setIsSubmitting(false);
      toast({ title: "Error", description: "Failed to create meeting", variant: "destructive" });
    }
  };

  const handleSaveDraft = async () => {
    try {
      await createMeeting.mutateAsync({
        userId: user.id,
        title,
        date: new Date(date),
        rawNotes: notes,
        parseState: 'draft',
      });
      toast({ title: "Saved draft", description: "Meeting saved without extraction." });
      setLocation("/meetings");
    } catch (error) {
      toast({ title: "Error", description: "Failed to save meeting", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")} className="rounded-full" data-testid="button-back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">Capture Meeting</h1>
      </div>

      <div className="grid gap-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700">Title <span className="text-teal-500">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="bg-white border-stone-200 rounded-2xl"
              data-testid="input-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date" className="text-slate-700">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-white border-stone-200 rounded-2xl"
              data-testid="input-date"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="attendees" className="text-slate-700">Attendees (comma separated)</Label>
          <Input 
            id="attendees" 
            placeholder="Alice, Bob, Charlie..." 
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            className="bg-white border-stone-200 rounded-2xl"
            data-testid="input-attendees"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
             <Label htmlFor="notes" className="text-slate-700">Raw Notes <span className="text-teal-500">*</span></Label>
             <span className="text-xs text-stone-500">Just dump everything here.</span>
          </div>
          <Textarea 
            id="notes" 
            placeholder="Paste notes here… action items, decisions, messy bullets—everything." 
            className="min-h-[300px] font-mono text-sm leading-relaxed bg-white p-4 resize-y border-stone-200 rounded-2xl"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="textarea-notes"
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="flex-1 text-base rounded-2xl bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all" 
            onClick={handleExtract}
            disabled={isSubmitting}
            data-testid="button-extract"
          >
            {isSubmitting ? (
              "Processing..."
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Extract Actions
              </>
            )}
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={handleSaveDraft}
            className="rounded-2xl border-stone-300"
            data-testid="button-save-draft"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        </div>
      </div>
    </div>
  );
}
