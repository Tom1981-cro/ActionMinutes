import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function CapturePage() {
  const [location, setLocation] = useLocation();
  const { addMeeting, extractMeeting } = useStore();
  const { toast } = useToast();
  
  // Parse query param manually since wouter's useSearch is minimal
  const searchParams = new URLSearchParams(window.location.search);
  const existingId = searchParams.get("id");

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
    const id = addMeeting({
      title,
      date: new Date(date).toISOString(),
      rawNotes: notes,
      attendees: attendees.split(",").map((n, i) => ({ id: i.toString(), name: n.trim() })),
    });
    
    // Trigger extraction (async)
    extractMeeting(id); // Fire and forget in store, UI will update via redirect
    
    toast({ title: "Processing...", description: "AI is extracting actions." });
    
    // Wait a sec for effect then redirect
    setTimeout(() => {
      setIsSubmitting(false);
      setLocation(`/meeting/${id}`);
    }, 500);
  };

  const handleSaveDraft = () => {
    addMeeting({
      title,
      date: new Date(date).toISOString(),
      rawNotes: notes,
    });
    toast({ title: "Saved draft", description: "Meeting saved without extraction." });
    setLocation("/meetings");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Capture Meeting</h1>
      </div>

      <div className="grid gap-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="bg-card"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="attendees">Attendees (comma separated)</Label>
          <Input 
            id="attendees" 
            placeholder="Alice, Bob, Charlie..." 
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            className="bg-card"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
             <Label htmlFor="notes">Raw Notes <span className="text-red-500">*</span></Label>
             <span className="text-xs text-muted-foreground">Just dump everything here.</span>
          </div>
          <Textarea 
            id="notes" 
            placeholder="Paste notes here… action items, decisions, messy bullets—everything." 
            className="min-h-[300px] font-mono text-sm leading-relaxed bg-card p-4 resize-y shadow-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button 
            size="lg" 
            className="flex-1 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
            onClick={handleExtract}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>Processing...</>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Extract actions
              </>
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={handleSaveDraft} disabled={isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
        </div>
      </div>
    </div>
  );
}
