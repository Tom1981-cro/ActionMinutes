import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
import { QuickAdd } from "@/components/quick-add";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  isSameMonth,
  parseISO,
  differenceInMinutes
} from "date-fns";
import { 
  CaretLeft, 
  CaretRight, 
  Plus,
  ArrowsClockwise,
  Warning,
  Lightning,
  NotePencil,
  Timer,
  Video,
  DotsSixVertical,
  Tray,
  BellRinging,
  DotsThree,
  CalendarBlank
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  provider: 'google' | 'microsoft' | 'local';
  status: string;
  color?: string;
  meetingId?: string;
}

interface TaskItem {
  id: string;
  title: string;
  text?: string;
  dueDate: string | null;
  estimatedMinutes?: number;
  priority: string;
  status: string;
  isCompleted?: boolean;
  type: 'task' | 'reminder';
  listId?: string;
}

interface CustomList {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

const CAPACITY_HOURS = 8;
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getEventDurationMinutes(event: CalendarEvent): number {
  if (event.allDay) return 480;
  try {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    const mins = differenceInMinutes(end, start);
    return mins > 0 ? mins : 60;
  } catch {
    return 60;
  }
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [meetingPrepEvent, setMeetingPrepEvent] = useState<CalendarEvent | null>(null);
  const [draggedItem, setDraggedItem] = useState<TaskItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const [showLists, setShowLists] = useState<Record<string, boolean>>({
    inbox: true,
    reminders: true,
  });
  const [showListIds, setShowListIds] = useState<Record<string, boolean>>({});

  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    };
  }, [currentDate]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/calendar/events', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      const response = await authenticatedFetch(
        `/api/calendar/events?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      return data.events || [];
    }
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['/api/calendar/providers'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/calendar/providers');
      if (!response.ok) throw new Error("Failed to fetch providers");
      const data = await response.json();
      return data.providers || [];
    }
  });

  const { data: allReminders = [] } = useQuery({
    queryKey: ['/api/personal/reminders', user.id],
    queryFn: async () => {
      if (!user.id) return [];
      const response = await authenticatedFetch(`/api/personal/reminders?userId=${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user.id
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/tasks', user.id],
    queryFn: async () => {
      if (!user.id) return [];
      const response = await authenticatedFetch(`/api/tasks?userId=${user.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user.id
  });

  const { data: customLists = [] } = useQuery<CustomList[]>({
    queryKey: ['custom-lists', user.id],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/lists');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id
  });

  useEffect(() => {
    if (customLists.length > 0) {
      setShowListIds(prev => {
        const next = { ...prev };
        for (const list of customLists) {
          if (!(list.id in next)) {
            next[list.id] = true;
          }
        }
        return next;
      });
    }
  }, [customLists]);

  const unifiedItems: TaskItem[] = useMemo(() => {
    const items: TaskItem[] = [];
    if (showLists.reminders !== false) {
      for (const r of allReminders) {
        if (r.deletedAt || r.isCompleted) continue;
        items.push({
          id: r.id,
          title: r.text,
          dueDate: r.dueDate || null,
          estimatedMinutes: 30,
          priority: r.priority || 'normal',
          status: r.status || 'open',
          isCompleted: r.isCompleted,
          type: 'reminder'
        });
      }
    }
    for (const t of allTasks) {
      if (t.deletedAt || t.status === 'done' || t.status === 'completed') continue;
      if (t.listId) {
        if (showListIds[t.listId] === false) continue;
      } else {
        if (showLists.inbox === false) continue;
      }
      items.push({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate || null,
        estimatedMinutes: t.estimatedMinutes || 30,
        priority: t.priority || 'medium',
        status: t.status || 'todo',
        type: 'task',
        listId: t.listId
      });
    }
    return items;
  }, [allReminders, allTasks, showLists, showListIds]);

  const backlogItems = useMemo(() => {
    return unifiedItems.filter(item => !item.dueDate);
  }, [unifiedItems]);

  const scheduledItems = useMemo(() => {
    return unifiedItems.filter(item => item.dueDate);
  }, [unifiedItems]);

  const getTasksForDate = (date: Date): TaskItem[] => {
    return scheduledItems.filter(item => {
      if (!item.dueDate) return false;
      try {
        return isSameDay(parseISO(item.dueDate), date);
      } catch {
        return false;
      }
    });
  };

  const getDayLoad = (date: Date): { totalMinutes: number; percentage: number; isOverloaded: boolean } => {
    const dayEvents = getEventsForDate(date);
    const dayTasks = getTasksForDate(date);
    const eventMinutes = dayEvents.reduce((sum: number, e: CalendarEvent) => sum + getEventDurationMinutes(e), 0);
    const taskMinutes = dayTasks.reduce((sum: number, t: TaskItem) => sum + (t.estimatedMinutes || 30), 0);
    const totalMinutes = eventMinutes + taskMinutes;
    const percentage = Math.min((totalMinutes / (CAPACITY_HOURS * 60)) * 100, 150);
    return { totalMinutes, percentage, isOverloaded: totalMinutes > CAPACITY_HOURS * 60 };
  };

  const syncMutation = useMutation({
    mutationFn: async (provider: string) => {
      const response = await authenticatedFetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      toast({ title: `Synced ${data.synced} events` });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    }
  });

  const assignTaskToDate = useMutation({
    mutationFn: async ({ item, date }: { item: TaskItem; date: Date }) => {
      const endpoint = item.type === 'reminder' 
        ? `/api/personal/reminders/${item.id}`
        : `/api/tasks/${item.id}`;
      const method = item.type === 'reminder' ? 'PATCH' : 'PUT';
      const response = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: date.toISOString() })
      });
      if (!response.ok) throw new Error("Failed to schedule task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: "Task scheduled!" });
    },
    onError: () => {
      toast({ title: "Failed to schedule task", variant: "destructive" });
    }
  });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event: CalendarEvent) => {
      const eventStart = parseISO(event.startTime);
      return isSameDay(eventStart, date);
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setQuickAddDate(day);
    setQuickAddOpen(true);
  };

  const handleMeetingPrep = (event: CalendarEvent, action: 'agenda' | 'notes') => {
    setMeetingPrepEvent(null);
    if (action === 'notes') {
      navigate(`/app/journal?meetingTitle=${encodeURIComponent(event.title)}&meetingDate=${encodeURIComponent(event.startTime)}`);
    } else {
      navigate(`/app/notes?newNote=true&title=${encodeURIComponent(`Agenda: ${event.title}`)}&meetingDate=${encodeURIComponent(event.startTime)}`);
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, item: TaskItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDate(null);
    if (draggedItem) {
      assignTaskToDate.mutate({ item: draggedItem, date: day });
      setDraggedItem(null);
    }
  }, [draggedItem, assignTaskToDate]);

  const toggleList = (key: string) => {
    setShowLists(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCustomList = (id: string) => {
    setShowListIds(prev => ({ ...prev, [id]: prev[id] === false }));
  };

  const googleProvider = providers.find((p: any) => p.id === 'google');
  const microsoftProvider = providers.find((p: any) => p.id === 'microsoft');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <TooltipProvider>
      <div className="pb-6">
        {/* Main layout: Calendar grid + Right sidebar */}
        <div className="flex gap-0">
          {/* Calendar grid - flexible width */}
          <div className="flex-1 min-w-0">
            {/* Header row inside grid area */}
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-calendar-title">
                {format(currentDate, "MMMM yyyy")}
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setQuickAddDate(selectedDate || new Date()); setQuickAddOpen(true); }}
                  data-testid="button-create-event"
                >
                  <Plus className="h-4 w-4" weight="bold" />
                </Button>
                <span className="text-sm text-muted-foreground">Month</span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="h-7 w-7"
                    data-testid="button-prev"
                  >
                    <CaretLeft className="h-4 w-4" weight="bold" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="h-7 w-7"
                    data-testid="button-next"
                  >
                    <CaretRight className="h-4 w-4" weight="bold" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-sm font-medium"
                  data-testid="button-today"
                >
                  Today
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-more-options">
                  <DotsThree className="h-4 w-4" weight="bold" />
                </Button>
              </div>
            </div>

            {/* Calendar table */}
            <div className="border border-border rounded-xl overflow-hidden bg-card" data-testid="card-calendar-grid">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {DAY_HEADERS.map(day => (
                  <div key={day} className="text-center text-xs font-semibold py-2 text-muted-foreground tracking-wider border-r border-border last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar rows */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 border-b border-border last:border-b-0">
                  {week.map((day, dayIdx) => {
                    const dayEvents = getEventsForDate(day);
                    const dayTasks = getTasksForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const dayLoad = getDayLoad(day);
                    const hasItems = dayEvents.length > 0 || dayTasks.length > 0;
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isDragOver = dragOverDate === dateStr;

                    return (
                      <div
                        key={dayIdx}
                        onClick={() => handleDateClick(day)}
                        onDragOver={(e) => handleDragOver(e, dateStr)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day)}
                        className={cn(
                          "min-h-[100px] p-1.5 border-r border-border last:border-r-0 flex flex-col cursor-pointer transition-colors",
                          !isCurrentMonth && "bg-muted/20",
                          isSelected && "bg-accent/40",
                          isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/30"
                        )}
                        data-testid={`calendar-day-${dateStr}`}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn(
                            "text-sm w-7 h-7 flex items-center justify-center rounded-full",
                            isTodayDate && "bg-primary text-primary-foreground font-bold",
                            !isTodayDate && isCurrentMonth && "text-foreground",
                            !isCurrentMonth && "text-muted-foreground/40"
                          )}>
                            {isSameDay(day, startOfMonth(addMonths(currentDate, 1))) || isSameDay(day, startOfMonth(currentDate))
                              ? format(day, 'MMM d')
                              : format(day, 'd')}
                          </span>
                          {dayLoad.isOverloaded && isCurrentMonth && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Warning className="h-3 w-3 text-destructive" weight="fill" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {Math.round(dayLoad.totalMinutes / 60 * 10) / 10}h / {CAPACITY_HOURS}h
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Events and tasks */}
                        <div className="space-y-0.5 flex-1 overflow-hidden">
                          {dayEvents.slice(0, 4).map((event: CalendarEvent) => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (event.provider !== 'local') setMeetingPrepEvent(event);
                              }}
                              className={cn(
                                "text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1",
                                event.provider !== 'local' && "cursor-pointer"
                              )}
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                                color: 'var(--primary)'
                              }}
                              data-testid={`event-${event.id}`}
                            >
                              <span className="truncate">{event.title}</span>
                              {!event.allDay && (
                                <span className="text-[9px] opacity-70 flex-shrink-0">
                                  {format(parseISO(event.startTime), 'H:mm')}
                                </span>
                              )}
                            </div>
                          ))}
                          {dayTasks.slice(0, 4 - Math.min(dayEvents.length, 4)).map((task) => (
                            <div
                              key={task.id}
                              className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1"
                              style={{
                                backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                                color: 'var(--foreground)',
                                opacity: 0.8
                              }}
                              data-testid={`task-${task.id}`}
                            >
                              <span className="truncate">{task.title}</span>
                            </div>
                          ))}
                          {(dayEvents.length + dayTasks.length) > 4 && (
                            <div className="text-[9px] text-muted-foreground px-1.5 font-medium">
                              +{dayEvents.length + dayTasks.length - 4} more
                            </div>
                          )}
                        </div>

                        {/* Capacity bar */}
                        {hasItems && isCurrentMonth && (
                          <div className="mt-auto pt-0.5">
                            <div className="h-[2px] bg-muted rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${Math.min(dayLoad.percentage, 100)}%` }} 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  dayLoad.percentage >= 100 ? "bg-destructive" : dayLoad.percentage >= 75 ? "bg-warning" : "bg-success"
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-[220px] flex-shrink-0 pl-4 space-y-3">
            {/* Show/hide filters */}
            <div className="glass-panel rounded-xl p-3" data-testid="card-list-filters">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Show</span>
              </div>

              <div className="space-y-1.5">
                {/* All toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showLists.inbox && showLists.reminders && customLists.every(l => showListIds[l.id] !== false)}
                    onCheckedChange={(checked) => {
                      const val = !!checked;
                      setShowLists({ inbox: val, reminders: val });
                      const newIds: Record<string, boolean> = {};
                      customLists.forEach(l => { newIds[l.id] = val; });
                      setShowListIds(newIds);
                    }}
                    className="h-4 w-4 rounded-full"
                    data-testid="filter-all"
                  />
                  <span className="text-xs font-medium text-foreground">All</span>
                </label>

                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Lists</div>

                <label className="flex items-center gap-2 cursor-pointer mt-[0px] mb-[0px] text-[12px]">
                  <Checkbox
                    checked={showLists.inbox !== false}
                    onCheckedChange={() => toggleList('inbox')}
                    className="h-4 w-4 rounded-full"
                    data-testid="filter-inbox"
                  />
                  <Tray className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
                  <span className="text-xs text-foreground">Inbox</span>
                </label>

                {customLists.map(list => (
                  <label key={list.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showListIds[list.id] !== false}
                      onCheckedChange={() => toggleCustomList(list.id)}
                      className="h-4 w-4 rounded-full"
                      data-testid={`filter-list-${list.id}`}
                    />
                    <div 
                      className="w-3.5 h-3.5 rounded flex-shrink-0"
                      style={{ backgroundColor: list.color || 'var(--muted-foreground)' }}
                    />
                    <span className="text-xs text-foreground truncate">{list.name}</span>
                  </label>
                ))}

                <label className="flex items-center gap-2 cursor-pointer pt-[4px] pb-[4px]">
                  <Checkbox
                    checked={showLists.reminders !== false}
                    onCheckedChange={() => toggleList('reminders')}
                    className="h-4 w-4 rounded-full"
                    data-testid="filter-reminders"
                  />
                  <BellRinging className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
                  <span className="text-xs text-foreground">Reminders</span>
                </label>

                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2 mb-1">Tags</div>
                <p className="text-[10px] text-muted-foreground">Tag filtering coming soon</p>
              </div>
            </div>

            {/* Unscheduled Tasks */}
            <div className="glass-panel rounded-xl p-3" data-testid="card-unscheduled-tasks">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unscheduled</span>
                <span className="text-[10px] text-muted-foreground">{backlogItems.length}</span>
              </div>
              
              {backlogItems.length === 0 ? (
                <div className="text-center py-3 text-muted-foreground">
                  <CalendarBlank className="h-5 w-5 mx-auto mb-1 opacity-40" weight="duotone" />
                  <p className="text-[10px]">All tasks scheduled</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {backlogItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      className={cn(
                        "group p-2 rounded-lg border bg-card border-border cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all",
                        draggedItem?.id === item.id && "opacity-50 ring-1 ring-primary/30"
                      )}
                      data-testid={`backlog-item-${item.id}`}
                    >
                      <div className="flex items-start gap-1.5">
                        <DotsSixVertical className="h-3.5 w-3.5 text-muted-foreground/30 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground transition-colors" weight="bold" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2" data-testid={`text-backlog-title-${item.id}`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Timer className="h-2.5 w-2.5" />
                              {item.estimatedMinutes ? `${item.estimatedMinutes}m` : "30m"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="w-full mt-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30 rounded-lg transition-colors text-center"
                onClick={() => { setQuickAddDate(null); setQuickAddOpen(true); }}
                data-testid="button-add-backlog"
              >
                + Add task
              </button>
            </div>

            {/* Sync Status */}
            <div className="glass-panel rounded-xl p-3" data-testid="card-sync-status">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowsClockwise className="h-3 w-3 text-muted-foreground" weight="bold" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sync</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      googleProvider?.connected ? "bg-success" : "bg-muted-foreground/30"
                    )} />
                    <span className="text-[11px] text-foreground">Google Cal</span>
                  </div>
                  {googleProvider?.connected ? (
                    <button
                      onClick={() => syncMutation.mutate('google')}
                      disabled={syncMutation.isPending}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-sync-google"
                    >
                      {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sync"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate('/app/settings')}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                      data-testid="link-connect-google"
                    >
                      Connect
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      microsoftProvider?.connected ? "bg-success" : "bg-muted-foreground/30"
                    )} />
                    <span className="text-[11px] text-foreground">Outlook</span>
                  </div>
                  {microsoftProvider?.connected ? (
                    <button
                      onClick={() => syncMutation.mutate('microsoft')}
                      disabled={syncMutation.isPending}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="button-sync-outlook"
                    >
                      {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Sync"}
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate('/app/settings')}
                      className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
                      data-testid="link-connect-outlook"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QuickAdd Modal */}
        <QuickAdd 
          isOpen={quickAddOpen} 
          onOpenChange={setQuickAddOpen} 
          defaultDate={quickAddDate}
        />

        {/* Meeting Prep Dialog */}
        <Dialog open={!!meetingPrepEvent} onOpenChange={(open) => !open && setMeetingPrepEvent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" weight="duotone" />
                Meeting Prep
              </DialogTitle>
            </DialogHeader>
            {meetingPrepEvent && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-lg bg-accent/50 border border-border">
                  <h3 className="font-semibold text-foreground">{meetingPrepEvent.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {meetingPrepEvent.allDay 
                      ? 'All day' 
                      : `${format(parseISO(meetingPrepEvent.startTime), 'h:mm a')} - ${format(parseISO(meetingPrepEvent.endTime), 'h:mm a')}`}
                  </p>
                  {meetingPrepEvent.location && (
                    <p className="text-sm text-muted-foreground mt-0.5">{meetingPrepEvent.location}</p>
                  )}
                  <Badge variant="secondary" className="mt-2 text-[10px]">
                    {meetingPrepEvent.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
                  </Badge>
                </div>

                <div className="text-sm font-medium text-foreground">What would you like to do?</div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleMeetingPrep(meetingPrepEvent, 'agenda')}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group"
                    data-testid="button-create-agenda"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <NotePencil className="h-5 w-5 text-primary" weight="duotone" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Create Agenda</span>
                    <span className="text-[10px] text-muted-foreground text-center">Prepare talking points and goals</span>
                  </button>

                  <button
                    onClick={() => handleMeetingPrep(meetingPrepEvent, 'notes')}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-accent/50 transition-all group"
                    data-testid="button-take-notes"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Lightning className="h-5 w-5 text-primary" weight="duotone" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Take Notes</span>
                    <span className="text-[10px] text-muted-foreground text-center">Capture key points and actions</span>
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
