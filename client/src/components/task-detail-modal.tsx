import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  X, Circle, CheckCircle, Sparkle, Paperclip, UploadSimple,
  User, CalendarBlank, Flag, Tag, Plus, PaperPlaneTilt,
  Trash, CaretDown, ListChecks, Clock, SpinnerGap
} from "@phosphor-icons/react";

const PRIORITIES = [
  { value: "high", label: "High", dot: "bg-red-500" },
  { value: "normal", label: "Normal", dot: "bg-blue-500" },
  { value: "low", label: "Low", dot: "bg-emerald-500" },
  { value: "none", label: "None", dot: "bg-muted-foreground/40" },
];

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
  categoryLabel?: string;
}

export function TaskDetailModal({ open, onClose, itemId, itemType, categoryLabel }: TaskDetailModalProps) {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("none");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    setText("");
    setDescription("");
    setOwnerName("");
    setDueDate("");
    setStatus("open");
    setPriority("none");
    setTags([]);
    setNotes("");
    setSubtasks([]);
    setNewSubtaskText("");
    setCommentText("");
  }, [itemId]);

  useEffect(() => {
    if (item) {
      setText(item.text || "");
      setDescription(item.description || item.notes || "");
      setOwnerName(item.ownerName || user.name || "");
      setDueDate(item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "");
      setStatus(item.status || "open");
      const p = item.priority || "none";
      setPriority(["high", "normal", "low", "none"].includes(p) ? p : "none");
      setTags(item.tags || []);
      setNotes(item.notes || "");

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
    queryClient.invalidateQueries({ queryKey: ["reminders", user.id] });
    queryClient.invalidateQueries({ queryKey: ["actioned"] });
    queryClient.invalidateQueries({ queryKey: ["deleted"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: [itemType === "meeting" ? "action" : "reminder", itemId] });
  };

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, {
          text,
          ownerName: ownerName || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          status,
          notes: description || null,
          tags,
        });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            description: description || null,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            status,
            priority: priority === "none" ? "normal" : priority,
            notes: description || null,
            tags,
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

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      if (itemType === "meeting") {
        await api.actions.update(itemId, { status: "done" });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${itemId}?userId=${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: true }),
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

  const addTag = () => {
    const tag = newTagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag.startsWith("#") ? tag : `#${tag}`]);
    }
    setNewTagInput("");
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
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

  const dueDateLabel = useMemo(() => {
    if (!dueDate) return "Set date";
    try {
      const d = new Date(dueDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dateObj = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dateObj.getTime() === today.getTime()) return "Today";
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateObj.getTime() === tomorrow.getTime()) return "Tomorrow";
      return format(d, "MMM d, yyyy");
    } catch {
      return "Set date";
    }
  }, [dueDate]);

  const createdAtLabel = useMemo(() => {
    if (!item?.createdAt) return null;
    try {
      return `Created on ${format(new Date(item.createdAt), "MMM d, yyyy")}`;
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
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[85vh] flex overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        data-testid="task-detail-modal"
      >
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
          <div className="flex items-start gap-3">
            <button
              onClick={handleComplete}
              className={cn(
                "flex-shrink-0 mt-1 transition-colors",
                isCompleted ? "text-primary" : "text-muted-foreground/40 hover:text-primary"
              )}
              data-testid="button-toggle-complete"
            >
              {isCompleted ? (
                <CheckCircle className="h-7 w-7" weight="fill" />
              ) : (
                <Circle className="h-7 w-7" weight="regular" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-xl font-semibold text-foreground bg-transparent border-none outline-none w-full placeholder:text-muted-foreground"
                placeholder="Task title..."
                data-testid="input-task-title"
              />
              <div className="flex items-center gap-2 mt-1">
                {categoryLabel && (
                  <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    In {categoryLabel}
                  </span>
                )}
                {createdAtLabel && (
                  <span className="text-[11px] text-muted-foreground">{createdAtLabel}</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
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
              className="min-h-[80px] resize-none border-none bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none"
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
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
            </h3>
            <div className="space-y-1">
              {fetchedAttachments.map((att: any) => (
                <div key={att.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-accent/30 group/att text-sm">
                  <a
                    href={att.filePath ? `/uploads/${att.filePath.split('/').pop()}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-foreground hover:text-primary truncate"
                  >
                    <Paperclip className="h-3.5 w-3.5 flex-shrink-0" />
                    {att.fileName || "File"}
                  </a>
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
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-upload-attachment"
            >
              {isUploading ? (
                <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UploadSimple className="h-3.5 w-3.5" />
              )}
              {isUploading ? "Uploading..." : "Upload file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_FILE_TYPES}
              className="hidden"
              onChange={handleFileUpload}
              multiple
            />
          </div>
        </div>

        <div className="w-[280px] flex-shrink-0 border-l border-border bg-accent/20 overflow-y-auto flex flex-col">
          <div className="p-4 space-y-5 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-close-modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assignee</label>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                  {(ownerName || "?")[0].toUpperCase()}
                </div>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-foreground w-full"
                  placeholder="Unassigned"
                  data-testid="input-assignee"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due Date</label>
              <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                <CalendarBlank className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-foreground w-full"
                  data-testid="input-due-date"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
              <div className="bg-card border border-border rounded-lg px-3 py-2">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-foreground w-full cursor-pointer"
                  data-testid="select-priority"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-card border border-border rounded-full px-2.5 py-1 text-xs font-medium text-foreground cursor-pointer hover:border-destructive/50 hover:text-destructive transition-colors"
                    onClick={() => removeTag(tag)}
                    data-testid={`tag-${tag}`}
                  >
                    {tag}
                  </span>
                ))}
                {showTagInput ? (
                  <input
                    autoFocus
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addTag(); if (e.key === "Escape") setShowTagInput(false); }}
                    onBlur={addTag}
                    placeholder="#tag"
                    className="w-16 text-xs bg-transparent border-none outline-none text-foreground"
                    data-testid="input-new-tag"
                  />
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-0.5 border border-dashed border-border rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</label>
              <div className="space-y-2 text-xs text-muted-foreground">
                {item?.createdAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0 mt-0.5">
                      {(ownerName || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{ownerName || "System"}</span>
                      <span className="ml-1 text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                      <p className="text-muted-foreground mt-0.5">Created this task</p>
                    </div>
                  </div>
                )}
                {item?.updatedAt && item.updatedAt !== item.createdAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ask a question or comment..."
                className="flex-1 text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                data-testid="input-comment"
              />
              <button
                className="text-primary hover:text-primary/80 transition-colors"
                data-testid="button-send-comment"
              >
                <PaperPlaneTilt className="h-4 w-4" weight="fill" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full shadow-lg"
          data-testid="button-save-task"
        >
          {isSaving ? <SpinnerGap className="h-4 w-4 animate-spin mr-1" /> : null}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
