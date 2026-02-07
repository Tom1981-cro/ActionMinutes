import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowLeft, CalendarBlank, Clock, User, EnvelopeSimple,
  Flag, Tag, MapPin, ArrowsClockwise, Timer, BellRinging,
  FloppyDisk, Trash, Lightning, Notepad, SpinnerGap, Hourglass
} from "@phosphor-icons/react";
import { format, addDays, addWeeks, startOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/skeleton-loader";

const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "text-red-500", bg: "bg-red-500/15 border-red-500/25" },
  { value: "high", label: "High", color: "text-orange-500", bg: "bg-orange-500/15 border-orange-500/25" },
  { value: "normal", label: "Normal", color: "text-blue-500", bg: "bg-blue-500/15 border-blue-500/25" },
  { value: "low", label: "Low", color: "text-emerald-500", bg: "bg-emerald-500/15 border-emerald-500/25" },
  { value: "optional", label: "Optional", color: "text-muted-foreground", bg: "bg-muted border-border" },
];

const STATUSES = [
  { value: "open", label: "Open", className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  { value: "needs_review", label: "Review", className: "bg-sky-500 hover:bg-sky-600 text-white" },
  { value: "done", label: "Done", className: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { value: "waiting", label: "Waiting", className: "bg-amber-500 hover:bg-amber-600 text-white" },
];

const RECURRENCE_OPTIONS = [
  { value: null as string | null, label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function ActionDetailPage() {
  const [, params] = useRoute("/app/action/:type/:id");
  const [, navigate] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const itemType = params?.type as "meeting" | "reminder";
  const itemId = params?.id || "";

  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("normal");
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [waitingFor, setWaitingFor] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: [itemType === "meeting" ? "action" : "reminder", itemId],
    queryFn: async () => {
      if (itemType === "meeting") {
        return api.actions.get(itemId);
      } else {
        const res = await authenticatedFetch(`/api/personal/reminders/${itemId}`);
        if (!res.ok) throw new Error("Not found");
        return res.json();
      }
    },
    enabled: !!itemId,
  });

  const { data: globalTags = [] } = useQuery<{ id: string; name: string; color: string | null }[]>({
    queryKey: ["global-tags"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tags");
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    if (item) {
      setText(item.text || "");
      setDescription(item.description || "");
      setOwnerName(item.ownerName || "");
      setOwnerEmail(item.ownerEmail || "");
      setDueDate(item.dueDate ? new Date(item.dueDate) : null);
      setDeadline(item.deadline ? new Date(item.deadline) : null);
      setStatus(item.status || "open");
      setPriority(item.priority || "normal");
      setReminderAt(item.reminderAt ? new Date(item.reminderAt) : null);
      setReminderTime(item.reminderAt ? format(new Date(item.reminderAt), "HH:mm") : "");
      setNotes(item.notes || "");
      setTags(item.tags || []);
      setLocation(item.location || "");
      setRecurrence(item.recurrence || null);
      setWaitingFor(item.waitingFor || "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!text.trim()) {
      toast({ title: "Error", description: "Task text is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, {
          text,
          ownerName: ownerName || null,
          ownerEmail: ownerEmail || null,
          dueDate: dueDate?.toISOString() || null,
          status,
          reminderAt: reminderAt?.toISOString() || null,
          notes: notes || null,
          tags,
          confidenceOwner: 1,
          confidenceDueDate: 1,
        });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            description: description || null,
            dueDate: dueDate?.toISOString() || null,
            deadline: deadline?.toISOString() || null,
            status,
            priority,
            reminderAt: reminderAt?.toISOString() || null,
            notes: notes || null,
            tags,
            location: location || null,
            recurrence: recurrence || null,
            waitingFor: waitingFor || null,
            isCompleted: status === "done",
            completedAt: status === "done" ? new Date().toISOString() : null,
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({ title: "Saved" });
      navigate("/app/inbox");
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (itemType === "meeting") {
        await api.actions.delete(itemId);
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "DELETE",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast({ title: "Deleted" });
      navigate("/app/inbox");
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <button onClick={() => navigate("/app/inbox")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </button>
        <SkeletonList count={1} type="action" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-5 pb-6">
        <button onClick={() => navigate("/app/inbox")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Inbox
        </button>
        <div className="text-center py-12 text-muted-foreground">Task not found.</div>
      </div>
    );
  }

  const priorityInfo = PRIORITIES.find(p => p.value === priority) || PRIORITIES[2];
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });

  return (
    <div className="space-y-5 pb-6 max-w-2xl mx-auto" data-testid="page-action-detail">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/app/inbox")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-inbox"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          Back to Inbox
        </button>
        <div className="flex items-center gap-1">
          {itemType === "meeting" && (
            <Badge variant="outline" className="text-[10px] rounded-full">
              <Lightning className="h-3 w-3 mr-0.5" weight="fill" />
              From meeting
            </Badge>
          )}
          {item.sourceType === "addaction" && (
            <Badge variant="outline" className="text-[10px] rounded-full">
              <Lightning className="h-3 w-3 mr-0.5" weight="fill" />
              AddAction
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap" data-testid="status-buttons">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={status === s.value ? "default" : "outline"}
            onClick={() => setStatus(s.value)}
            className={cn(
              "h-8 rounded-xl text-xs px-4",
              status === s.value ? s.className : "border-border"
            )}
            data-testid={`status-${s.value}`}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {status === "waiting" && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Hourglass className="h-3.5 w-3.5" weight="duotone" />
            Waiting for
          </Label>
          <Input
            value={waitingFor}
            onChange={(e) => setWaitingFor(e.target.value)}
            placeholder="Who or what are you waiting on?"
            className="h-9 text-sm rounded-xl"
            data-testid="input-waiting-for"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Notepad className="h-3.5 w-3.5" weight="duotone" />
          Task
        </Label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="min-h-[80px] text-sm rounded-xl"
          data-testid="input-action-text"
        />
      </div>

      {(itemType === "reminder" || description) && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="h-9 text-sm rounded-xl"
            data-testid="input-description"
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" weight="duotone" />
            Assigned to
          </Label>
          <Input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Who's responsible?"
            className="h-9 text-sm rounded-xl"
            data-testid="input-owner-name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <EnvelopeSimple className="h-3.5 w-3.5" weight="duotone" />
            Email
          </Label>
          <Input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="owner@example.com"
            className="h-9 text-sm rounded-xl"
            data-testid="input-owner-email"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CalendarBlank className="h-3.5 w-3.5" weight="duotone" />
            Due Date
          </Label>
          <Popover open={showDueDatePicker} onOpenChange={setShowDueDatePicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full h-9 px-3 rounded-xl border text-sm transition-colors text-left",
                  dueDate ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid="button-due-date"
              >
                <CalendarBlank className="h-3.5 w-3.5 flex-shrink-0" weight="duotone" />
                {dueDate ? format(dueDate, "d MMM yyyy") : "Set due date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <div className="p-2 space-y-0.5">
                {[
                  { label: "Today", date: today },
                  { label: "Tomorrow", date: tomorrow },
                  { label: "Next week", date: nextMonday },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-foreground"
                    onClick={() => { setDueDate(opt.date); setShowDueDatePicker(false); }}
                  >
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{format(opt.date, "EEE, d MMM")}</span>
                  </button>
                ))}
                {dueDate && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-destructive"
                    onClick={() => { setDueDate(null); setShowDueDatePicker(false); }}
                  >
                    Clear date
                  </button>
                )}
              </div>
              <div className="border-t border-border">
                <Calendar mode="single" selected={dueDate || undefined} onSelect={(d) => { if (d) setDueDate(d); }} className="p-2" />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" weight="duotone" />
            Deadline
          </Label>
          <Popover open={showDeadlinePicker} onOpenChange={setShowDeadlinePicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full h-9 px-3 rounded-xl border text-sm transition-colors text-left",
                  deadline ? "border-red-500/30 bg-red-500/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid="button-deadline"
              >
                <Timer className="h-3.5 w-3.5 flex-shrink-0" weight="duotone" />
                {deadline ? format(deadline, "d MMM yyyy") : "Set deadline"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <div className="p-2 space-y-0.5">
                {[
                  { label: "Today", date: today },
                  { label: "Tomorrow", date: tomorrow },
                  { label: "Next week", date: nextMonday },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-foreground"
                    onClick={() => { setDeadline(opt.date); setShowDeadlinePicker(false); }}
                  >
                    <span className="flex-1 text-left">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground">{format(opt.date, "EEE, d MMM")}</span>
                  </button>
                ))}
                {deadline && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-destructive"
                    onClick={() => { setDeadline(null); setShowDeadlinePicker(false); }}
                  >
                    Clear deadline
                  </button>
                )}
              </div>
              <div className="border-t border-border">
                <Calendar mode="single" selected={deadline || undefined} onSelect={(d) => { if (d) setDeadline(d); }} className="p-2" />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <BellRinging className="h-3.5 w-3.5" weight="duotone" />
            Reminder
          </Label>
          <Popover open={showReminderPicker} onOpenChange={setShowReminderPicker}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 w-full h-9 px-3 rounded-xl border text-sm transition-colors text-left",
                  reminderAt ? "border-amber-500/30 bg-amber-500/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid="button-reminder"
              >
                <BellRinging className="h-3.5 w-3.5 flex-shrink-0" weight="duotone" />
                {reminderAt ? format(reminderAt, "d MMM yyyy HH:mm") : "Set reminder"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <div className="p-2 space-y-0.5">
                {[
                  { label: "In 30 minutes", getDate: () => { const d = new Date(); d.setMinutes(d.getMinutes() + 30); return d; } },
                  { label: "In 1 hour", getDate: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
                  { label: "Tomorrow 9am", getDate: () => { const d = addDays(new Date(), 1); d.setHours(9, 0, 0, 0); return d; } },
                  { label: "Next Monday 9am", getDate: () => { const d = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }); d.setHours(9, 0, 0, 0); return d; } },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-foreground"
                    onClick={() => { const d = opt.getDate(); setReminderAt(d); setReminderTime(format(d, "HH:mm")); setShowReminderPicker(false); }}
                  >
                    <BellRinging className="h-3.5 w-3.5 text-amber-500" weight="duotone" />
                    <span className="flex-1 text-left">{opt.label}</span>
                  </button>
                ))}
                {reminderAt && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors text-destructive"
                    onClick={() => { setReminderAt(null); setReminderTime(""); setShowReminderPicker(false); }}
                  >
                    Clear reminder
                  </button>
                )}
              </div>
              <div className="border-t border-border">
                <Calendar mode="single" selected={reminderAt || undefined} onSelect={(d) => { if (d) setReminderAt(d); }} className="p-2" />
              </div>
              <div className="border-t border-border p-2">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" weight="duotone" />
                  <span className="flex-1">Time</span>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="bg-transparent border-none text-xs text-foreground focus:outline-none w-20"
                    data-testid="input-reminder-time"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5" weight="duotone" />
            Priority
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                  priority === p.value
                    ? `${p.bg} ${p.color}`
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid={`priority-${p.value}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ArrowsClockwise className="h-3.5 w-3.5" weight="duotone" />
            Repeat
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setRecurrence(opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors",
                  recurrence === opt.value
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid={`recurrence-${opt.value || "none"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" weight="duotone" />
            Location
          </Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add location..."
            className="h-9 text-sm rounded-xl"
            data-testid="input-location"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5" weight="duotone" />
          Tags
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {globalTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                setTags(prev => prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]);
              }}
              className={cn(
                "px-2.5 py-1 rounded-full border text-xs font-medium transition-colors",
                tags.includes(tag.name)
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
              data-testid={`tag-${tag.name}`}
            >
              #{tag.name}
            </button>
          ))}
          {globalTags.length === 0 && (
            <span className="text-xs text-muted-foreground">No tags available</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Notepad className="h-3.5 w-3.5" weight="duotone" />
          Notes
        </Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional context or details..."
          className="min-h-[80px] text-sm rounded-xl"
          data-testid="input-notes"
        />
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 px-3"
          data-testid="button-delete-action"
        >
          {isDeleting ? <SpinnerGap className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" weight="duotone" />}
        </Button>
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={() => navigate("/app/inbox")}
          className="h-9 rounded-xl text-sm"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !text.trim()}
          className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-6"
          data-testid="button-save-action"
        >
          {isSaving ? <SpinnerGap className="h-4 w-4 animate-spin mr-1.5" /> : <FloppyDisk className="h-4 w-4 mr-1.5" weight="duotone" />}
          Save
        </Button>
      </div>
    </div>
  );
}
