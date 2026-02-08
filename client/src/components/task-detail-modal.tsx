import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerModal } from "@/components/date-picker-modal";
import {
  X, Circle, CheckCircle, Paperclip, UploadSimple,
  CaretUp, CaretDown, DotsThree, Plus, PaperPlaneTilt,
  Trash, Flag, Tag, MapPin, CalendarBlank, BellRinging,
  Timer, Tray, ListBullets, SpinnerGap, Sun, Couch,
  ProhibitInset, Clock, ArrowsClockwise, Copy
} from "@phosphor-icons/react";

const PRIORITY_OPTIONS = [
  { value: "high", label: "Priority 1", color: "text-red-500", flag: "text-red-500" },
  { value: "normal", label: "Priority 2", color: "text-amber-500", flag: "text-amber-500" },
  { value: "low", label: "Priority 3", color: "text-blue-500", flag: "text-blue-500" },
  { value: "none", label: "Priority 4", color: "text-muted-foreground", flag: "text-muted-foreground" },
];

const REMINDER_LABELS: Record<string, string> = {
  on_time: "On time",
  "5_min": "5 min before",
  "30_min": "30 min before",
  "1_hour": "1 hour before",
  "1_day": "1 day before",
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
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
}

export function TaskDetailModal({ open, onClose, itemId, itemType, onNavigatePrev, onNavigateNext }: TaskDetailModalProps) {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

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
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("none");
  const [reminder, setReminder] = useState("none");
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [repeatEnds, setRepeatEnds] = useState("endless");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [repeatEndCount, setRepeatEndCount] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);

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

  const listApiBase = itemType === "meeting" ? "actions" : "reminders";

  const { data: reminderListInfo } = useQuery<{ listId: string | null; listName: string | null }>({
    queryKey: ["item-list", itemType, itemId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/${listApiBase}/${itemId}/list`);
      if (!res.ok) return { listId: null, listName: null };
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
  });

  const { data: globalTags = [] } = useQuery<{ id: string; name: string; color: string | null }[]>({
    queryKey: ["global-tags"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tags");
      if (!res.ok) return [];
      return res.json();
    },
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
      queryClient.invalidateQueries({ queryKey: ["item-list", itemType, itemId] });
      invalidateAll();
      setShowProjectPicker(false);
      toast({ title: data.listId ? `Moved to ${data.listName}` : "Moved to Inbox" });
    },
  });

  const currentListId = reminderListInfo?.listId || null;
  const currentListName = reminderListInfo?.listName || null;

  useEffect(() => {
    setText(""); setDescription(""); setOwnerName(""); setOwnerEmail("");
    setDueDate(null); setDueTime(""); setEndDate(null); setEndTime("");
    setAllDay(false); setDeadline(null); setStatus("open"); setPriority("none");
    setReminder("none"); setReminderAt(null); setRecurrence(null);
    setTags([]); setLocation(""); setNotes(""); setSubtasks([]);
    setNewSubtaskText(""); setCommentText(""); setShowCommentBox(false);
    setShowAddSubtask(false); setIsEditingTitle(false); setIsEditingDesc(false);
    setShowMoreMenu(false);
  }, [itemId]);

  useEffect(() => {
    if (item) {
      setText(item.text || "");
      setDescription(item.description || item.notes || "");
      setOwnerName(item.ownerName || user?.name || "");
      setOwnerEmail(item.ownerEmail || "");
      setDueDate(item.dueDate ? new Date(item.dueDate) : null);
      setDueTime(item.dueDate ? format(new Date(item.dueDate), "HH:mm") : "");
      setDeadline(item.deadline ? new Date(item.deadline) : null);
      setStatus(item.status || "open");
      const p = item.priority || "none";
      setPriority(["high", "normal", "low", "none"].includes(p) ? p : "none");
      setReminderAt(item.reminderAt ? new Date(item.reminderAt) : null);
      setReminder(item.reminderMode || "none");
      setTags(item.tags || []);
      setLocation(item.location || "");
      setNotes(item.notes || "");
      setRecurrence(item.recurrence || null);

      const existingSubtasks = parseSubtasks(item.description || item.notes || "");
      if (existingSubtasks.length > 0) {
        setSubtasks(existingSubtasks);
      }
    }
  }, [item]);

  const parseSubtasks = (text: string): Subtask[] => {
    const lines = text.split("\n");
    const tasks: Subtask[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)/);
      if (match) {
        tasks.push({ id: crypto.randomUUID(), text: match[2].trim(), completed: match[1] !== " " });
      }
    }
    return tasks;
  };

  const serializeSubtasks = (): string | null => {
    if (subtasks.length === 0) return null;
    return subtasks.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n");
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    queryClient.invalidateQueries({ queryKey: ["reminders", user.id] });
    queryClient.invalidateQueries({ queryKey: ["actioned"] });
    queryClient.invalidateQueries({ queryKey: ["deleted"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["custom-list"] });
    queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
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

  const autoSave = async (updates: Record<string, any>) => {
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, updates);
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
      }
      invalidateAll();
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      const finalDueDate = combineDateTime(dueDate, dueTime);
      if (itemType === "meeting") {
        await api.actions.update(itemId, {
          text, ownerName: ownerName || null, ownerEmail: ownerEmail || null,
          dueDate: finalDueDate?.toISOString() || null,
          status, reminderAt: reminderAt?.toISOString() || null,
          notes: serializeSubtasks() || notes || description || null, tags,
        });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text, description: serializeSubtasks() || description || null,
            dueDate: finalDueDate?.toISOString() || null,
            deadline: deadline?.toISOString() || null,
            status, priority: priority,
            reminderAt: reminderAt?.toISOString() || null,
            notes: notes || description || null, tags,
            location: location || null, recurrence: recurrence || null,
            isCompleted: status === "done",
            completedAt: status === "done" ? new Date().toISOString() : null,
          }),
        });
      }
      invalidateAll();
      toast({ title: "Saved" });
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    const newCompleted = !(status === "done" || item?.isCompleted);
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, { status: newCompleted ? "done" : "open" });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isCompleted: newCompleted,
            completedAt: newCompleted ? new Date().toISOString() : null,
            status: newCompleted ? "done" : "open",
          }),
        });
      }
      setStatus(newCompleted ? "done" : "open");
      invalidateAll();
      toast({ title: newCompleted ? "Completed" : "Reopened" });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      if (itemType === "meeting") {
        await api.actions.delete(itemId);
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, { method: "DELETE" });
      }
      invalidateAll();
      toast({ title: "Deleted" });
      onClose();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const saveSubtasks = (newSubtasks: Subtask[]) => {
    const serialized = newSubtasks.length > 0
      ? newSubtasks.map(s => `- [${s.completed ? "x" : " "}] ${s.text}`).join("\n")
      : null;
    if (itemType === "meeting") {
      autoSave({ notes: serialized || notes || description || null });
    } else {
      autoSave({ description: serialized || description || null });
    }
  };

  const toggleSubtask = (id: string) => {
    const newSubtasks = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    setSubtasks(newSubtasks);
    saveSubtasks(newSubtasks);
  };

  const addSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newSubtasks = [...subtasks, { id: crypto.randomUUID(), text: newSubtaskText.trim(), completed: false }];
    setSubtasks(newSubtasks);
    setNewSubtaskText("");
    saveSubtasks(newSubtasks);
  };

  const removeSubtask = (id: string) => {
    const newSubtasks = subtasks.filter(s => s.id !== id);
    setSubtasks(newSubtasks);
    saveSubtasks(newSubtasks);
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
        const res = await authenticatedFetch("/api/attachments", { method: "POST", body: formData });
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
    const finalDueDate = combineDateTime(values.date, values.time);
    if (finalDueDate || !values.date) {
      autoSave({ dueDate: finalDueDate?.toISOString() || null });
    }
  };

  const handleDatePickerClear = () => {
    setDueDate(null); setDueTime(""); setEndDate(null); setEndTime("");
    setAllDay(false); setRecurrence(null); setRepeatEnds("endless");
    setRepeatEndDate(null); setRepeatEndCount(null);
    autoSave({ dueDate: null });
  };

  const dueDateLabel = useMemo(() => {
    if (!dueDate) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateObj = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    if (dateObj.getTime() === today.getTime()) return "Today";
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateObj.getTime() === tomorrow.getTime()) return "Tomorrow";
    return format(dueDate, "MMM d");
  }, [dueDate]);

  const priorityInfo = PRIORITY_OPTIONS.find(p => p.value === priority) || PRIORITY_OPTIONS[3];

  const createdAtFormatted = useMemo(() => {
    if (!item?.createdAt) return null;
    try { return format(new Date(item.createdAt), "MMM d, yyyy · h:mm a"); } catch { return null; }
  }, [item?.createdAt]);

  const isCompleted = status === "done" || item?.isCompleted;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) { handleSave(); onClose(); } }}
      data-testid="task-detail-overlay"
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-[820px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-testid="task-detail-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Tray className="h-4 w-4" />
            <span className="font-medium text-foreground">{currentListName || "Inbox"}</span>
          </div>
          <div className="flex items-center gap-1">
            {onNavigatePrev && (
              <button onClick={onNavigatePrev} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" data-testid="button-nav-prev">
                <CaretUp className="h-4 w-4" />
              </button>
            )}
            {onNavigateNext && (
              <button onClick={onNavigateNext} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" data-testid="button-nav-next">
                <CaretDown className="h-4 w-4" />
              </button>
            )}

            {/* Three-dot menu */}
            <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
              <PopoverTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" data-testid="button-more-menu">
                  <DotsThree className="h-4 w-4" weight="bold" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1.5" align="end">
                {createdAtFormatted && (
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border mb-1">
                    Added on {createdAtFormatted}
                  </div>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.origin + `/app/action/${itemType}/${itemId}`); toast({ title: "Link copied" }); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent transition-colors"
                  data-testid="menu-copy-link"
                >
                  <Copy className="h-4 w-4 text-muted-foreground" />
                  Copy link to task
                </button>
                <button
                  onClick={() => { handleDelete(); setShowMoreMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  data-testid="menu-delete"
                >
                  <Trash className="h-4 w-4" />
                  Delete
                </button>
              </PopoverContent>
            </Popover>

            <button onClick={() => { handleSave(); onClose(); }} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground" data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <SpinnerGap className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Title and completion */}
                <div className="flex items-start gap-3 mb-1">
                  <button
                    onClick={handleComplete}
                    className={cn("flex-shrink-0 mt-0.5 transition-colors", isCompleted ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground")}
                    data-testid="button-toggle-complete"
                  >
                    {isCompleted ? <CheckCircle className="h-6 w-6" weight="fill" /> : <Circle className="h-6 w-6" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                      <div className="space-y-2">
                        <input
                          autoFocus
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          onBlur={() => { if (text.trim()) { handleSave(); } setIsEditingTitle(false); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { handleSave(); setIsEditingTitle(false); } if (e.key === "Escape") setIsEditingTitle(false); }}
                          className="text-lg font-semibold text-foreground bg-transparent border border-border rounded-lg px-2 py-1 outline-none w-full focus:border-primary"
                          data-testid="input-task-title"
                        />
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Description"
                          className="min-h-[60px] resize-none text-sm border-border"
                          data-testid="textarea-description"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setIsEditingTitle(false)} className="h-7 text-xs">Cancel</Button>
                          <Button size="sm" onClick={() => { handleSave(); setIsEditingTitle(false); }} disabled={isSaving} className="h-7 text-xs bg-primary text-primary-foreground" data-testid="button-save-title">
                            {isSaving ? <SpinnerGap className="h-3 w-3 animate-spin mr-1" /> : null}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setIsEditingTitle(true)} className="cursor-text">
                        <h2 className={cn("text-lg font-semibold text-foreground leading-snug", isCompleted && "line-through text-muted-foreground")}>
                          {text || "Untitled task"}
                        </h2>
                        {description ? (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 mt-0.5 flex items-center gap-1.5">
                            <span className="inline-block w-3.5 h-0.5 bg-muted-foreground/30 rounded" />
                            Description
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtasks */}
                <div className="mt-4 border-t border-border/50 pt-3">
                  {subtasks.map(st => (
                    <div key={st.id} className="flex items-center gap-2.5 group/subtask py-1.5 pl-9">
                      <Checkbox
                        checked={st.completed}
                        onCheckedChange={() => toggleSubtask(st.id)}
                        className="h-4 w-4"
                        data-testid={`subtask-check-${st.id}`}
                      />
                      <span className={cn("flex-1 text-sm", st.completed && "line-through text-muted-foreground")}>{st.text}</span>
                      <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover/subtask:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5" data-testid={`subtask-delete-${st.id}`}>
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {showAddSubtask ? (
                    <div className="flex items-center gap-2.5 pl-9 py-1.5">
                      <Checkbox disabled className="h-4 w-4 opacity-40" />
                      <input
                        autoFocus
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && newSubtaskText.trim()) { addSubtask(); } if (e.key === "Escape") { setShowAddSubtask(false); setNewSubtaskText(""); } }}
                        onBlur={() => { if (newSubtaskText.trim()) addSubtask(); else setShowAddSubtask(false); }}
                        placeholder="Sub-task name"
                        className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                        data-testid="input-new-subtask"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddSubtask(true)}
                      className="flex items-center gap-2 pl-9 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                      data-testid="button-add-subtask"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add sub-task
                    </button>
                  )}
                </div>

                {/* Attachments */}
                {fetchedAttachments.length > 0 && (
                  <div className="mt-3 border-t border-border/50 pt-3 pl-9 space-y-1">
                    {fetchedAttachments.map((att: any) => (
                      <div key={att.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/30 group/att text-sm">
                        <a href={att.filePath ? `/uploads/${att.filePath.split('/').pop()}` : '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary truncate">
                          <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                          {att.fileName || att.filename || att.name || "File"}
                        </a>
                        <button onClick={() => handleDeleteAttachment(att.id)} className="opacity-0 group-hover/att:opacity-100 text-muted-foreground hover:text-destructive transition-all" data-testid={`attachment-delete-${att.id}`}>
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Comment section */}
                <div className="mt-4 border-t border-border/50 pt-3">
                  {showCommentBox ? (
                    <div className="space-y-2">
                      <Textarea
                        autoFocus
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Comment"
                        className="min-h-[80px] resize-none text-sm"
                        data-testid="textarea-comment"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button onClick={() => commentFileInputRef.current?.click()} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground" data-testid="comment-attach">
                            <Paperclip className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setShowCommentBox(false); setCommentText(""); }} className="h-7 text-xs">Cancel</Button>
                          <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" disabled={!commentText.trim()} data-testid="button-send-comment">
                            Comment
                          </Button>
                        </div>
                      </div>
                      <input ref={commentFileInputRef} type="file" accept={ALLOWED_FILE_TYPES} className="hidden" onChange={handleFileUpload} multiple />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3" onClick={() => setShowCommentBox(true)}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                        {(user?.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 flex items-center justify-between border border-border rounded-lg px-3 py-2 cursor-text hover:border-muted-foreground/40 transition-colors">
                        <span className="text-sm text-muted-foreground/60">Comment</span>
                        <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-attach-from-comment">
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept={ALLOWED_FILE_TYPES} className="hidden" onChange={handleFileUpload} multiple />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-[220px] flex-shrink-0 border-l border-border overflow-y-auto bg-card">
            <div className="divide-y divide-border">

              {/* Project */}
              <div className="px-4 py-3">
                <Popover open={showProjectPicker} onOpenChange={setShowProjectPicker}>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Project</div>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-sm text-foreground hover:bg-accent rounded-md px-1.5 py-1 -mx-1.5 transition-colors" data-testid="button-project-picker">
                      <Tray className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-left truncate">{currentListName || "Inbox"}</span>
                      <CaretDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1.5" align="start">
                    <div className="space-y-0.5">
                      <button
                        onClick={() => currentListId && moveToList.mutate(null)}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left", !currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground")}
                        data-testid="project-inbox"
                      >
                        <Tray className="h-4 w-4" />
                        Inbox
                        {!currentListId && <span className="ml-auto text-primary">&#10003;</span>}
                      </button>
                      {allLists.length > 0 && <div className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-1">My Projects</div>}
                      {allLists.map((list) => (
                        <button
                          key={list.id}
                          onClick={() => list.id !== currentListId && moveToList.mutate(list.id)}
                          className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left", list.id === currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground")}
                          data-testid={`project-list-${list.id}`}
                        >
                          <ListBullets className="h-4 w-4" />
                          {list.name}
                          {list.id === currentListId && <span className="ml-auto text-primary">&#10003;</span>}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date */}
              <div className="px-4 py-3">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Date</div>
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={cn("flex items-center gap-2 w-full text-sm rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-accent", dueDate ? "text-foreground" : "text-muted-foreground")}
                  data-testid="button-date-picker"
                >
                  <CalendarBlank className={cn("h-4 w-4", dueDate ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1 text-left">{dueDateLabel || "No date"}</span>
                  {!dueDate && <Plus className="h-3.5 w-3.5" />}
                </button>
                {dueTime && dueDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-7">
                    <Clock className="h-3 w-3" /> {dueTime}
                  </div>
                )}
                {recurrence && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 pl-7">
                    <ArrowsClockwise className="h-3 w-3" /> {recurrence}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div className="px-4 py-3">
                <Popover open={showDeadlinePicker} onOpenChange={setShowDeadlinePicker}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Deadline</div>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-deadline">
                        {deadline ? (
                          <span className="text-xs text-destructive font-medium">{format(deadline, "MMM d")}</span>
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </PopoverTrigger>
                  </div>
                  <PopoverContent className="w-64 p-0" align="end">
                    <div className="p-3 space-y-2 border-b border-border">
                      <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Type a deadline"
                          className="flex-1 text-sm bg-transparent border-none outline-none"
                          data-testid="input-deadline-text"
                        />
                      </div>
                      {dueDate && (
                        <>
                          <button
                            onClick={() => { const d = addDays(dueDate, 3); setDeadline(d); setShowDeadlinePicker(false); autoSave({ deadline: d.toISOString() }); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <span className="flex items-center gap-2"><CalendarBlank className="h-4 w-4 text-muted-foreground" />3 days after date</span>
                            <span className="text-xs text-muted-foreground">{format(addDays(dueDate, 3), "MMM d")}</span>
                          </button>
                          <button
                            onClick={() => { const d = addWeeks(dueDate, 1); setDeadline(d); setShowDeadlinePicker(false); autoSave({ deadline: d.toISOString() }); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <span className="flex items-center gap-2"><CalendarBlank className="h-4 w-4 text-muted-foreground" />1 week after date</span>
                            <span className="text-xs text-muted-foreground">{format(addWeeks(dueDate, 1), "MMM d")}</span>
                          </button>
                          <button
                            onClick={() => { const d = addMonths(dueDate, 1); setDeadline(d); setShowDeadlinePicker(false); autoSave({ deadline: d.toISOString() }); }}
                            className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors"
                          >
                            <span className="flex items-center gap-2"><CalendarBlank className="h-4 w-4 text-muted-foreground" />1 month after date</span>
                            <span className="text-xs text-muted-foreground">{format(addMonths(dueDate, 1), "MMM d")}</span>
                          </button>
                        </>
                      )}
                    </div>
                    <div className="p-2">
                      <Calendar
                        mode="single"
                        selected={deadline ?? undefined}
                        onSelect={(d) => {
                          setDeadline(d ?? null);
                          setShowDeadlinePicker(false);
                          if (d) autoSave({ deadline: d.toISOString() });
                          else autoSave({ deadline: null });
                        }}
                      />
                    </div>
                    {deadline && (
                      <div className="px-3 pb-2">
                        <button onClick={() => { setDeadline(null); setShowDeadlinePicker(false); autoSave({ deadline: null }); }} className="text-xs text-destructive hover:underline">Remove deadline</button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              <div className="px-4 py-3">
                <Popover open={showPriorityPicker} onOpenChange={setShowPriorityPicker}>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Priority</div>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-2 w-full text-sm rounded-md px-1.5 py-1 -mx-1.5 transition-colors hover:bg-accent" data-testid="button-priority-picker">
                      <Flag className={cn("h-4 w-4", priorityInfo.flag)} weight={priority === "none" ? "regular" : "fill"} />
                      <span className="flex-1 text-left">{priorityInfo.label.replace("Priority ", "P")}</span>
                      <CaretDown className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1.5" align="start">
                    {PRIORITY_OPTIONS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => {
                          setPriority(p.value);
                          setShowPriorityPicker(false);
                          autoSave({ priority: p.value });
                        }}
                        className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left", priority === p.value ? "bg-accent" : "hover:bg-accent")}
                        data-testid={`priority-option-${p.value}`}
                      >
                        <Flag className={cn("h-4 w-4", p.flag)} weight={p.value === "none" ? "regular" : "fill"} />
                        {p.label}
                        {priority === p.value && <span className="ml-auto text-primary">&#10003;</span>}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Labels/Tags */}
              <div className="px-4 py-3">
                <Popover open={showLabelPicker} onOpenChange={setShowLabelPicker}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Labels</div>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-labels">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tags.map(tag => (
                        <span key={tag} onClick={() => { const newTags = tags.filter(t => t !== tag); setTags(newTags); autoSave({ tags: newTags }); }} className="inline-flex items-center gap-0.5 bg-accent rounded-full px-2 py-0.5 text-xs text-foreground cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors" data-testid={`tag-${tag}`}>
                          <Tag className="h-3 w-3" /> {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <PopoverContent className="w-52 p-2" align="end">
                    <div className="space-y-1">
                      <input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagInput.trim()) {
                            const tag = newTagInput.trim();
                            if (!tags.includes(tag)) {
                              const newTags = [...tags, tag];
                              setTags(newTags);
                              autoSave({ tags: newTags });
                            }
                            setNewTagInput("");
                          }
                        }}
                        placeholder="Type a label name"
                        className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-transparent outline-none focus:border-primary"
                        data-testid="input-new-label"
                      />
                      {globalTags.filter(gt => !tags.includes(gt.name)).map(gt => (
                        <button
                          key={gt.id}
                          onClick={() => { const newTags = [...tags, gt.name]; setTags(newTags); autoSave({ tags: newTags }); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left"
                          data-testid={`global-tag-${gt.name}`}
                        >
                          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                          {gt.name}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Reminders */}
              <div className="px-4 py-3">
                <Popover open={showReminderPicker} onOpenChange={setShowReminderPicker}>
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Reminders</div>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-reminders">
                        {reminder && reminder !== "none" ? (
                          <span className="text-xs text-foreground font-medium">{REMINDER_LABELS[reminder] || reminder}</span>
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </PopoverTrigger>
                  </div>
                  <PopoverContent className="w-48 p-1.5" align="end">
                    {Object.entries(REMINDER_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => {
                          setReminder(value);
                          setShowReminderPicker(false);
                          autoSave({ reminderMode: value });
                        }}
                        className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left", reminder === value ? "bg-accent" : "hover:bg-accent")}
                        data-testid={`reminder-option-${value}`}
                      >
                        <BellRinging className="h-4 w-4 text-muted-foreground" />
                        {label}
                        {reminder === value && <span className="ml-auto text-primary">&#10003;</span>}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Location */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-muted-foreground">Location</div>
                  {!showLocationInput && !location && (
                    <button onClick={() => setShowLocationInput(true)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-location">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {(showLocationInput || location) && (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <input
                        autoFocus={showLocationInput && !location}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onBlur={() => { if (!location) setShowLocationInput(false); else autoSave({ location: location || null }); }}
                        placeholder="Type location"
                        className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                        data-testid="input-location"
                      />
                      {location && (
                        <button onClick={() => { setLocation(""); setShowLocationInput(false); autoSave({ location: null }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
