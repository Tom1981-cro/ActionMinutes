import { useState, useEffect, useMemo } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { DatePickerModal } from "@/components/date-picker-modal";
import {
  ArrowLeft, CalendarBlank, Clock, User, EnvelopeSimple,
  Flag, Tag, MapPin, ArrowsClockwise, Timer, BellRinging,
  FloppyDisk, Trash, Lightning, Notepad, SpinnerGap, Hourglass,
  Paperclip, UploadSimple, CaretDown, Tray, ListBullets
} from "@phosphor-icons/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addWeeks, startOfWeek } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/skeleton-loader";

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
  const [dueTime, setDueTime] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [listDropdownOpen, setListDropdownOpen] = useState(false);

  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const fromSource = searchParams.get("from");
  const sourceListId = searchParams.get("listId");
  const sourceListName = searchParams.get("listName") ? decodeURIComponent(searchParams.get("listName")!) : null;

  const listApiBase = itemType === "meeting" ? "actions" : "reminders";
  const { data: reminderListInfo, isLoading: listInfoLoading } = useQuery<{ listId: string | null; listName: string | null; listIcon: string | null }>({
    queryKey: ["item-list", itemType, itemId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/${listApiBase}/${itemId}/list`);
      if (!res.ok) return { listId: null, listName: null, listIcon: null };
      return res.json();
    },
    enabled: !!itemId,
  });

  const { data: allLists = [] } = useQuery<{ id: string; name: string; icon?: string }[]>({
    queryKey: ["custom-lists"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/lists");
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
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      setListDropdownOpen(false);
      toast({
        title: data.listId ? `Moved to ${data.listName}` : "Moved to Inbox",
      });
    },
    onError: () => {
      toast({ title: "Failed to move task", variant: "destructive" });
    },
  });

  const currentListId = reminderListInfo?.listId || null;
  const currentListName = reminderListInfo?.listName || null;

  const backLabel = fromSource === "list" && sourceListName
    ? `Back to ${sourceListName}`
    : "Back to Inbox";
  const backPath = fromSource === "list" && sourceListId
    ? `/app/lists/${sourceListId}`
    : "/app/inbox";

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

  const { data: fetchedAttachments = [] } = useQuery({
    queryKey: ["attachments", itemType, itemId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/attachments?parentType=${itemType === "meeting" ? "action_item" : "reminder"}&parentId=${itemId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!itemId,
  });

  const attachments = fetchedAttachments;

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
    }
  }, [item]);

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

  const combineDateTime = (date: Date | null, time: string): Date | null => {
    if (!date) return null;
    const result = new Date(date);
    if (time) {
      const [h, m] = time.split(":").map(Number);
      result.setHours(h, m, 0, 0);
    }
    return result;
  };

  const handleSave = async () => {
    if (!text.trim()) {
      toast({ title: "Error", description: "Task text is required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const finalDueDate = combineDateTime(dueDate, dueTime);
      const finalDeadline = deadline;

      if (itemType === "meeting") {
        await api.actions.update(itemId, {
          text,
          ownerName: ownerName || null,
          ownerEmail: ownerEmail || null,
          dueDate: finalDueDate?.toISOString() || null,
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
            dueDate: finalDueDate?.toISOString() || null,
            deadline: finalDeadline?.toISOString() || null,
            status,
            priority: priority === "none" ? "normal" : priority,
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
      queryClient.invalidateQueries({ queryKey: ["actioned"] });
      queryClient.invalidateQueries({ queryKey: ["deleted"] });
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Saved" });
      navigate(backPath);
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
      queryClient.invalidateQueries({ queryKey: ["actioned"] });
      queryClient.invalidateQueries({ queryKey: ["deleted"] });
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Deleted" });
      navigate(backPath);
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
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
        if (!res.ok) {
          throw new Error("Upload failed");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["attachments", itemType, itemId] });
      toast({ title: "Uploaded" });
    } catch {
      toast({ title: "Error", description: "Failed to upload", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await authenticatedFetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["attachments", itemType, itemId] });
      toast({ title: "Attachment removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
        <SkeletonList count={1} type="action" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-5 pb-6">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
        <div className="text-center py-12 text-muted-foreground">Task not found.</div>
      </div>
    );
  }

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

  return (
    <div className="space-y-4 pb-6 max-w-2xl mx-auto" data-testid="page-action-detail">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" weight="bold" />
          {backLabel}
        </button>
        <div className="flex items-center gap-1">
          {itemType === "meeting" && item?.meetingId && (
            <button
              type="button"
              onClick={() => navigate(`/app/meeting/${item.meetingId}`)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer font-semibold pt-[0px] pb-[0px]"
              data-testid="button-go-to-meeting"
            >
              <Lightning className="h-3 w-3" weight="fill" />
              From meeting
            </button>
          )}
          {item.sourceType === "addaction" && (
            <Badge variant="outline" className="text-[12px] rounded-full">
              <Lightning className="h-3 w-3 mr-0.5" weight="fill" />
              AddAction
            </Badge>
          )}
        </div>
      </div>
      <h1 className="text-base font-bold tracking-tight text-foreground leading-snug" data-testid="text-task-title">
        {text || item.text || "Untitled task"}
      </h1>
      <div className="flex gap-2 flex-wrap items-center" data-testid="status-buttons">
        {STATUSES.map((s) => (
          <Button
            key={s.value}
            size="sm"
            variant={status === s.value ? "default" : "outline"}
            onClick={() => setStatus(s.value)}
            className={cn(
              "h-8 rounded-xl text-[12px] px-4",
              status === s.value ? s.className : "border-border"
            )}
            data-testid={`status-${s.value}`}
          >
            {s.label}
          </Button>
        ))}

        {(itemType === "reminder" || itemType === "meeting") && (
          <Popover open={listDropdownOpen} onOpenChange={setListDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 rounded-xl text-[12px] px-3 gap-1.5 ml-auto border-border",
                  currentListId ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20" : "hover:bg-accent"
                )}
                data-testid="button-list-picker"
              >
                {currentListId ? (
                  <ListBullets className="h-3.5 w-3.5" weight="duotone" />
                ) : (
                  <Tray className="h-3.5 w-3.5" weight="duotone" />
                )}
                {currentListName || "Inbox"}
                <CaretDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1.5" align="end">
              <div className="space-y-0.5">
                <button
                  onClick={() => currentListId && moveToList.mutate(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-left",
                    !currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                  )}
                  data-testid="move-to-inbox"
                >
                  <Tray className="h-4 w-4" weight="duotone" />
                  Inbox
                  {!currentListId && <span className="ml-auto text-[12px] text-primary">current</span>}
                </button>
                {allLists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => list.id !== currentListId && moveToList.mutate(list.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors text-left",
                      list.id === currentListId ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                    )}
                    data-testid={`move-to-list-${list.id}`}
                  >
                    <ListBullets className="h-4 w-4" weight="duotone" />
                    {list.name}
                    {list.id === currentListId && <span className="ml-auto text-[12px] text-primary">current</span>}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {status === "waiting" && (
        <Card className="glass-panel rounded-2xl">
          <CardContent className="px-4 py-3 md:px-6">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5" weight="duotone" />
                Waiting for
              </Label>
              <Input
                value={waitingFor}
                onChange={(e) => setWaitingFor(e.target.value)}
                placeholder="Who or what are you waiting on?"
                className="h-9 text-[12px] rounded-xl"
                data-testid="input-waiting-for"
              />
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="glass-panel rounded-2xl">
        <CardHeader className="px-4 pt-4 pb-2 md:px-6">
          <CardTitle className="text-[12px] font-semibold text-primary flex items-center gap-1.5">
            <Notepad className="h-4 w-4" weight="duotone" />
            Task Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px] text-muted-foreground">Task</Label>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What needs to be done?"
              className="h-9 text-[12px] rounded-xl"
              data-testid="input-action-text"
            />
          </div>
          {(itemType === "reminder" || description !== undefined) && (
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                className="min-h-[70px] text-[12px] rounded-xl"
                data-testid="input-description"
              />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" weight="duotone" />
                Assigned to
              </Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Who's responsible?"
                className="h-9 text-[12px] rounded-xl"
                data-testid="input-owner-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <EnvelopeSimple className="h-3.5 w-3.5" weight="duotone" />
                Email
              </Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                className="h-9 text-[12px] rounded-xl"
                data-testid="input-owner-email"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-panel rounded-2xl">
        <CardHeader className="px-4 pt-4 pb-2 md:px-6">
          <CardTitle className="text-[12px] font-semibold text-primary flex items-center gap-1.5">
            <CalendarBlank className="h-4 w-4" weight="duotone" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <CalendarBlank className="h-3.5 w-3.5" weight="duotone" />
                Due Date
              </Label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={cn(
                  "flex items-center gap-2 w-full h-9 px-3 rounded-xl border text-[12px] transition-colors text-left",
                  dueDate ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid="button-due-date"
              >
                <CalendarBlank className="h-3.5 w-3.5 flex-shrink-0" weight="duotone" />
                {dueDate ? `${format(dueDate, "d MMM yyyy")}${dueTime ? ` ${dueTime}` : ""}` : "Set due date"}
              </button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" weight="duotone" />
                Duration
              </Label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={cn(
                  "flex items-center gap-2 w-full h-9 px-3 rounded-xl border text-[12px] transition-colors text-left",
                  getDurationLabel() ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
                )}
                data-testid="button-duration"
              >
                <Clock className="h-3.5 w-3.5 flex-shrink-0" weight="duotone" />
                {getDurationLabel() || "Set duration"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" weight="duotone" />
                Deadline
              </Label>
              <Popover open={showDeadlinePicker} onOpenChange={setShowDeadlinePicker}>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={deadlineInput}
                    onChange={(e) => {
                      setDeadlineInput(e.target.value);
                      if (e.target.value) {
                        setDeadline(new Date(e.target.value));
                      } else {
                        setDeadline(null);
                      }
                    }}
                    className={cn(
                      "h-9 text-[12px] rounded-xl flex-1",
                      deadline ? "border-red-500/30 bg-red-500/5" : ""
                    )}
                    data-testid="input-deadline"
                  />
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-border hover:bg-accent transition-colors flex-shrink-0"
                      data-testid="button-deadline-calendar"
                    >
                      <CalendarBlank className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
                    </button>
                  </PopoverTrigger>
                </div>
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
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <BellRinging className="h-3.5 w-3.5" weight="duotone" />
                Reminder
              </Label>
              <Select
                value={reminder}
                onValueChange={(v) => setReminder(v)}
              >
                <SelectTrigger className="h-9 text-[12px] rounded-xl" data-testid="select-reminder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REMINDER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <ArrowsClockwise className="h-3.5 w-3.5" weight="duotone" />
                Repeat
              </Label>
              <Select
                value={recurrence || "none"}
                onValueChange={(v) => setRecurrence(v === "none" ? null : v)}
              >
                <SelectTrigger className="h-9 text-[12px] rounded-xl" data-testid="select-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
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
                      "px-3 py-1 rounded-full text-[12px] font-medium transition-colors",
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" weight="duotone" />
                Location
              </Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location..."
                className="h-9 text-[12px] rounded-xl"
                data-testid="input-location"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" weight="duotone" />
                Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] items-center">
                {globalTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer transition-colors text-[12px]",
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
                {globalTags.length === 0 && (
                  <span className="text-[12px] text-muted-foreground">No tags available</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="glass-panel rounded-2xl">
        <CardHeader className="px-4 pt-4 pb-2 md:px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[12px] font-semibold text-primary flex items-center gap-1.5">
              <Notepad className="h-4 w-4" weight="duotone" />
              Notes
            </CardTitle>
            <label className="cursor-pointer" data-testid="button-attach-file">
              <input
                type="file"
                multiple
                accept={ALLOWED_FILE_TYPES}
                className="hidden"
                onChange={handleFileUpload}
              />
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] text-primary hover:bg-primary/10 transition-colors border border-primary/30">
                {isUploading ? (
                  <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UploadSimple className="h-3.5 w-3.5" weight="duotone" />
                )}
                Attach
              </span>
            </label>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional context or details..."
            className="min-h-[80px] text-[12px] rounded-xl"
            data-testid="input-notes"
          />

          {attachments.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" weight="duotone" />
                Attachments ({attachments.length})
              </Label>
              <div className="space-y-1">
                {attachments.map((att: any) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-accent/30 text-sm group"
                    data-testid={`attachment-${att.id}`}
                  >
                    <span className="text-base">{getFileIcon(att.filename || att.name || "file")}</span>
                    <span className="flex-1 truncate text-foreground text-[12px]">
                      {att.filename || att.name || "Attachment"}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {att.size ? `${Math.round(att.size / 1024)}KB` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      data-testid={`delete-attachment-${att.id}`}
                    >
                      <Trash className="h-3.5 w-3.5" weight="duotone" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center gap-3 pt-2">
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
          onClick={() => navigate(backPath)}
          className="h-9 rounded-xl text-[12px]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !text.trim()}
          className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] px-6"
          data-testid="button-save-action"
        >
          {isSaving ? <SpinnerGap className="h-4 w-4 animate-spin mr-1.5" /> : <FloppyDisk className="h-4 w-4 mr-1.5" weight="duotone" />}
          Save
        </Button>
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
