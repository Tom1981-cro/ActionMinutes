import { useState } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, ArrowLeft, ChevronDown, ChevronUp, Users, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCreateMeeting, useExtractMeeting } from "@/lib/hooks";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [time, setTime] = useState("");
  const [location, setLocationValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const hasDetails = attendees || time || location;

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto pb-28 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/meetings")} 
              className="rounded-full h-11 w-11 shrink-0" 
              data-testid="button-back"
              aria-label="Go back to meetings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">New Meeting</h1>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium text-slate-600">Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="bg-muted border-border rounded-xl h-12 text-base px-4 focus:bg-card"
                placeholder="What's this meeting about?"
                data-testid="input-title"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium text-slate-600">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="bg-muted border-border rounded-xl h-12 text-base px-4 focus:bg-card"
                data-testid="input-date"
              />
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button 
                  className="flex items-center justify-between w-full py-2 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
                  data-testid="button-toggle-details"
                >
                  <span className="flex items-center gap-2">
                    {hasDetails ? (
                      <span className="text-primary font-medium">Details added</span>
                    ) : (
                      <>Add details (optional)</>
                    )}
                  </span>
                  {detailsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="attendees" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Attendees
                  </Label>
                  <Input 
                    id="attendees" 
                    placeholder="Alice, Bob, Charlie..." 
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    className="bg-muted border-border rounded-xl h-12 text-base px-4 focus:bg-card"
                    data-testid="input-attendees"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="time" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Time
                    </Label>
                    <Input 
                      id="time" 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-muted border-border rounded-xl h-12 text-base px-4 focus:bg-card"
                      data-testid="input-time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Location
                    </Label>
                    <Input 
                      id="location" 
                      placeholder="Room / Link"
                      value={location}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="bg-muted border-border rounded-xl h-12 text-base px-4 focus:bg-card"
                      data-testid="input-location"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="notes" className="text-base font-semibold text-slate-800">Meeting Notes</Label>
              <span className="text-xs text-muted-foreground">Paste or type everything</span>
            </div>
            <Textarea 
              id="notes" 
              placeholder="Paste your notes here...

• Action items
• Decisions made  
• Discussion points
• Follow-ups needed

Just dump everything—AI will sort it out." 
              className="min-h-[320px] md:min-h-[360px] font-mono text-base leading-relaxed bg-card p-4 resize-y border-border rounded-2xl focus:ring-2 focus:ring-ring/20 focus:border-primary"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-notes"
            />
          </div>

          <div className="hidden md:flex items-center gap-3 pt-2">
            <Button 
              size="lg" 
              className="flex-1 text-base h-14 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" 
              onClick={handleExtract}
              disabled={isSubmitting}
              data-testid="button-extract-desktop"
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
              className="h-14 rounded-2xl border-border"
              data-testid="button-save-draft-desktop"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border p-4 pb-safe z-50">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            className="h-12 px-4 rounded-xl border-border shrink-0"
            data-testid="button-save-draft"
          >
            <Save className="h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            className="flex-1 text-base h-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" 
            onClick={handleExtract}
            disabled={isSubmitting || !notes.trim()}
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
        </div>
      </div>
    </div>
  );
}
