import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, Plus, Loader2, CheckCircle, Circle, Trash2, GripVertical,
  Sun, Sunrise, CalendarDays, CalendarRange, Star, ChevronRight,
  MoreHorizontal, Download, ArrowRight
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, startOfTomorrow, startOfWeek, startOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReminderBucket = 'today' | 'tomorrow' | 'next_week' | 'next_month' | 'sometime';

interface Reminder {
  id: string;
  userId: string;
  text: string;
  bucket: ReminderBucket;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  priority: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const BUCKETS: { value: ReminderBucket; label: string; icon: typeof Sun; color: string; bgColor: string }[] = [
  { value: "today", label: "Today", icon: Sun, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" },
  { value: "tomorrow", label: "Tomorrow", icon: Sunrise, color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200" },
  { value: "next_week", label: "Next Week", icon: CalendarDays, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
  { value: "next_month", label: "Next Month", icon: CalendarRange, color: "text-purple-600", bgColor: "bg-purple-50 border-purple-200" },
  { value: "sometime", label: "Sometime", icon: Star, color: "text-gray-500", bgColor: "bg-gray-50 border-gray-200" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-gray-500" },
  { value: "normal", label: "Normal", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-red-500" },
];

function computeBucketFromDate(date: Date): ReminderBucket {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff <= 0) return 'today';
  if (daysDiff === 1) return 'tomorrow';
  if (daysDiff <= 7) return 'next_week';
  if (daysDiff <= 30) return 'next_month';
  return 'sometime';
}

function getDueDateForBucket(bucket: ReminderBucket): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (bucket) {
    case 'today': return today;
    case 'tomorrow': return addDays(today, 1);
    case 'next_week': return addDays(today, 3);
    case 'next_month': return addDays(today, 14);
    case 'sometime': return null;
  }
}

export function generateICS(reminders: Reminder[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ActionMinutes//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const reminder of reminders) {
    if (!reminder.dueDate || reminder.isCompleted) continue;
    
    const date = new Date(reminder.dueDate);
    const nextDay = addDays(date, 1);
    const dateStr = format(date, 'yyyyMMdd');
    const endDateStr = format(nextDay, 'yyyyMMdd');
    const uid = `${reminder.id}@actionminutes`;
    
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`DTEND;VALUE=DATE:${endDateStr}`);
    lines.push(`SUMMARY:${reminder.text.replace(/[,;\\]/g, ' ')}`);
    if (reminder.notes) {
      lines.push(`DESCRIPTION:${reminder.notes.replace(/[,;\\]/g, ' ').replace(/\n/g, '\\n')}`);
    }
    lines.push(`CATEGORIES:${reminder.priority.toUpperCase()}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export default function RemindersPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [quickAddText, setQuickAddText] = useState("");
  const [quickAddBucket, setQuickAddBucket] = useState<ReminderBucket>("today");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editText, setEditText] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPriority, setEditPriority] = useState("normal");
  const [editBucket, setEditBucket] = useState<ReminderBucket>("sometime");
  const [showCompleted, setShowCompleted] = useState(false);
  
  const [draggedReminder, setDraggedReminder] = useState<Reminder | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<ReminderBucket | null>(null);
  
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load reminders');
      return res.json() as Promise<Reminder[]>;
    },
    enabled: !!user.id && user.isAuthenticated,
  });
  
  const createReminder = useMutation({
    mutationFn: async (data: { text: string; bucket: ReminderBucket; priority?: string; dueDate?: string }) => {
      const res = await fetch('/api/personal/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to create reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setQuickAddText("");
      toast({ title: "Reminder added" });
    },
  });
  
  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const res = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to update reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
  
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: "Reminder deleted" });
    },
  });
  
  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return;
    const dueDate = getDueDateForBucket(quickAddBucket);
    createReminder.mutate({ 
      text: quickAddText, 
      bucket: quickAddBucket,
      dueDate: dueDate?.toISOString(),
    });
  };
  
  const handleDragStart = (e: React.DragEvent, reminder: Reminder) => {
    setDraggedReminder(reminder);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, bucket: ReminderBucket) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverBucket(bucket);
  };
  
  const handleDragLeave = () => {
    setDragOverBucket(null);
  };
  
  const handleDrop = (e: React.DragEvent, bucket: ReminderBucket) => {
    e.preventDefault();
    setDragOverBucket(null);
    
    if (draggedReminder && draggedReminder.bucket !== bucket) {
      const dueDate = getDueDateForBucket(bucket);
      updateReminder.mutate({ 
        id: draggedReminder.id, 
        bucket,
        dueDate: dueDate?.toISOString() || null,
      });
      toast({ title: `Moved to ${BUCKETS.find(b => b.value === bucket)?.label}` });
    }
    setDraggedReminder(null);
  };
  
  const handleSnooze = (reminder: Reminder, toBucket: ReminderBucket) => {
    const dueDate = getDueDateForBucket(toBucket);
    updateReminder.mutate({ 
      id: reminder.id, 
      bucket: toBucket,
      dueDate: dueDate?.toISOString() || null,
    });
    toast({ title: `Snoozed to ${BUCKETS.find(b => b.value === toBucket)?.label}` });
  };
  
  const handleComplete = (reminder: Reminder) => {
    updateReminder.mutate({ 
      id: reminder.id, 
      isCompleted: true,
    });
    toast({ title: "Marked as done" });
  };
  
  const handleUncomplete = (reminder: Reminder) => {
    updateReminder.mutate({ 
      id: reminder.id, 
      isCompleted: false,
      completedAt: null,
    });
  };
  
  const handleRebucket = (reminder: Reminder) => {
    if (!reminder.dueDate) {
      toast({ title: "No due date set", variant: "destructive" });
      return;
    }
    const newBucket = computeBucketFromDate(new Date(reminder.dueDate));
    if (newBucket !== reminder.bucket) {
      updateReminder.mutate({ id: reminder.id, bucket: newBucket });
      toast({ title: `Rebucketed to ${BUCKETS.find(b => b.value === newBucket)?.label}` });
    }
  };
  
  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditText(reminder.text);
    setEditNotes(reminder.notes || "");
    setEditPriority(reminder.priority);
    setEditBucket(reminder.bucket);
    setShowEditDialog(true);
  };
  
  const handleSaveEdit = () => {
    if (!editingReminder) return;
    const dueDate = getDueDateForBucket(editBucket);
    updateReminder.mutate({
      id: editingReminder.id,
      text: editText,
      notes: editNotes || null,
      priority: editPriority,
      bucket: editBucket,
      dueDate: dueDate?.toISOString() || null,
    });
    setShowEditDialog(false);
    setEditingReminder(null);
    toast({ title: "Reminder updated" });
  };
  
  const handleExportICS = () => {
    const ics = generateICS(reminders);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reminders.ics';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Calendar exported" });
  };
  
  const getBucketReminders = (bucket: ReminderBucket) => {
    return reminders.filter(r => r.bucket === bucket && !r.isCompleted);
  };
  
  const completedReminders = reminders
    .filter(r => r.isCompleted)
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Reminders</h1>
          <p className="text-gray-500 text-base mt-1">Personal tasks organized by when you'll do them</p>
        </div>
        <Button 
          onClick={handleExportICS}
          variant="outline"
          className="rounded-xl"
          data-testid="button-export-ics"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      
      <div className="flex gap-2 items-center bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
        <Input
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          placeholder="Add a reminder..."
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base"
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          data-testid="input-quick-add"
        />
        <Select value={quickAddBucket} onValueChange={(v) => setQuickAddBucket(v as ReminderBucket)}>
          <SelectTrigger className="w-auto border-0 bg-gray-100 rounded-lg" data-testid="select-quick-bucket">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUCKETS.map((bucket) => (
              <SelectItem key={bucket.value} value={bucket.value}>
                <span className="flex items-center gap-2">
                  <bucket.icon className={`h-4 w-4 ${bucket.color}`} />
                  {bucket.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleQuickAdd}
          disabled={!quickAddText.trim() || createReminder.isPending}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600"
          data-testid="button-quick-add"
        >
          {createReminder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {BUCKETS.map((bucket) => {
          const bucketReminders = getBucketReminders(bucket.value);
          const BucketIcon = bucket.icon;
          const isDragOver = dragOverBucket === bucket.value;
          
          return (
            <div
              key={bucket.value}
              className={`rounded-xl border-2 transition-all min-h-[200px] ${
                isDragOver 
                  ? 'border-indigo-400 bg-indigo-50/50 scale-[1.02]' 
                  : `border-gray-200 ${bucket.bgColor}`
              }`}
              onDragOver={(e) => handleDragOver(e, bucket.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, bucket.value)}
              data-testid={`bucket-${bucket.value}`}
            >
              <div className={`p-3 border-b ${isDragOver ? 'border-indigo-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BucketIcon className={`h-4 w-4 ${bucket.color}`} />
                    <span className="font-medium text-slate-700 text-sm">{bucket.label}</span>
                  </div>
                  {bucketReminders.length > 0 && (
                    <span className="text-xs bg-white/80 text-slate-600 rounded-full px-2 py-0.5">
                      {bucketReminders.length}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-2 space-y-2">
                {bucketReminders.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Drop here or add new</p>
                ) : (
                  bucketReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, reminder)}
                      className={`bg-white rounded-lg border border-gray-200 p-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
                        draggedReminder?.id === reminder.id ? 'opacity-50' : ''
                      }`}
                      data-testid={`reminder-${reminder.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => handleComplete(reminder)}
                          className="shrink-0 mt-0.5 p-0.5 rounded-full hover:bg-gray-100"
                          data-testid={`complete-${reminder.id}`}
                        >
                          <Circle className="h-4 w-4 text-gray-300 hover:text-green-500" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-tight">{reminder.text}</p>
                          {reminder.priority === 'high' && (
                            <span className="text-xs text-red-500">High priority</span>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="shrink-0 p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-3 w-3 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditDialog(reminder)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleSnooze(reminder, 'tomorrow')}
                              disabled={reminder.bucket === 'tomorrow'}
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Snooze to Tomorrow
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSnooze(reminder, 'next_week')}
                              disabled={reminder.bucket === 'next_week'}
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Snooze to Next Week
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSnooze(reminder, 'sometime')}
                              disabled={reminder.bucket === 'sometime'}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Move to Sometime
                            </DropdownMenuItem>
                            {reminder.dueDate && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleRebucket(reminder)}>
                                  Rebucket from date
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteReminder.mutate(reminder.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {completedReminders.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            data-testid="toggle-completed"
          >
            <CheckCircle className="h-4 w-4 text-green-500" />
            Recently done ({completedReminders.length})
            <ChevronRight className={`h-4 w-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
          </button>
          
          {showCompleted && (
            <div className="mt-3 space-y-2">
              {completedReminders.slice(0, 10).map((reminder) => (
                <div 
                  key={reminder.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => handleUncomplete(reminder)}
                    className="shrink-0"
                    data-testid={`uncomplete-${reminder.id}`}
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </button>
                  <span className="text-sm text-gray-500 line-through flex-1">{reminder.text}</span>
                  {reminder.completedAt && (
                    <span className="text-xs text-gray-400">
                      {format(new Date(reminder.completedAt), 'MMM d')}
                    </span>
                  )}
                  <button
                    onClick={() => deleteReminder.mutate(reminder.id)}
                    className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Reminder</label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="bg-gray-50 border-gray-200 rounded-xl"
                data-testid="input-edit-text"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">Notes (optional)</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add details..."
                className="bg-gray-50 border-gray-200 rounded-xl min-h-[80px]"
                data-testid="input-edit-notes"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">When</label>
                <Select value={editBucket} onValueChange={(v) => setEditBucket(v as ReminderBucket)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKETS.map((bucket) => (
                      <SelectItem key={bucket.value} value={bucket.value}>
                        <span className="flex items-center gap-2">
                          <bucket.icon className={`h-4 w-4 ${bucket.color}`} />
                          {bucket.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Priority</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
                data-testid="button-save-edit"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
