import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DatePickerModal } from "@/components/date-picker-modal";
import {
  X, Circle, CheckCircle, Sparkle, Paperclip, UploadSimple,
  User, CalendarBlank, Flag, Tag, Plus, Trash, ListChecks,
  Clock, SpinnerGap, Hourglass, EnvelopeSimple, MapPin,
  ArrowsClockwise, Timer, BellRinging, FloppyDisk, Notepad,
  Lightning, Tray, ListBullets, CaretDown
} from "@phosphor-icons/react";

const PRIORITIES = [
  { value: "high", label: "High", color: "text-red-500", bg: "bg-red-500/15 border-red-500/25" },
  { value: "normal", label: "Normal", color: "text-amber-500", bg: "bg-amber-500/15 border-amber-500/25" },
  { value: "low", label: "Low", color: "text-emerald-500", bg: "bg-emerald-500/15 border-emerald-500/25" },
  { value: "none", label: "None", color: "text-muted-foreground", bg: "bg-muted border-border" },
];

const STATUSES = [
  { value: "open", label: "Open", className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  { value: "needs_review", label: "Review", className: "bg-sky-500 hover:bg-sky-600 text-white" },
  { value: "done", label: "Done", className: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  { value: "waiting", label: "Waiting", className: "bg-amber-500 hover:bg-amber-600 text-white" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const REMINDER_LABELS: Record<string, string> = {
  on_time: "On time",
  "5_min": "5 min early",
  "30_min": "30 min early",
  "1_hour": "1 hour early",
  "1_day": "1 day early",
  custom: "Custom",
  none: "None",
};

const ALLOWED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.md,.png,.jpg,.jpeg,.gif,.webp";

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemType: "meeting" | "reminder";
}

export function TaskDetailModal({ open, onClose, itemId, itemType }: TaskDetailModalProps) {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("none");
  const [reminder, setReminder] = useState("on_time");
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [repeatEnds, setRepeatEnds] = useState("endless");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [repeatEndCount, setRepeatEndCount] = useState<number | null>(null);
  const [waitingFor, setWaitingFor] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [customReminderDate, setCustomReminderDate] = useState("");
  const [customReminderTime, setCustomReminderTime] = useState("09:00");

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
    enabled: !!itemId && open,
  });

  const { data: fetchedAttachments = [] } = useQuery({
    queryKey: ["attachments", itemType, itemId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/attachments?parentType=${itemType === "meeting" ? "action_item" : "reminder"}&parentId=${itemId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!itemId && open,
  });

  const { data: globalTags = [] } = useQuery<{ id: string; name: string; color: string | null }[]>({
    queryKey: ["global-tags"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tags");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const listApiBase = itemType === "meeting" ? "actions" : "reminders";
  const { data: reminderListInfo } = useQuery<{ listId: string | null; listName: string | null; listIcon: string | null }>({
    queryKey: ["item-list", itemType, itemId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/${listApiBase}/${itemId}/list`);
      if (!res.ok) return { listId: null, listName: null, listIcon: null };
      return res.json();
    },
    enabled: !!itemId && open,
  });

  const { data: allLists = [] } = useQuery<{ id: string; name: string; icon?: string }[]>({
    queryKey: ["custom-lists"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/lists");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const moveToList = useMutation({
    mutationFn: async (targetListId: string | null) => {
      const res = await authenticatedFetch(`/api/${listApiBase}/${itemId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetListId }),
      });
      if (!res.ok) throw new Error("Failed to move");
      return res.json();
    },
    onSuccess: (data) => {
      invalidateAll();
      setListDropdownOpen(false);
      toast({ title: data.listId ? `Moved to ${data.listName}` : "Moved to Inbox" });
    },
    onError: () => {
      toast({ title: "Failed to move task", variant: "destructive" });
    },
  });

  const currentListId = reminderListInfo?.listId || null;
  const currentListName = reminderListInfo?.listName || null;

  useEffect(() => {
    setText("");
    setDescription("");
    setOwnerName("");
    setOwnerEmail("");
    setDueDate(null);
    setDueTime("");
    setEndDate(null);
    setEndTime("");
    setAllDay(false);
    setDeadline(null);
    setDeadlineInput("");
    setStatus("open");
    setPriority("none");
    setReminder("on_time");
    setReminderAt(null);
    setNotes("");
    setTags([]);
    setLocation("");
    setRecurrence(null);
    setRepeatEnds("endless");
    setRepeatEndDate(null);
    setRepeatEndCount(null);
    setWaitingFor("");
    setSubtasks([]);
    setNewSubtaskText("");
  }, [itemId]);

  useEffect(() => {
    if (item) {
      setText(item.text || "");
      setDescription(item.description || "");
      setOwnerName(item.ownerName || "");
      setOwnerEmail(item.ownerEmail || "");
      setDueDate(item.dueDate ? new Date(item.dueDate) : null);
      setDueTime(item.dueDate ? format(new Date(item.dueDate), "HH:mm") : "");
      setDeadline(item.deadline ? new Date(item.deadline) : null);
      setDeadlineInput(item.deadline ? format(new Date(item.deadline), "yyyy-MM-dd") : "");
      setStatus(item.status || "open");
      const p = item.priority || "none";
      setPriority(["high", "normal", "low", "none"].includes(p) ? p : "none");
      setReminderAt(item.reminderAt ? new Date(item.reminderAt) : null);
      setReminder(item.reminderMode || "on_time");
      setNotes(item.notes || "");
      setTags(item.tags || []);
      setLocation(item.location || "");
      setRecurrence(item.recurrence || null);
      setWaitingFor(item.waitingFor || "");

      if (item.reminderAt) {
        const ra = new Date(item.reminderAt);
        setCustomReminderDate(format(ra, "yyyy-MM-dd"));
        setCustomReminderTime(format(ra, "HH:mm"));
      }

      const existingSubtasks = parseSubtasks(item.description || item.notes || "");
      if (existingSubtasks.length > 0) {
        setSubtasks(existingSubtasks);
      }
    }
  }, [item]);

  useEffect(() => {
    if (reminder === "custom") {
      setShowCustomReminderPicker(true);
    }
  }, [reminder]);

  const parseSubtasks = (text: string): Subtask[] => {
    const lines = text.split("\n");
    const tasks: Subtask[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (match) {
        tasks.push({
          id: crypto.randomUUID(),
          text: match[2].trim(),
          completed: match[1] !== " ",
        });
      }
    }
    return tasks;
  };

  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const subtaskProgress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    queryClient.invalidateQueries({ queryKey: ["reminders", user.id] });
    queryClient.invalidateQueries({ queryKey: ["actioned"] });
    queryClient.invalidateQueries({ queryKey: ["deleted"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
    queryClient.invalidateQueries({ queryKey: ["custom-list"] });
    queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
    queryClient.invalidateQueries({ queryKey: ["item-list", itemType, itemId] });
    queryClient.invalidateQueries({ queryKey: [itemType === "meeting" ? "action" : "reminder", itemId] });
  };

  const combineDateTime = (date: Date | null, time: string): Date | null => {
    if (!date) return null;
    const result = new Date(date);
    if (time) {
      const [h, m] = time.split(":").map(Number);
      result.setHours(h, m, 0, 0);
    }
    return result;
  };

  const handleDatePickerConfirm = (values: any) => {
    setDueDate(values.date);
    setDueTime(values.time);
    setEndDate(values.endDate);
    setEndTime(values.endTime);
    setAllDay(values.allDay);
    setReminder(values.reminder);
    setRecurrence(values.recurrence);
    setRepeatEnds(values.repeatEnds);
    setRepeatEndDate(values.repeatEndDate);
    setRepeatEndCount(values.repeatEndCount);
  };

  const handleDatePickerClear = () => {
    setDueDate(null);
    setDueTime("");
    setEndDate(null);
    setEndTime("");
    setAllDay(false);
    setReminder("on_time");
    setRecurrence(null);
    setRepeatEnds("endless");
    setRepeatEndDate(null);
    setRepeatEndCount(null);
  };

  const getDurationLabel = () => {
    if (!dueDate || !endDate) return null;
    const start = combineDateTime(dueDate, dueTime);
    const end = combineDateTime(endDate, endTime);
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const diffMin = Math.round(diffMs / 60000);
    if (allDay) return "All day";
    if (diffMin < 60) return `${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      const finalDueDate = combineDateTime(dueDate, dueTime);
      const finalDeadline = deadline;
      const computedReminderAt = reminder === "custom" && customReminderDate
        ? new Date(`${customReminderDate}T${customReminderTime || "09:00"}:00`).toISOString()
        : reminderAt?.toISOString() || null;

      if (itemType === "meeting") {
        await api.actions.update(itemId, {
          text,
          ownerName: ownerName || null,
          ownerEmail: ownerEmail || null,
          dueDate: finalDueDate?.toISOString() || null,
          status,
          reminderAt: computedReminderAt,
          notes: description || notes || null,
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
            dueDate: finalDueDate?.toISOString() || null,
            deadline: finalDeadline?.toISOString() || null,
            status,
            priority: priority === "none" ? "normal" : priority,
            reminderAt: computedReminderAt,
            reminderMode: reminder || null,
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
      invalidateAll();
      toast({ title: "Saved" });
      onClose();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
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
      invalidateAll();
      toast({ title: "Deleted" });
      onClose();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, { status: "done" });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: true, status: "done" }),
        });
      }
      invalidateAll();
      toast({ title: "Completed" });
      onClose();
    } catch {
      toast({ title: "Failed to complete", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    setSubtasks(prev => [...prev, { id: crypto.randomUUID(), text: newSubtaskText.trim(), completed: false }]);
    setNewSubtaskText("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("parentType", itemType === "meeting" ? "action_item" : "reminder");
        formData.append("parentId", itemId);
        const res = await authenticatedFetch("/api/attachments", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["attachments", itemType, itemId] });
      toast({ title: "Uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await authenticatedFetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: ["attachments", itemType, itemId] });
      toast({ title: "Removed" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) return "📄";
    if (["doc", "docx"].includes(ext)) return "📝";
    if (["xls", "xlsx"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📽";
    if (["md"].includes(ext)) return "📑";
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼";
    return "📎";
  };

  const createdAtLabel = useMemo(() => {
    if (!item?.createdAt) return null;
    try {
      return format(new Date(item.createdAt), "MMM d, yyyy");
    } catch {
      return null;
    }
  }, [item?.createdAt]);

  if (!open) return null;

  const isCompleted = status === "done" || item?.isCompleted;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      data-testid="task-detail-overlay"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[960px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-testid="task-detail-modal"
      >
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Popover open={listDropdownOpen} onOpenChange={setListDropdownOpen}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[11px] transition-colors",
                    currentListId ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}
                  data-testid="button-list-picker"
                >
                  {currentListId ? (
                    <ListBullets className="h-3.5 w-3.5" />
                  ) : (
                    <Tray className="h-3.5 w-3.5" />
                  )}
                  <span className="truncate max-w-[120px]">{currentListName || "Inbox"}</span>
                  <CaretDown className="h-3 w-3 flex-shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5" align="start">
                <div className="space-y-0.5">
                  <button
                    onClick={() => currentListId && moveToList.mutate(null)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left",
                      !currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                    )}
                    data-testid="move-to-inbox"
                  >
                    <Tray className="h-3.5 w-3.5" />
                    Inbox
                    {!currentListId && <span className="ml-auto text-[10px] text-primary">current</span>}
                  </button>
                  {allLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => list.id !== currentListId && moveToList.mutate(list.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left",
                        list.id === currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                      )}
                      data-testid={`move-to-list-${list.id}`}
                    >
                      <ListBullets className="h-3.5 w-3.5" />
                      {list.name}
                      {list.id === currentListId && <span className="ml-auto text-[10px] text-primary">current</span>}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {itemType === "meeting" && item?.meetingId && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/30 font-semibold">
                <Lightning className="h-3 w-3" weight="fill" />
                From meeting
              </span>
            )}
            {createdAtLabel && (
              <span className="text-[11px] text-muted-foreground">Created {createdAtLabel}</span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <SpinnerGap className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* LEFT PANEL */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 min-w-0">
                <div className="flex items-start gap-3">
                  <button
                    onClick={handleComplete}
                    className={cn(
                      "flex-shrink-0 mt-0.5 transition-colors",
                      isCompleted ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
                    )}
                    data-testid="button-toggle-complete"
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" weight="fill" />
                    ) : (
                      <Circle className="h-6 w-6" weight="regular" />
                    )}
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="text-base font-semibold text-foreground bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
                    placeholder="Task title..."
                    data-testid="input-task-title"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Description
                    </h3>
                    <button className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors" data-testid="button-refine-ai">
                      <Sparkle className="h-3.5 w-3.5" weight="fill" />
                      Refine with AI
                    </button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[70px] resize-none border-none bg-transparent px-0 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none"
                    data-testid="textarea-description"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ListChecks className="h-3.5 w-3.5" />
                      Subtasks
                    </h3>
                    <span className="text-[11px] text-muted-foreground">{subtaskProgress}% Done</span>
                  </div>

                  {subtasks.length > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${subtaskProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    {subtasks.map(st => (
                      <div key={st.id} className="flex items-center gap-2 group/subtask py-1">
                        <Checkbox
                          checked={st.completed}
                          onCheckedChange={() => toggleSubtask(st.id)}
                          data-testid={`subtask-check-${st.id}`}
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          st.completed && "line-through text-muted-foreground"
                        )}>
                          {st.text}
                        </span>
                        <button
                          onClick={() => removeSubtask(st.id)}
                          className="opacity-0 group-hover/subtask:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                          data-testid={`subtask-delete-${st.id}`}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
                      placeholder="Add a step... (Press Enter)"
                      className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                      data-testid="input-new-subtask"
                    />
                    <button
                      className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                      data-testid="button-ai-breakdown"
                    >
                      <Sparkle className="h-3.5 w-3.5" weight="fill" />
                      AI Breakdown
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Notepad className="h-3.5 w-3.5" />
                      Notes
                    </h3>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                      data-testid="button-attach-file"
                    >
                      {isUploading ? (
                        <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UploadSimple className="h-3.5 w-3.5" />
                      )}
                      Attach
                    </button>
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional context or details..."
                    className="min-h-[60px] resize-none border-none bg-transparent px-0 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none"
                    data-testid="input-notes"
                  />
                </div>

                {fetchedAttachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments ({fetchedAttachments.length})
                    </h3>
                    <div className="space-y-1">
                      {fetchedAttachments.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-accent/30 text-sm group/att"
                          data-testid={`attachment-${att.id}`}
                        >
                          <span className="text-sm">{getFileIcon(att.filename || att.fileName || att.name || "file")}</span>
                          <span className="flex-1 truncate text-foreground text-[12px]">
                            {att.filename || att.fileName || att.name || "Attachment"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {att.size ? `${Math.round(att.size / 1024)}KB` : ""}
                          </span>
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="opacity-0 group-hover/att:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            data-testid={`attachment-delete-${att.id}`}
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_FILE_TYPES}
                  className="hidden"
                  onChange={handleFileUpload}
                  multiple
                />
              </div>

              {/* RIGHT PANEL */}
              <div className="w-[300px] flex-shrink-0 border-l border-border bg-accent/20 overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setStatus(s.value)}
                          className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors",
                            status === s.value ? s.className : "bg-muted text-muted-foreground hover:bg-accent border border-transparent"
                          )}
                          data-testid={`status-${s.value}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {status === "waiting" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Hourglass className="h-3 w-3" />
                        Waiting For
                      </label>
                      <Input
                        value={waitingFor}
                        onChange={(e) => setWaitingFor(e.target.value)}
                        placeholder="Who or what?"
                        className="h-7 text-[11px] rounded-lg"
                        data-testid="input-waiting-for"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Assignee
                    </label>
                    <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2.5 py-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
                        {(ownerName || "?")[0].toUpperCase()}
                      </div>
                      <input
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="bg-transparent border-none outline-none text-[11px] text-foreground w-full"
                        placeholder="Unassigned"
                        data-testid="input-assignee"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <EnvelopeSimple className="h-3 w-3" />
                      Email
                    </label>
                    <Input
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="h-7 text-[11px] rounded-lg"
                      data-testid="input-owner-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <CalendarBlank className="h-3 w-3" />
                      Due Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className={cn(
                        "flex items-center gap-2 w-full h-7 px-2.5 rounded-lg border text-[11px] transition-colors text-left",
                        dueDate ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                      data-testid="button-due-date"
                    >
                      <CalendarBlank className="h-3.5 w-3.5 flex-shrink-0" />
                      {dueDate ? `${format(dueDate, "d MMM yyyy")}${dueTime ? ` ${dueTime}` : ""}` : "Set due date"}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Duration
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className={cn(
                        "flex items-center gap-2 w-full h-7 px-2.5 rounded-lg border text-[11px] transition-colors text-left",
                        getDurationLabel() ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                      )}
                      data-testid="button-duration"
                    >
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      {getDurationLabel() || "Set duration"}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      Deadline
                    </label>
                    <Popover open={showDeadlinePicker} onOpenChange={setShowDeadlinePicker}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-2 w-full h-7 px-2.5 rounded-lg border text-[11px] transition-colors text-left",
                            deadline ? "border-red-500/30 bg-red-500/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                          )}
                          data-testid="button-deadline"
                        >
                          <Timer className="h-3.5 w-3.5 flex-shrink-0" />
                          {deadline ? format(deadline, "d MMM yyyy") : "Set deadline"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-card border-border rounded-xl overflow-hidden" align="start">
                        <Calendar
                          mode="single"
                          selected={deadline ?? undefined}
                          onSelect={(d) => {
                            setDeadline(d ?? null);
                            setDeadlineInput(d ? format(d, "yyyy-MM-dd") : "");
                            setShowDeadlinePicker(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <BellRinging className="h-3 w-3" />
                      Reminder
                    </label>
                    <Select value={reminder} onValueChange={(v) => setReminder(v)}>
                      <SelectTrigger className="h-7 text-[11px] rounded-lg" data-testid="select-reminder">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REMINDER_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {reminder === "custom" && (
                      <div className="space-y-1.5 mt-1">
                        <div className="flex gap-1">
                          <Input
                            type="date"
                            value={customReminderDate}
                            onChange={(e) => setCustomReminderDate(e.target.value)}
                            className="h-7 text-[11px] rounded-lg flex-1"
                            data-testid="input-custom-reminder-date"
                          />
                          <Input
                            type="time"
                            value={customReminderTime}
                            onChange={(e) => setCustomReminderTime(e.target.value)}
                            className="h-7 text-[11px] rounded-lg w-24"
                            data-testid="input-custom-reminder-time"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <ArrowsClockwise className="h-3 w-3" />
                      Repeat
                    </label>
                    <Select value={recurrence || "none"} onValueChange={(v) => setRecurrence(v === "none" ? null : v)}>
                      <SelectTrigger className="h-7 text-[11px] rounded-lg" data-testid="select-recurrence">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Flag className="h-3 w-3" />
                      Priority
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors",
                            priority === p.value
                              ? `${p.bg} ${p.color} border`
                              : "bg-muted text-muted-foreground hover:bg-accent border border-transparent"
                          )}
                          data-testid={`priority-${p.value}`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location
                    </label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Add location..."
                      className="h-7 text-[11px] rounded-lg"
                      data-testid="input-location"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {globalTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className={cn(
                            "cursor-pointer transition-colors text-[10px] px-2 py-0.5",
                            tags.includes(tag.name)
                              ? "bg-accent text-primary hover:bg-accent/80"
                              : "bg-muted text-muted-foreground hover:bg-accent hover:text-primary"
                          )}
                          onClick={() => {
                            setTags(prev => prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]);
                          }}
                          data-testid={`tag-${tag.name}`}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {tags.filter(t => !globalTags.find(g => g.name === t)).map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-accent text-primary text-[10px] px-2 py-0.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                          onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                          data-testid={`tag-custom-${tag}`}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                      {globalTags.length === 0 && tags.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No tags</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagInput.trim()) {
                            const tag = newTagInput.trim();
                            if (!tags.includes(tag)) setTags(prev => [...prev, tag.startsWith("#") ? tag : `#${tag}`]);
                            setNewTagInput("");
                          }
                          if (e.key === "Escape") setNewTagInput("");
                        }}
                        placeholder="Add tag..."
                        className="flex-1 text-[10px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                        data-testid="input-add-tag"
                      />
                      <button
                        onClick={() => {
                          if (newTagInput.trim()) {
                            const tag = newTagInput.trim();
                            if (!tags.includes(tag)) setTags(prev => [...prev, tag.startsWith("#") ? tag : `#${tag}`]);
                            setNewTagInput("");
                          }
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid="button-add-tag"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center gap-2 px-6 py-3 border-t border-border flex-shrink-0 bg-card">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 px-3 text-[12px]"
                data-testid="button-delete-action"
              >
                {isDeleting ? <SpinnerGap className="h-3.5 w-3.5 animate-spin" /> : <Trash className="h-3.5 w-3.5" />}
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 rounded-lg text-[12px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !text.trim()}
                className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] px-5"
                data-testid="button-save-action"
              >
                {isSaving ? <SpinnerGap className="h-3.5 w-3.5 animate-spin mr-1" /> : <FloppyDisk className="h-3.5 w-3.5 mr-1" />}
                Save
              </Button>
            </div>
          </>
        )}
      </div>

      <DatePickerModal
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        date={dueDate}
        time={dueTime}
        endDate={endDate}
        endTime={endTime}
        allDay={allDay}
        reminder={reminder}
        recurrence={recurrence}
        repeatEnds={repeatEnds}
        repeatEndDate={repeatEndDate}
        repeatEndCount={repeatEndCount}
        onConfirm={handleDatePickerConfirm}
        onClear={handleDatePickerClear}
        showSkipOccurrence={!!recurrence}
      />
    </div>
  );
}
