import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  differenceInMinutes,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  getHours,
  getMinutes,
  setHours,
  getDay
} from "date-fns";
import { 
  CaretLeft, 
  CaretRight, 
  Plus,
  Warning,
  Lightning,
  NotePencil,
  Timer,
  Video,
  DotsSixVertical,
  Tray,
  BellRinging,
  CalendarBlank,
  CheckCircle,
  Clock,
  Flag,
  ArrowSquareOut
} from "@phosphor-icons/react";
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
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

type ViewMode = 'month' | 'week' | 'day';

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

function getEventColor(provider: string): string {
  if (provider === 'google') return '#dc2626';
  if (provider === 'microsoft') return '#2563eb';
  return 'var(--primary)';
}

function getCurrentTimePosition(startHour: number, hourHeight: number): number | null {
  const now = new Date();
  const hours = getHours(now);
  const minutes = getMinutes(now);
  if (hours < startHour || hours >= 22) return null;
  return (hours - startHour) * hourHeight + (minutes / 60) * hourHeight;
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
  const [selectedDetailItem, setSelectedDetailItem] = useState<TaskItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<TaskItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const [showLists, setShowLists] = useState<Record<string, boolean>>({
    inbox: true,
    reminders: true,
  });
  const [showListIds, setShowListIds] = useState<Record<string, boolean>>({});

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      };
    }
    if (viewMode === 'day') {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
      };
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 })
    };
  }, [currentDate, viewMode]);

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

  const markItemComplete = useMutation({
    mutationFn: async (item: TaskItem) => {
      const endpoint = item.type === 'reminder'
        ? `/api/personal/reminders/${item.id}`
        : `/api/tasks/${item.id}`;
      const method = item.type === 'reminder' ? 'PATCH' : 'PUT';
      const body = item.type === 'reminder'
        ? { isCompleted: true }
        : { status: 'done' };
      const response = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("Failed to complete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setSelectedDetailItem(null);
      toast({ title: "Marked as complete!" });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
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

  const handleTaskClick = (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    setSelectedDetailItem(task);
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const dateWithTime = setHours(startOfDay(day), hour);
    setSelectedDate(day);
    setQuickAddDate(dateWithTime);
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

  const navigatePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const navigateNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const headerTitle = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, "MMMM yyyy");
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'd')} – ${format(weekEnd, 'd MMMM yyyy')}`;
      }
      return `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
    }
    return format(currentDate, "EEEE, d MMMM yyyy");
  }, [currentDate, viewMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = viewMode === 'week'
    ? eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      })
    : [];

  const isWeekend = (date: Date) => {
    const d = getDay(date);
    return d === 0 || d === 6;
  };

  return (
    <TooltipProvider>
      <div className="p-6 pb-6">
        <div className="flex gap-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900" data-testid="text-calendar-title">
                  {headerTitle}
                </h1>
                <div className="flex items-center gap-0.5 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigatePrev}
                    className="h-7 w-7"
                    data-testid="button-prev"
                  >
                    <CaretLeft className="h-4 w-4" weight="bold" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={navigateNext}
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
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5" data-testid="view-mode-toggle">
                  {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize",
                        viewMode === mode
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                      data-testid={`button-view-${mode}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setQuickAddDate(selectedDate || new Date()); setQuickAddOpen(true); }}
                  data-testid="button-create-event"
                >
                  <Plus className="h-4 w-4" weight="bold" />
                </Button>
              </div>
            </div>

            {/* Month View */}
            {viewMode === 'month' && (
              <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm" data-testid="card-calendar-grid">
                <div className="grid grid-cols-7 border-b border-border">
                  {DAY_HEADERS.map(day => (
                    <div key={day} className="text-center text-xs font-semibold py-2.5 text-muted-foreground tracking-wider border-r border-border last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

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
                            "min-h-[110px] p-1.5 border-r border-border last:border-r-0 flex flex-col cursor-pointer transition-colors relative",
                            !isCurrentMonth && "bg-muted/20",
                            isCurrentMonth && "hover:bg-accent/30",
                            isSelected && "bg-accent/40",
                            isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/30"
                          )}
                          data-testid={`calendar-day-${dateStr}`}
                        >

                          <div className="flex items-center justify-between mb-0.5">
                            <span className={cn(
                              "text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium",
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

                          <div className="space-y-0.5 flex-1 overflow-hidden">
                            {dayEvents.slice(0, 4).map((event: CalendarEvent) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (event.provider !== 'local') setMeetingPrepEvent(event);
                                }}
                                className={cn(
                                  "text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 bg-card border border-border/50",
                                  event.provider !== 'local' && "cursor-pointer hover:bg-accent/50"
                                )}
                                style={{
                                  borderLeftWidth: '3px',
                                  borderLeftColor: getEventColor(event.provider),
                                }}
                                data-testid={`event-${event.id}`}
                              >
                                <span className="truncate text-foreground">{event.title}</span>
                                {!event.allDay && (
                                  <span className="text-[9px] text-muted-foreground flex-shrink-0">
                                    {format(parseISO(event.startTime), 'H:mm')}
                                  </span>
                                )}
                              </div>
                            ))}
                            {dayTasks.slice(0, 4 - Math.min(dayEvents.length, 4)).map((task) => (
                              <div
                                key={task.id}
                                onClick={(e) => handleTaskClick(e, task)}
                                className="text-[10px] leading-tight px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 bg-card border border-border/50 cursor-pointer hover:bg-accent/50"
                                style={{
                                  borderLeftWidth: '3px',
                                  borderLeftColor: 'color-mix(in srgb, var(--primary) 60%, transparent)',
                                }}
                                data-testid={`task-${task.id}`}
                              >
                                <span className="truncate text-foreground/80">{task.title}</span>
                              </div>
                            ))}
                            {(dayEvents.length + dayTasks.length) > 4 && (
                              <div className="text-[9px] text-muted-foreground px-1.5 font-medium">
                                +{dayEvents.length + dayTasks.length - 4} more
                              </div>
                            )}
                          </div>

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
            )}

            {/* Week View */}
            {viewMode === 'week' && (
              <div className="border border-border rounded-xl overflow-hidden bg-card" data-testid="card-week-grid">
                {/* Day headers */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
                  <div className="border-r border-border" />
                  {weekDays.map((day) => {
                    const isTodayDate = isToday(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "text-center py-2 border-r border-border last:border-r-0",
                          isWeekend(day) && "bg-muted/30"
                        )}
                      >
                        <div className="text-xs font-semibold text-muted-foreground tracking-wider">
                          {format(day, 'EEE')}
                        </div>
                        <div className={cn(
                          "text-lg font-bold mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full",
                          isTodayDate && "bg-primary text-primary-foreground",
                          !isTodayDate && "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* All-day events row */}
                {(() => {
                  const allDayEvents = weekDays.map(day =>
                    getEventsForDate(day).filter((e: CalendarEvent) => e.allDay)
                  );
                  const hasAnyAllDay = allDayEvents.some(arr => arr.length > 0);
                  if (!hasAnyAllDay) return null;
                  return (
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border" data-testid="week-allday-row">
                      <div className="border-r border-border flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground">All day</span>
                      </div>
                      {weekDays.map((day, i) => (
                        <div key={i} className={cn(
                          "p-1 border-r border-border last:border-r-0 min-h-[32px]",
                          isWeekend(day) && "bg-muted/30"
                        )}>
                          {allDayEvents[i].map((event: CalendarEvent) => (
                            <div
                              key={event.id}
                              onClick={() => { if (event.provider !== 'local') setMeetingPrepEvent(event); }}
                              className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-card border border-border/50 mb-0.5 cursor-pointer"
                              style={{ borderLeftWidth: '3px', borderLeftColor: getEventColor(event.provider) }}
                              data-testid={`event-${event.id}`}
                            >
                              {event.title}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Tasks without time row */}
                {(() => {
                  const tasksNoTime = weekDays.map(day => getTasksForDate(day));
                  const hasAny = tasksNoTime.some(arr => arr.length > 0);
                  if (!hasAny) return null;
                  return (
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border" data-testid="week-tasks-row">
                      <div className="border-r border-border flex items-center justify-center">
                        <span className="text-[9px] text-muted-foreground">Tasks</span>
                      </div>
                      {weekDays.map((day, i) => (
                        <div key={i} className={cn(
                          "p-1 border-r border-border last:border-r-0 min-h-[28px]",
                          isWeekend(day) && "bg-muted/30"
                        )}>
                          {tasksNoTime[i].slice(0, 3).map(task => (
                            <div
                              key={task.id}
                              onClick={(e) => handleTaskClick(e, task)}
                              className="text-[9px] px-1 py-0.5 rounded truncate font-medium bg-card border border-border/50 mb-0.5 cursor-pointer hover:bg-accent/50"
                              style={{ borderLeftWidth: '2px', borderLeftColor: 'color-mix(in srgb, var(--primary) 60%, transparent)' }}
                              data-testid={`task-${task.id}`}
                            >
                              {task.title}
                            </div>
                          ))}
                          {tasksNoTime[i].length > 3 && (
                            <div className="text-[8px] text-muted-foreground px-1">+{tasksNoTime[i].length - 3}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Time grid */}
                <div className="overflow-y-auto max-h-[600px]" data-testid="week-time-grid">
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
                    {/* Time labels column */}
                    <div className="border-r border-border">
                      {HOURS.map(hour => (
                        <div key={hour} className="h-[60px] flex items-start justify-end pr-2 pt-0">
                          <span className="text-[10px] text-muted-foreground -translate-y-2">
                            {`${hour}:00`}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day, dayIdx) => {
                      const dayEvents = getEventsForDate(day).filter((e: CalendarEvent) => !e.allDay);
                      const isTodayDate = isToday(day);
                      const timePos = isTodayDate ? getCurrentTimePosition(6, 60) : null;

                      return (
                        <div
                          key={dayIdx}
                          className={cn(
                            "border-r border-border last:border-r-0 relative",
                            isWeekend(day) && "bg-muted/20"
                          )}
                          data-testid={`week-day-col-${format(day, 'yyyy-MM-dd')}`}
                        >
                          {HOURS.map(hour => (
                            <div
                              key={hour}
                              className="h-[60px] border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer"
                              onClick={() => handleTimeSlotClick(day, hour)}
                              onDragOver={(e) => handleDragOver(e, format(day, 'yyyy-MM-dd'))}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, day)}
                              data-testid={`week-slot-${format(day, 'yyyy-MM-dd')}-${hour}`}
                            />
                          ))}

                          {/* Positioned events */}
                          {dayEvents.map((event: CalendarEvent) => {
                            const startDate = parseISO(event.startTime);
                            const endDate = parseISO(event.endTime);
                            const startHour = getHours(startDate) + getMinutes(startDate) / 60;
                            const endHour = getHours(endDate) + getMinutes(endDate) / 60;
                            const top = Math.max((startHour - 6) * 60, 0);
                            const height = Math.max((endHour - startHour) * 60, 20);

                            return (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (event.provider !== 'local') setMeetingPrepEvent(event);
                                }}
                                className="absolute left-1 right-1 rounded px-1.5 py-0.5 overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10"
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  borderLeftWidth: '3px',
                                  borderLeftColor: getEventColor(event.provider),
                                }}
                                data-testid={`event-${event.id}`}
                              >
                                <div className="text-[10px] font-semibold text-foreground truncate">{event.title}</div>
                                <div className="text-[9px] text-muted-foreground">
                                  {format(startDate, 'H:mm')} – {format(endDate, 'H:mm')}
                                </div>
                                {event.location && height > 40 && (
                                  <div className="text-[9px] text-muted-foreground truncate">{event.location}</div>
                                )}
                              </div>
                            );
                          })}

                          {/* Current time indicator */}
                          {isTodayDate && timePos !== null && (
                            <div
                              className="absolute left-0 right-0 z-20 pointer-events-none"
                              style={{ top: `${timePos}px` }}
                              data-testid="current-time-indicator"
                            >
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                <div className="flex-1 h-[2px] bg-red-500" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Day View */}
            {viewMode === 'day' && (
              <div className="border border-border rounded-xl overflow-hidden bg-card" data-testid="card-day-grid">
                {/* Day header */}
                <div className="border-b border-border p-3 flex items-center gap-3">
                  <div className={cn(
                    "text-2xl font-bold inline-flex items-center justify-center w-10 h-10 rounded-full",
                    isToday(currentDate) && "bg-primary text-primary-foreground",
                    !isToday(currentDate) && "text-foreground"
                  )}>
                    {format(currentDate, 'd')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{format(currentDate, 'EEEE')}</div>
                    <div className="text-xs text-muted-foreground">{format(currentDate, 'MMMM yyyy')}</div>
                  </div>
                </div>

                {/* All-day events */}
                {(() => {
                  const allDayEvents = getEventsForDate(currentDate).filter((e: CalendarEvent) => e.allDay);
                  const dayTasks = getTasksForDate(currentDate);
                  if (allDayEvents.length === 0 && dayTasks.length === 0) return null;
                  return (
                    <div className="border-b border-border p-2 flex flex-wrap gap-1.5" data-testid="day-allday-row">
                      {allDayEvents.map((event: CalendarEvent) => (
                        <div
                          key={event.id}
                          onClick={() => { if (event.provider !== 'local') setMeetingPrepEvent(event); }}
                          className="text-[11px] px-2 py-1 rounded font-medium bg-card border border-border/50 cursor-pointer"
                          style={{ borderLeftWidth: '3px', borderLeftColor: getEventColor(event.provider) }}
                          data-testid={`event-${event.id}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(e, task)}
                          className="text-[11px] px-2 py-1 rounded font-medium bg-card border border-border/50 cursor-pointer hover:bg-accent/50"
                          style={{ borderLeftWidth: '3px', borderLeftColor: 'color-mix(in srgb, var(--primary) 60%, transparent)' }}
                          data-testid={`task-${task.id}`}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Time grid */}
                <div className="overflow-y-auto max-h-[600px]" data-testid="day-time-grid">
                  <div className="grid grid-cols-[60px_1fr] relative">
                    <div className="border-r border-border">
                      {HOURS.map(hour => (
                        <div key={hour} className="h-[64px] flex items-start justify-end pr-2">
                          <span className="text-[10px] text-muted-foreground -translate-y-2">
                            {`${hour}:00`}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={cn(
                      "relative",
                      isWeekend(currentDate) && "bg-muted/20"
                    )}>
                      {HOURS.map(hour => (
                        <div
                          key={hour}
                          className="h-[64px] border-b border-border/50 hover:bg-accent/20 transition-colors cursor-pointer"
                          onClick={() => handleTimeSlotClick(currentDate, hour)}
                          onDragOver={(e) => handleDragOver(e, format(currentDate, 'yyyy-MM-dd'))}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, currentDate)}
                          data-testid={`day-slot-${hour}`}
                        />
                      ))}

                      {/* Events */}
                      {getEventsForDate(currentDate).filter((e: CalendarEvent) => !e.allDay).map((event: CalendarEvent) => {
                        const startDate = parseISO(event.startTime);
                        const endDate = parseISO(event.endTime);
                        const startHour = getHours(startDate) + getMinutes(startDate) / 60;
                        const endHour = getHours(endDate) + getMinutes(endDate) / 60;
                        const top = Math.max((startHour - 6) * 64, 0);
                        const height = Math.max((endHour - startHour) * 64, 24);

                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (event.provider !== 'local') setMeetingPrepEvent(event);
                            }}
                            className="absolute left-2 right-2 rounded-lg px-2 py-1 overflow-hidden bg-card border border-border/60 shadow-sm hover:shadow-md transition-shadow cursor-pointer z-10"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              borderLeftWidth: '3px',
                              borderLeftColor: getEventColor(event.provider),
                            }}
                            data-testid={`event-${event.id}`}
                          >
                            <div className="text-xs font-semibold text-foreground truncate">{event.title}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {format(startDate, 'H:mm')} – {format(endDate, 'H:mm')}
                            </div>
                            {event.location && height > 48 && (
                              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{event.location}</div>
                            )}
                          </div>
                        );
                      })}

                      {/* Current time indicator */}
                      {isToday(currentDate) && (() => {
                        const pos = getCurrentTimePosition(6, 64);
                        if (pos === null) return null;
                        return (
                          <div
                            className="absolute left-0 right-0 z-20 pointer-events-none"
                            style={{ top: `${pos}px` }}
                            data-testid="current-time-indicator"
                          >
                            <div className="flex items-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1" />
                              <div className="flex-1 h-[2px] bg-red-500" />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="w-[220px] flex-shrink-0 pl-4 space-y-3">
            {/* Show/hide filters */}
            <div className="rounded-xl p-3" data-testid="card-list-filters">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Show</span>
              </div>

              <div className="space-y-1.5">
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
            <div className="rounded-xl p-3" data-testid="card-unscheduled-tasks">
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

        {/* Task/Reminder Detail Dialog */}
        <Dialog open={!!selectedDetailItem} onOpenChange={(open) => !open && setSelectedDetailItem(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg" data-testid="text-detail-title">
                {selectedDetailItem?.type === 'reminder' ? (
                  <BellRinging className="h-5 w-5 text-primary" weight="duotone" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-primary" weight="duotone" />
                )}
                {selectedDetailItem?.type === 'reminder' ? 'Reminder' : 'Task'} Details
              </DialogTitle>
              <DialogDescription className="sr-only">View details of the selected item</DialogDescription>
            </DialogHeader>
            {selectedDetailItem && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-lg bg-accent/50 border border-border">
                  <h3 className="font-semibold text-foreground text-base" data-testid="text-detail-item-title">
                    {selectedDetailItem.title}
                  </h3>
                  {selectedDetailItem.text && selectedDetailItem.text !== selectedDetailItem.title && (
                    <p className="text-sm text-muted-foreground mt-1.5" data-testid="text-detail-description">
                      {selectedDetailItem.text}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {selectedDetailItem.dueDate && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                      <Clock className="h-4 w-4 text-muted-foreground" weight="duotone" />
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Due</div>
                        <div className="text-sm font-medium text-foreground" data-testid="text-detail-due-date">
                          {format(parseISO(selectedDetailItem.dueDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                    <Flag className="h-4 w-4 text-muted-foreground" weight="duotone" />
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Priority</div>
                      <div className="text-sm font-medium text-foreground capitalize" data-testid="text-detail-priority">
                        {selectedDetailItem.priority === 'none' ? 'Normal' : selectedDetailItem.priority}
                      </div>
                    </div>
                  </div>

                  {selectedDetailItem.estimatedMinutes && (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                      <Timer className="h-4 w-4 text-muted-foreground" weight="duotone" />
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimate</div>
                        <div className="text-sm font-medium text-foreground" data-testid="text-detail-estimate">
                          {selectedDetailItem.estimatedMinutes}m
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      selectedDetailItem.status === 'done' || selectedDetailItem.status === 'completed' ? "bg-success" : "bg-warning"
                    )} />
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</div>
                      <div className="text-sm font-medium text-foreground capitalize" data-testid="text-detail-status">
                        {selectedDetailItem.status}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={() => markItemComplete.mutate(selectedDetailItem)}
                    disabled={markItemComplete.isPending}
                    className="flex-1 gap-2"
                    data-testid="button-mark-complete"
                  >
                    <CheckCircle className="h-4 w-4" weight="bold" />
                    {markItemComplete.isPending ? 'Completing...' : 'Mark Complete'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDetailItem(null);
                      if (selectedDetailItem.type === 'reminder') {
                        navigate('/app/inbox');
                      } else {
                        navigate(`/app/task/${selectedDetailItem.id}`);
                      }
                    }}
                    className="gap-2"
                    data-testid="button-open-full"
                  >
                    <ArrowSquareOut className="h-4 w-4" weight="bold" />
                    Open
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
