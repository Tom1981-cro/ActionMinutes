import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, User, Clock, FileText, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useUpdateActionItem } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";

interface ActionEditSheetProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionEditSheet({ item, open, onOpenChange }: ActionEditSheetProps) {
  const updateActionItem = useUpdateActionItem();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("open");
  const [reminderAt, setReminderAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item && open) {
      setText(item.text || "");
      setOwnerName(item.ownerName || "");
      setOwnerEmail(item.ownerEmail || "");
      setDueDate(item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "");
      setStatus(item.status || "open");
      setReminderAt(item.reminderAt ? format(new Date(item.reminderAt), "yyyy-MM-ddTHH:mm") : "");
      setNotes(item.notes || "");
    }
  }, [item, open]);

  const handleSave = async () => {
    if (!text.trim()) {
      toast({ title: "Error", description: "Task text is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    
    try {
      await updateActionItem.mutateAsync({
        id: item.id,
        updates: {
          text,
          ownerName: ownerName || null,
          ownerEmail: ownerEmail || null,
          dueDate: dueDate ? new Date(dueDate) : null,
          status,
          reminderAt: reminderAt ? new Date(reminderAt) : null,
          notes: notes || null,
          confidenceOwner: 1,
          confidenceDueDate: 1,
        }
      });
      
      toast({ title: "Saved", description: "Action item updated." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatus = async (newStatus: string) => {
    try {
      await updateActionItem.mutateAsync({
        id: item.id,
        updates: { status: newStatus }
      });
      toast({ title: `Marked as ${newStatus}` });
      if (newStatus === "done") {
        onOpenChange(false);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] rounded-t-3xl px-0 pb-0 md:h-auto md:max-h-[85vh] md:rounded-3xl md:inset-x-4 md:bottom-4 md:top-auto md:left-1/2 md:-translate-x-1/2 md:max-w-lg"
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 pb-4 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg text-slate-800">Edit Action</SheetTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant={status === "done" ? "default" : "outline"}
                onClick={() => handleQuickStatus("done")}
                className={`flex-1 h-10 rounded-xl ${status === "done" ? "bg-teal-500 hover:bg-teal-600" : "border-stone-200"}`}
              >
                Done
              </Button>
              <Button
                size="sm"
                variant={status === "open" ? "default" : "outline"}
                onClick={() => handleQuickStatus("open")}
                className={`flex-1 h-10 rounded-xl ${status === "open" ? "bg-teal-500 hover:bg-teal-600" : "border-stone-200"}`}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant={status === "waiting" ? "default" : "outline"}
                onClick={() => handleQuickStatus("waiting")}
                className={`flex-1 h-10 rounded-xl ${status === "waiting" ? "bg-amber-500 hover:bg-amber-600" : "border-stone-200"}`}
              >
                Waiting
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-base text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400" />
                Task
              </Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What needs to be done?"
                className="min-h-[100px] text-base rounded-2xl border-stone-200 p-4"
                data-testid="input-action-text"
              />
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-base text-slate-700 flex items-center gap-2">
                  <User className="h-4 w-4 text-stone-400" />
                  Owner Name
                </Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Who's responsible?"
                  className="h-12 text-base rounded-2xl border-stone-200"
                  data-testid="input-owner-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-slate-700">Owner Email</Label>
                <Input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="h-12 text-base rounded-2xl border-stone-200"
                  data-testid="input-owner-email"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stone-400" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 text-base rounded-2xl border-stone-200"
                  data-testid="input-due-date"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-stone-400" />
                  Reminder
                </Label>
                <Input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                  className="h-12 text-base rounded-2xl border-stone-200"
                  data-testid="input-reminder"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base text-slate-700">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context or details..."
                className="min-h-[80px] text-base rounded-2xl border-stone-200 p-4"
                data-testid="input-notes"
              />
            </div>
          </div>

          <div className="border-t border-stone-100 p-4 bg-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-2xl border-stone-200 text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !text.trim()}
                className="flex-1 h-12 rounded-2xl bg-teal-500 hover:bg-teal-600 text-base"
                data-testid="button-save-action"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
