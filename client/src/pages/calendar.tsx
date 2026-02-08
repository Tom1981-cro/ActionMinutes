import { useState, useMemo, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useLocation } from "wouter";
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
  GoogleLogo, 
  MicrosoftOutlookLogo, 
  Clock, 
  Plus,
  ArrowsClockwise,
  Warning,
  Lightning,
  NotePencil,
  ArrowRight,
  Timer,
  Funnel,
  Video,
  DotsSixVertical,
  GearSix
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
}

const CAPACITY_HOURS = 8;

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

function getLoadColor(percentage: number): string {
  if (percentage >= 100) return "bg-destructive";
  if (percentage >= 75) return "bg-warning";
  return "bg-success";
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  const [, navigate] = useLocation();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [meetingPrepEvent, setMeetingPrepEvent] = useState<CalendarEvent | null>(null);
  const [draggedItem, setDraggedItem] = useState<TaskItem | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    allDay: false,
    provider: 'local' as 'local' | 'google' | 'microsoft'
  });

  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return {
      start: startOfWeek(monthStart, { weekStartsOn: 0 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 0 })
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

  const unifiedItems: TaskItem[] = useMemo(() => {
    const items: TaskItem[] = [];
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
    for (const t of allTasks) {
      if (t.deletedAt || t.status === 'done' || t.status === 'completed') continue;
      items.push({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate || null,
        estimatedMinutes: t.estimatedMinutes || 30,
        priority: t.priority || 'medium',
        status: t.status || 'todo',
        type: 'task'
      });
    }
    return items;
  }, [allReminders, allTasks]);

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

  const createEventMutation = useMutation({
    mutationFn: async (eventData: typeof newEvent) => {
      const response = await authenticatedFetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', location: '', startTime: '', endTime: '', allDay: false, provider: 'local' });
      toast.success("Event created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

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
      toast.success(`Synced ${data.synced} events`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      toast.success("Task scheduled!");
    },
    onError: () => {
      toast.error("Failed to schedule task");
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

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
      toast.error("Please fill in required fields");
      return;
    }
    createEventMutation.mutate(newEvent);
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
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-calendar-title">
              <span>{format(currentDate, "MMMM")}</span>{" "}
              <span className="text-primary">{format(currentDate, "yyyy")}</span>
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="h-8 w-8 rounded-lg"
                data-testid="button-prev"
              >
                <CaretLeft className="h-4 w-4" weight="bold" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="h-8 w-8 rounded-lg"
                data-testid="button-next"
              >
                <CaretRight className="h-4 w-4" weight="bold" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="text-sm font-medium text-primary hover:text-primary"
              data-testid="button-today"
            >
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              data-testid="button-filter"
            >
              <Funnel className="h-4 w-4" weight="duotone" />
              Filter
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 btn-gradient" data-testid="button-create-event">
                  <Plus className="h-4 w-4" weight="bold" />
                  New Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="event-title">Title *</Label>
                    <Input
                      id="event-title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="Event title"
                      data-testid="input-event-title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="event-start">Start *</Label>
                      <Input
                        id="event-start"
                        type="datetime-local"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                        data-testid="input-event-start"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-end">End *</Label>
                      <Input
                        id="event-end"
                        type="datetime-local"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                        data-testid="input-event-end"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="event-allday"
                      checked={newEvent.allDay}
                      onCheckedChange={(checked) => setNewEvent({ ...newEvent, allDay: checked })}
                      data-testid="switch-all-day"
                    />
                    <Label htmlFor="event-allday">All day event</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-location">Location</Label>
                    <Input
                      id="event-location"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="Add location"
                      data-testid="input-event-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Add description"
                      data-testid="input-event-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-provider">Calendar</Label>
                    <Select
                      value={newEvent.provider}
                      onValueChange={(value: 'local' | 'google' | 'microsoft') => setNewEvent({ ...newEvent, provider: value })}
                    >
                      <SelectTrigger id="event-provider" data-testid="select-provider">
                        <SelectValue placeholder="Select calendar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Calendar</SelectItem>
                        {googleProvider?.connected && <SelectItem value="google">Google Calendar</SelectItem>}
                        {microsoftProvider?.connected && <SelectItem value="microsoft">Outlook Calendar</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateEvent}
                      disabled={createEventMutation.isPending}
                      data-testid="button-save-event"
                    >
                      {createEventMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main layout: Calendar grid + Sidebar */}
        <div className="flex gap-5">
          {/* Calendar grid - flexible width */}
          <div className="flex-1 min-w-0">
            <Card className="glass-panel rounded-2xl overflow-hidden" data-testid="card-calendar-grid">
              <CardContent className="p-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-border">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold py-2.5 text-muted-foreground tracking-wider">
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
                          onClick={() => setSelectedDate(day)}
                          onDragOver={(e) => handleDragOver(e, dateStr)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
                          className={cn(
                            "min-h-[110px] p-1.5 border-r border-border last:border-r-0 flex flex-col cursor-pointer transition-colors",
                            !isCurrentMonth && "bg-muted/30",
                            isSelected && "bg-accent/50",
                            isDragOver && "bg-primary/5 ring-2 ring-inset ring-primary/30"
                          )}
                          data-testid={`calendar-day-${dateStr}`}
                        >
                          {/* Day number */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn(
                              "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                              isTodayDate && "bg-primary text-primary-foreground font-bold",
                              !isTodayDate && isCurrentMonth && "text-foreground",
                              !isCurrentMonth && "text-muted-foreground/50"
                            )}>
                              {format(day, 'd')}
                            </span>
                            {dayLoad.isOverloaded && isCurrentMonth && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Warning className="h-3 w-3 text-destructive" weight="fill" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {Math.round(dayLoad.totalMinutes / 60 * 10) / 10}h / {CAPACITY_HOURS}h - Over capacity
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Events and tasks */}
                          <div className="space-y-0.5 flex-1 overflow-hidden">
                            {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
                              <div
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (event.provider !== 'local') setMeetingPrepEvent(event);
                                }}
                                className={cn(
                                  "text-[11px] leading-tight px-1.5 py-0.5 rounded truncate font-medium",
                                  event.provider !== 'local' && "cursor-pointer",
                                  event.provider === 'google' 
                                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" 
                                    : event.provider === 'microsoft'
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                    : "bg-primary/10 text-primary"
                                )}
                                data-testid={`event-${event.id}`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayTasks.slice(0, 3 - Math.min(dayEvents.length, 3)).map((task) => (
                              <div
                                key={task.id}
                                className="text-[11px] leading-tight px-1.5 py-0.5 rounded truncate bg-accent border border-border text-foreground"
                                data-testid={`task-${task.id}`}
                              >
                                {task.title}
                              </div>
                            ))}
                            {(dayEvents.length + dayTasks.length) > 3 && (
                              <div className="text-[10px] text-muted-foreground px-1.5 font-medium">
                                +{dayEvents.length + dayTasks.length - 3} more
                              </div>
                            )}
                          </div>

                          {/* Capacity bar */}
                          {hasItems && isCurrentMonth && (
                            <div className="mt-auto pt-1">
                              <div className="h-[3px] bg-muted rounded-full overflow-hidden">
                                <div 
                                  style={{ width: `${Math.min(dayLoad.percentage, 100)}%` }} 
                                  className={cn("h-full rounded-full transition-all", getLoadColor(dayLoad.percentage))}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar */}
          <div className="w-[240px] flex-shrink-0 space-y-4">
            {/* Sync Status */}
            <Card className="glass-panel rounded-2xl" data-testid="card-sync-status">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <ArrowsClockwise className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sync Status</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        googleProvider?.connected ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-sm text-foreground">Google Cal</span>
                    </div>
                    {googleProvider?.connected ? (
                      <button
                        onClick={() => syncMutation.mutate('google')}
                        disabled={syncMutation.isPending}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-sync-google"
                      >
                        {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Synced"}
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/app/settings')}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        data-testid="link-connect-google"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        microsoftProvider?.connected ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )} />
                      <span className="text-sm text-foreground">Outlook</span>
                    </div>
                    {microsoftProvider?.connected ? (
                      <button
                        onClick={() => syncMutation.mutate('microsoft')}
                        disabled={syncMutation.isPending}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-sync-outlook"
                      >
                        {syncMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Synced"}
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/app/settings')}
                        className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        data-testid="link-connect-outlook"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unscheduled Tasks */}
            <Card className="glass-panel rounded-2xl" data-testid="card-unscheduled-tasks">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <GearSix className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unscheduled Tasks</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Drag these to the calendar to time-block your week.
                </p>

                {backlogItems.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-xs">All tasks scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[calc(100vh-420px)] overflow-y-auto">
                    {backlogItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        className={cn(
                          "group p-3 rounded-xl border bg-card border-border cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all",
                          draggedItem?.id === item.id && "opacity-50 ring-1 ring-primary/30"
                        )}
                        data-testid={`backlog-item-${item.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <DotsSixVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 flex-shrink-0 group-hover:text-muted-foreground transition-colors" weight="bold" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground leading-snug line-clamp-2" data-testid={`text-backlog-title-${item.id}`}>
                              {item.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Timer className="h-2.5 w-2.5" />
                                {item.estimatedMinutes ? `${item.estimatedMinutes / 60}h` : "0.5h"}
                              </span>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`button-more-${item.id}`}
                              >
                                <DotsSixVertical className="h-3 w-3 text-muted-foreground rotate-90" weight="bold" />
                              </button>
                            </div>
                          </div>
                        </div>
                        {selectedDate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2 h-6 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/5"
                            onClick={(e) => {
                              e.stopPropagation();
                              assignTaskToDate.mutate({ item, date: selectedDate });
                            }}
                            disabled={assignTaskToDate.isPending}
                            data-testid={`schedule-backlog-${item.id}`}
                          >
                            <ArrowRight className="h-3 w-3" weight="bold" />
                            Schedule for {format(selectedDate, "MMM d")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30 rounded-xl transition-colors text-center"
                  onClick={() => setIsCreateOpen(true)}
                  data-testid="button-add-backlog"
                >
                  + Add new backlog item
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

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
