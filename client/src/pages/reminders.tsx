import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sun, SunHorizon, CalendarDots, CalendarBlank, Sparkle, 
  Plus, SpinnerGap, CheckCircle, Circle, Trash, DotsSixVertical,
  CaretRight, DotsThree, ArrowRight, Export, Rocket, Coffee, 
  FireSimple, Moon, Heart
} from "@phosphor-icons/react";
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
import { cn } from "@/lib/utils";

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

const BUCKETS: { 
  value: ReminderBucket; 
  label: string; 
  icon: typeof Sun; 
  color: string; 
  glowColor: string;
  emptyIcon: typeof Rocket;
  emptyText: string;
  emptySubtext: string;
}[] = [
  { 
    value: "today", 
    label: "Today", 
    icon: Sun, 
    color: "text-amber-400", 
    glowColor: "shadow-amber-500/20",
    emptyIcon: FireSimple,
    emptyText: "All clear!",
    emptySubtext: "Nothing urgent today"
  },
  { 
    value: "tomorrow", 
    label: "Tomorrow", 
    icon: SunHorizon, 
    color: "text-orange-400", 
    glowColor: "shadow-orange-500/20",
    emptyIcon: Coffee,
    emptyText: "Free day ahead",
    emptySubtext: "Enjoy the breathing room"
  },
  { 
    value: "next_week", 
    label: "Next Week", 
    icon: CalendarDots, 
    color: "text-sky-400", 
    glowColor: "shadow-sky-500/20",
    emptyIcon: Rocket,
    emptyText: "Week looks open",
    emptySubtext: "Add tasks to plan ahead"
  },
  { 
    value: "next_month", 
    label: "Next Month", 
    icon: CalendarBlank, 
    color: "text-primary", 
    glowColor: "shadow-primary/20",
    emptyIcon: Moon,
    emptyText: "Month is clear",
    emptySubtext: "Long-term planning space"
  },
  { 
    value: "sometime", 
    label: "Sometime", 
    icon: Sparkle, 
    color: "text-fuchsia-400", 
    glowColor: "shadow-fuchsia-500/20",
    emptyIcon: Heart,
    emptyText: "Wishlist empty",
    emptySubtext: "Save ideas for later"
  },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-muted-foreground" },
  { value: "normal", label: "Normal", color: "text-sky-400" },
  { value: "high", label: "High", color: "text-red-400" },
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
  const [editBucket, setEditBucket] = useState<ReminderBucket>("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [draggedReminder, setDraggedReminder] = useState<Reminder | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<ReminderBucket | null>(null);
  
  // Mobile tab state
  const [activeMobileTab, setActiveMobileTab] = useState<ReminderBucket>("today");

  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({
    queryKey: ['/api/personal/reminders', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch reminders');
      return res.json();
    },
    enabled: !!user.id,
  });

  const createReminder = useMutation({
    mutationFn: async (data: Partial<Reminder>) => {
      const res = await fetch('/api/personal/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to create reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders', user.id] });
      toast({ title: "Reminder added" });
    },
    onError: () => {
      toast({ title: "Failed to add reminder", variant: "destructive" });
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Reminder>) => {
      const res = await fetch(`/api/personal/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to update reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders', user.id] });
    },
    onError: () => {
      toast({ title: "Failed to update reminder", variant: "destructive" });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reminder');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders', user.id] });
      toast({ title: "Reminder deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete reminder", variant: "destructive" });
    },
  });

  const handleQuickAdd = () => {
    if (!quickAddText.trim()) return;
    const dueDate = getDueDateForBucket(quickAddBucket);
    createReminder.mutate({
      text: quickAddText,
      bucket: quickAddBucket,
      dueDate: dueDate?.toISOString() || null,
      priority: 'normal',
    });
    setQuickAddText("");
  };

  const handleComplete = (reminder: Reminder) => {
    updateReminder.mutate({ 
      id: reminder.id, 
      isCompleted: true,
      completedAt: new Date().toISOString(),
    });
    toast({ title: "Nice work!", description: "Task completed" });
  };

  const handleUncomplete = (reminder: Reminder) => {
    updateReminder.mutate({ 
      id: reminder.id, 
      isCompleted: false,
      completedAt: null,
    });
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

  const handleRebucket = (reminder: Reminder) => {
    if (!reminder.dueDate) return;
    const newBucket = computeBucketFromDate(new Date(reminder.dueDate));
    if (newBucket !== reminder.bucket) {
      updateReminder.mutate({ id: reminder.id, bucket: newBucket });
      toast({ title: `Moved to ${BUCKETS.find(b => b.value === newBucket)?.label}` });
    }
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

  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditText(reminder.text);
    setEditNotes(reminder.notes || "");
    setEditPriority(reminder.priority);
    setEditBucket(reminder.bucket);
    setShowEditDialog(true);
  };

  const saveEditedReminder = () => {
    if (!editingReminder || !editText.trim()) return;
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
        <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
      </div>
    );
  }

  // Render a single bucket card
  const renderBucketCard = (bucket: typeof BUCKETS[0], isSpan2 = false) => {
    const bucketReminders = getBucketReminders(bucket.value);
    const BucketIcon = bucket.icon;
    const EmptyIcon = bucket.emptyIcon;
    const isDragOver = dragOverBucket === bucket.value;
    
    return (
      <div
        key={bucket.value}
        className={cn(
          "glass-panel rounded-2xl transition-all duration-300 min-h-[180px] flex flex-col",
          isDragOver && "border-primary/50 bg-accent scale-[1.02]",
          isSpan2 && "md:col-span-2"
        )}
        onDragOver={(e) => handleDragOver(e, bucket.value)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, bucket.value)}
        data-testid={`bucket-${bucket.value}`}
      >
        {/* Bucket Header */}
        <div className={cn(
          "p-4 border-b border-border flex items-center justify-between",
          isDragOver && "border-primary/30"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              bucket.color.replace('text-', 'bg-').replace('-400', '-500/20')
            )}>
              <BucketIcon className={cn("h-4 w-4", bucket.color)} weight="duotone" />
            </div>
            <span className="font-semibold text-foreground text-sm">{bucket.label}</span>
          </div>
          {bucketReminders.length > 0 && (
            <span className={cn(
              "text-xs font-medium rounded-full px-2.5 py-1",
              bucket.color.replace('text-', 'bg-').replace('-400', '-500/20'),
              bucket.color
            )}>
              {bucketReminders.length}
            </span>
          )}
        </div>
        
        {/* Bucket Content */}
        <div className="p-3 flex-1 space-y-2 overflow-y-auto max-h-[300px]">
          {bucketReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-center">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-3",
                bucket.color.replace('text-', 'bg-').replace('-400', '-500/10')
              )}>
                <EmptyIcon className={cn("h-6 w-6", bucket.color)} weight="duotone" />
              </div>
              <p className="text-foreground text-sm font-medium">{bucket.emptyText}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{bucket.emptySubtext}</p>
            </div>
          ) : (
            bucketReminders.map((reminder) => (
              <div
                key={reminder.id}
                draggable
                onDragStart={(e) => handleDragStart(e, reminder)}
                className={cn(
                  "bg-accent hover:bg-accent rounded-xl border border-border p-3 cursor-grab active:cursor-grabbing transition-all group",
                  draggedReminder?.id === reminder.id && "opacity-50"
                )}
                data-testid={`reminder-${reminder.id}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleComplete(reminder)}
                    className="shrink-0 mt-0.5 p-0.5 rounded-full hover:bg-accent transition-colors"
                    data-testid={`complete-${reminder.id}`}
                  >
                    <Circle className="h-5 w-5 text-muted-foreground hover:text-green-400" weight="regular" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{reminder.text}</p>
                    {reminder.priority === 'high' && (
                      <span className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <FireSimple className="h-3 w-3" weight="fill" />
                        High priority
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="shrink-0 p-1.5 rounded-lg hover:bg-accent opacity-0 group-hover:opacity-100 transition-all">
                        <DotsThree className="h-4 w-4 text-muted-foreground" weight="bold" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 glass-panel border-border text-foreground">
                      <DropdownMenuItem onClick={() => openEditDialog(reminder)} className="text-foreground focus:text-foreground focus:bg-accent">
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem 
                        onClick={() => handleSnooze(reminder, 'tomorrow')}
                        disabled={reminder.bucket === 'tomorrow'}
                        className="text-foreground focus:text-foreground focus:bg-accent"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" weight="bold" />
                        Snooze to Tomorrow
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSnooze(reminder, 'next_week')}
                        disabled={reminder.bucket === 'next_week'}
                        className="text-foreground focus:text-foreground focus:bg-accent"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" weight="bold" />
                        Snooze to Next Week
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSnooze(reminder, 'sometime')}
                        disabled={reminder.bucket === 'sometime'}
                        className="text-foreground focus:text-foreground focus:bg-accent"
                      >
                        <Sparkle className="h-4 w-4 mr-2" weight="duotone" />
                        Move to Sometime
                      </DropdownMenuItem>
                      {reminder.dueDate && (
                        <>
                          <DropdownMenuSeparator className="bg-border" />
                          <DropdownMenuItem onClick={() => handleRebucket(reminder)} className="text-foreground focus:text-foreground focus:bg-accent">
                            Rebucket from date
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem 
                        onClick={() => deleteReminder.mutate(reminder.id)}
                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
                      >
                        <Trash className="h-4 w-4 mr-2" weight="duotone" />
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
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gradient-light">Reminders</h1>
          <p className="text-muted-foreground text-base mt-1">Personal tasks organized by when you'll do them</p>
        </div>
        <Button 
          onClick={handleExportICS}
          variant="outline"
          className="rounded-xl"
          data-testid="button-export-ics"
        >
          <Export className="h-4 w-4 mr-2" weight="duotone" />
          Export
        </Button>
      </div>
      
      {/* Quick Add */}
      <div className="flex gap-2 items-center glass-panel rounded-xl p-2">
        <Input
          value={quickAddText}
          onChange={(e) => setQuickAddText(e.target.value)}
          placeholder="Add a reminder..."
          className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-base text-foreground placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          data-testid="input-quick-add"
        />
        <Select value={quickAddBucket} onValueChange={(v) => setQuickAddBucket(v as ReminderBucket)}>
          <SelectTrigger className="w-auto border-0 bg-accent rounded-lg text-foreground" data-testid="select-quick-bucket">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-panel border-border">
            {BUCKETS.map((bucket) => (
              <SelectItem key={bucket.value} value={bucket.value} className="text-foreground focus:bg-accent focus:text-foreground">
                <span className="flex items-center gap-2">
                  <bucket.icon className={cn("h-4 w-4", bucket.color)} weight="duotone" />
                  {bucket.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleQuickAdd}
          disabled={!quickAddText.trim() || createReminder.isPending}
          className="rounded-xl btn-gradient"
          data-testid="button-quick-add"
        >
          {createReminder.isPending ? <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" /> : <Plus className="h-4 w-4" weight="bold" />}
        </Button>
      </div>
      
      {/* Mobile Tab Selector - Only visible on mobile */}
      <div className="md:hidden">
        <div className="flex gap-1 p-1 glass-panel rounded-xl overflow-x-auto">
          {BUCKETS.map((bucket) => {
            const count = getBucketReminders(bucket.value).length;
            const isActive = activeMobileTab === bucket.value;
            return (
              <button
                key={bucket.value}
                onClick={() => setActiveMobileTab(bucket.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
                  isActive 
                    ? cn("bg-accent text-foreground", bucket.color.replace('text-', 'border-l-2 border-'))
                    : "text-muted-foreground"
                )}
              >
                <bucket.icon className={cn("h-4 w-4", isActive ? bucket.color : "text-muted-foreground")} weight="duotone" />
                {bucket.label}
                {count > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-accent text-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Mobile Active Tab Content */}
        <div className="mt-3">
          {renderBucketCard(BUCKETS.find(b => b.value === activeMobileTab)!)}
        </div>
      </div>
      
      {/* Desktop Bento Grid - Hidden on mobile */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {/* Today - Spans 2 columns */}
        {renderBucketCard(BUCKETS[0], true)}
        
        {/* Tomorrow */}
        {renderBucketCard(BUCKETS[1])}
        
        {/* Next Week */}
        {renderBucketCard(BUCKETS[2])}
        
        {/* Next Month */}
        {renderBucketCard(BUCKETS[3])}
        
        {/* Sometime */}
        {renderBucketCard(BUCKETS[4])}
      </div>
      
      {/* Completed Section */}
      {completedReminders.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="toggle-completed"
          >
            <CheckCircle className="h-4 w-4 text-green-400" weight="fill" />
            Recently done ({completedReminders.length})
            <CaretRight className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-90")} weight="bold" />
          </button>
          
          {showCompleted && (
            <div className="mt-3 space-y-2">
              {completedReminders.slice(0, 10).map((reminder) => (
                <div 
                  key={reminder.id}
                  className="flex items-center gap-3 p-3 glass-panel rounded-xl opacity-60 hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => handleUncomplete(reminder)}
                    className="shrink-0"
                    data-testid={`uncomplete-${reminder.id}`}
                  >
                    <CheckCircle className="h-5 w-5 text-green-400" weight="fill" />
                  </button>
                  <span className="text-sm text-muted-foreground line-through flex-1">{reminder.text}</span>
                  {reminder.completedAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reminder.completedAt), 'MMM d')}
                    </span>
                  )}
                  <button
                    onClick={() => deleteReminder.mutate(reminder.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash className="h-4 w-4" weight="duotone" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="glass-panel border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">What</label>
              <Input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Reminder text..."
                className="bg-accent border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="bg-accent border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">When</label>
                <Select value={editBucket} onValueChange={(v) => setEditBucket(v as ReminderBucket)}>
                  <SelectTrigger className="bg-accent border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border">
                    {BUCKETS.map((bucket) => (
                      <SelectItem key={bucket.value} value={bucket.value} className="text-foreground focus:bg-accent focus:text-foreground">
                        <span className="flex items-center gap-2">
                          <bucket.icon className={cn("h-4 w-4", bucket.color)} weight="duotone" />
                          {bucket.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Priority</label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="bg-accent border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-foreground focus:bg-accent focus:text-foreground">
                        <span className={opt.color}>{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveEditedReminder} className="flex-1 btn-gradient">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
