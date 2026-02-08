import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar, User, Clock, FileText, X, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useUpdateActionItem } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ActionEditSheetProps {
  item: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActionEditSheet({ item, open, onOpenChange }: ActionEditSheetProps) {
  const updateActionItem = useUpdateActionItem();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("open");
  const [reminderAt, setReminderAt] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (item && open) {
      setText(item.title || item.text || "");
      setOwnerName(item.ownerName || "");
      setOwnerEmail(item.ownerEmail || "");
      setDueDate(item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "");
      setStatus(item.status || "open");
      setReminderAt(item.reminderAt ? format(new Date(item.reminderAt), "yyyy-MM-ddTHH:mm") : "");
      setNotes(item.notes || "");
      setRecurrence(item.recurrence || "none");
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
          recurrence: recurrence === "none" ? null : recurrence,
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

  const handleQuickStatus = (newStatus: string) => {
    setStatus(newStatus);
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    setIsDeleting(true);
    try {
      await api.actions.delete(item.id);
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast({ title: "Deleted", description: "Action item removed." });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete action item", variant: "destructive" });
    } finally {
      setIsDeleting(false);
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
          <SheetHeader className="px-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg text-foreground">Edit Action</SheetTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant={status === "done" ? "default" : "outline"}
                onClick={() => handleQuickStatus("done")}
                className={`flex-1 h-10 rounded-xl ${status === "done" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-border text-emerald-600 dark:text-emerald-400"}`}
              >
                Done
              </Button>
              <Button
                size="sm"
                variant={status === "open" || status === "needs_review" ? "default" : "outline"}
                onClick={() => handleQuickStatus("open")}
                className={`flex-1 h-10 rounded-xl ${status === "open" || status === "needs_review" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-border text-primary"}`}
              >
                Open
              </Button>
              <Button
                size="sm"
                variant={status === "waiting" ? "default" : "outline"}
                onClick={() => handleQuickStatus("waiting")}
                className={`flex-1 h-10 rounded-xl ${status === "waiting" ? "bg-amber-500 hover:bg-amber-600 text-white" : "border-border text-amber-600 dark:text-amber-400"}`}
              >
                Waiting
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <div className="space-y-2">
              <Label className="text-base text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Task
              </Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What needs to be done?"
                className="min-h-[100px] text-base rounded-2xl border-border p-4"
                data-testid="input-action-text"
              />
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-base text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Owner Name
                </Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Who's responsible?"
                  className="h-12 text-base rounded-2xl border-border"
                  data-testid="input-owner-name"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-foreground">Owner Email</Label>
                <Input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="h-12 text-base rounded-2xl border-border"
                  data-testid="input-owner-email"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-base text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 text-base rounded-2xl border-border"
                  data-testid="input-due-date"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Reminder
                </Label>
                <Input
                  type="datetime-local"
                  value={reminderAt}
                  onChange={(e) => setReminderAt(e.target.value)}
                  className="h-12 text-base rounded-2xl border-border"
                  data-testid="input-reminder"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base text-foreground">Repeat</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="h-12 text-base rounded-2xl border-border" data-testid="select-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No repeat</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base text-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional context or details..."
                className="min-h-[80px] text-base rounded-2xl border-border p-4"
                data-testid="input-notes"
              />
            </div>
          </div>

          <div className="border-t border-border p-4 bg-card" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 px-4"
                data-testid="button-delete-action"
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-2xl border-border text-base"
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
