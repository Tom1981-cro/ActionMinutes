import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  eachHourOfInterval,
  startOfDay,
  endOfDay,
  isSameMonth,
  parseISO,
  differenceInMinutes
} from "date-fns";
import { 
  Calendar as CalendarIcon, 
  CaretLeft, 
  CaretRight, 
  GoogleLogo, 
  MicrosoftOutlookLogo, 
  CheckCircle, 
  Clock, 
  Bell, 
  Link as LinkIcon,
  Plus,
  ArrowsClockwise,
  CalendarBlank,
  ListBullets,
  Rows,
  Warning,
  Lightning,
  NotePencil,
  ListChecks,
  ArrowRight,
  Timer,
  Tray,
  Video
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = 'month' | 'week' | 'day';

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

function getLoadBgColor(percentage: number): string {
  if (percentage >= 100) return "bg-destructive/10";
  if (percentage >= 75) return "bg-warning/5";
  return "";
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { user } = useStore();
  const [, navigate] = useLocation();
  
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showBacklog, setShowBacklog] = useState(true);
  const [meetingPrepEvent, setMeetingPrepEvent] = useState<CalendarEvent | null>(null);
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
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 })
      };
    } else if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 })
      };
    } else {
      return {
        start: startOfDay(currentDate),
        end: endOfDay(currentDate)
      };
    }
  }, [viewMode, currentDate]);

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
      const body = item.type === 'reminder'
        ? { dueDate: date.toISOString() }
        : { dueDate: date.toISOString() };
      const response = await authenticatedFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

  const hours = useMemo(() => {
    return eachHourOfInterval({ start: startOfDay(currentDate), end: endOfDay(currentDate) });
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter((event: CalendarEvent) => {
      const eventStart = parseISO(event.startTime);
      return isSameDay(eventStart, date);
    });
  };

  const getEventsForHour = (hour: Date) => {
    return events.filter((event: CalendarEvent) => {
      const eventStart = parseISO(event.startTime);
      return eventStart.getHours() === hour.getHours() && isSameDay(eventStart, currentDate);
    });
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const selectedDayLoad = selectedDate ? getDayLoad(selectedDate) : null;

  const navDirection = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1));
    }
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

  const getViewTitle = () => {
    if (viewMode === 'month') {
      return format(currentDate, "MMMM yyyy");
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    } else {
      return format(currentDate, "EEEE, MMMM d, yyyy");
    }
  };

  const handleMeetingPrep = (event: CalendarEvent, action: 'agenda' | 'notes') => {
    setMeetingPrepEvent(null);
    if (action === 'notes') {
      navigate(`/app/journal?meetingTitle=${encodeURIComponent(event.title)}&meetingDate=${encodeURIComponent(event.startTime)}`);
    } else {
      navigate(`/app/notes?newNote=true&title=${encodeURIComponent(`Agenda: ${event.title}`)}&meetingDate=${encodeURIComponent(event.startTime)}`);
    }
  };

  const googleProvider = providers.find((p: any) => p.id === 'google');
  const microsoftProvider = providers.find((p: any) => p.id === 'microsoft');

  const backlogTotalMinutes = backlogItems.reduce((sum, item) => sum + (item.estimatedMinutes || 30), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-5 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Calendar</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your unified schedule, tasks, and capacity planner
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={showBacklog ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowBacklog(!showBacklog)}
              className="gap-1.5"
              data-testid="button-toggle-backlog"
            >
              <Tray className="h-4 w-4" weight="duotone" />
              Backlog
              {backlogItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                  {backlogItems.length}
                </Badge>
              )}
            </Button>

            <div className="flex rounded-lg p-1 bg-muted">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('day')}
                className={cn("h-8 px-3", viewMode === 'day' && "bg-card shadow-sm")}
                data-testid="button-view-day"
              >
                <CalendarBlank className="h-4 w-4" weight="duotone" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={cn("h-8 px-3", viewMode === 'week' && "bg-card shadow-sm")}
                data-testid="button-view-week"
              >
                <Rows className="h-4 w-4" weight="duotone" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('month')}
                className={cn("h-8 px-3", viewMode === 'month' && "bg-card shadow-sm")}
                data-testid="button-view-month"
              >
                <ListBullets className="h-4 w-4" weight="duotone" />
              </Button>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-create-event">
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

        <div className={cn("grid gap-5", showBacklog ? "lg:grid-cols-[1fr_280px]" : "lg:grid-cols-1")}>
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navDirection('prev')}
                        className="h-8 w-8"
                        data-testid="button-prev"
                      >
                        <CaretLeft className="h-4 w-4" weight="bold" />
                      </Button>
                      <h2 className="text-lg font-bold min-w-[200px] text-center text-foreground">
                        {getViewTitle()}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navDirection('next')}
                        className="h-8 w-8"
                        data-testid="button-next"
                      >
                        <CaretRight className="h-4 w-4" weight="bold" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      className="text-xs"
                      data-testid="button-today"
                    >
                      Today
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {viewMode === 'month' && (
                    <>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="text-center text-xs font-medium py-2 text-muted-foreground">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                          const dayEvents = getEventsForDate(day);
                          const dayTasks = getTasksForDate(day);
                          const isCurrentMonth = isSameMonth(day, currentDate);
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isTodayDate = isToday(day);
                          const hasItems = dayEvents.length > 0 || dayTasks.length > 0;
                          const dayLoad = getDayLoad(day);

                          return (
                            <Tooltip key={index}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSelectedDate(day)}
                                  data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                                  className={cn(
                                    "relative min-h-[80px] p-1.5 rounded-lg transition-all flex flex-col items-start text-left group",
                                    isCurrentMonth ? "" : "opacity-30",
                                    isSelected
                                      ? "bg-accent ring-2 ring-primary"
                                      : "hover:bg-accent/50",
                                    isTodayDate && !isSelected && "bg-accent",
                                    dayLoad.isOverloaded && isCurrentMonth && "ring-1 ring-destructive/50",
                                    getLoadBgColor(dayLoad.percentage)
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full mb-1">
                                    <span className={cn(
                                      "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                      isTodayDate && "bg-primary text-primary-foreground font-bold",
                                      !isTodayDate && "text-foreground"
                                    )}>
                                      {format(day, 'd')}
                                    </span>
                                    {dayLoad.isOverloaded && isCurrentMonth && (
                                      <Warning className="h-3 w-3 text-destructive" weight="fill" />
                                    )}
                                  </div>

                                  <div className="space-y-0.5 w-full flex-1 overflow-hidden">
                                    {dayEvents.slice(0, 2).map((event: CalendarEvent) => (
                                      <div
                                        key={event.id}
                                        className={cn(
                                          "text-[9px] leading-tight px-1 py-0.5 rounded truncate",
                                          event.provider === 'google' 
                                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" 
                                            : event.provider === 'microsoft'
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                                            : "bg-primary/10 text-primary"
                                        )}
                                      >
                                        {event.title}
                                      </div>
                                    ))}
                                    {dayTasks.slice(0, 2).map((task) => (
                                      <div
                                        key={task.id}
                                        className="text-[9px] leading-tight px-1 py-0.5 rounded truncate bg-card border border-border text-foreground"
                                      >
                                        {task.title}
                                      </div>
                                    ))}
                                    {(dayEvents.length + dayTasks.length) > 4 && (
                                      <div className="text-[9px] text-muted-foreground px-1">
                                        +{dayEvents.length + dayTasks.length - 4} more
                                      </div>
                                    )}
                                  </div>

                                  {hasItems && isCurrentMonth && (
                                    <div className="w-full mt-1">
                                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div 
                                          style={{ width: `${Math.min(dayLoad.percentage, 100)}%` }} 
                                          className={cn("h-full rounded-full transition-all", getLoadColor(dayLoad.percentage))}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </button>
                              </TooltipTrigger>
                              {hasItems && isCurrentMonth && (
                                <TooltipContent side="bottom" className="text-xs">
                                  <div className="space-y-1">
                                    <div className="font-medium">{format(day, "MMM d")}</div>
                                    <div>{dayEvents.length} meeting{dayEvents.length !== 1 ? 's' : ''} + {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</div>
                                    <div className={cn(
                                      "font-medium",
                                      dayLoad.isOverloaded ? "text-destructive" : "text-success"
                                    )}>
                                      {Math.round(dayLoad.totalMinutes / 60 * 10) / 10}h / {CAPACITY_HOURS}h capacity
                                    </div>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {viewMode === 'week' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, index) => {
                          const dayEvents = getEventsForDate(day);
                          const dayTasks = getTasksForDate(day);
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isTodayDate = isToday(day);
                          const dayLoad = getDayLoad(day);

                          return (
                            <div key={index} className="space-y-1">
                              <button
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                  "w-full text-center py-2 rounded-lg transition-colors",
                                  isSelected ? "bg-accent" : "hover:bg-accent",
                                  isTodayDate && "border-2 border-primary"
                                )}
                                data-testid={`week-day-${format(day, 'yyyy-MM-dd')}`}
                              >
                                <div className="text-xs text-muted-foreground">
                                  {format(day, 'EEE')}
                                </div>
                                <div className={cn(
                                  "text-lg font-bold",
                                  isTodayDate ? "text-primary" : "text-foreground"
                                )}>
                                  {format(day, 'd')}
                                </div>
                                {(dayEvents.length > 0 || dayTasks.length > 0) && (
                                  <div className="mt-1 mx-2">
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        style={{ width: `${Math.min(dayLoad.percentage, 100)}%` }} 
                                        className={cn("h-full rounded-full", getLoadColor(dayLoad.percentage))}
                                      />
                                    </div>
                                  </div>
                                )}
                              </button>
                              <div className="space-y-1 min-h-[100px]">
                                {dayEvents.map((event: CalendarEvent) => (
                                  <div
                                    key={event.id}
                                    onClick={() => {
                                      if (event.provider !== 'local') setMeetingPrepEvent(event);
                                    }}
                                    className={cn(
                                      "p-1.5 rounded text-xs truncate",
                                      event.provider !== 'local' && "cursor-pointer hover:ring-1 hover:ring-primary/30",
                                      event.provider === 'google' 
                                        ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" 
                                        : event.provider === 'microsoft'
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                        : "bg-accent text-primary"
                                    )}
                                    data-testid={`week-event-${event.id}`}
                                  >
                                    {event.title}
                                  </div>
                                ))}
                                {dayTasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className="p-1.5 rounded text-xs truncate bg-card border border-border text-foreground"
                                    data-testid={`week-task-${task.id}`}
                                  >
                                    {task.title}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {viewMode === 'day' && (
                    <div className="space-y-1 max-h-[600px] overflow-y-auto">
                      {hours.map((hour, index) => {
                        const hourEvents = getEventsForHour(hour);
                        return (
                          <div key={index} className="flex gap-2 min-h-[50px]">
                            <div className="w-16 text-xs text-right pr-2 py-1 text-muted-foreground">
                              {format(hour, 'h:mm a')}
                            </div>
                            <div className="flex-1 border-t border-border py-1 space-y-1">
                              {hourEvents.map((event: CalendarEvent) => (
                                <div
                                  key={event.id}
                                  onClick={() => {
                                    if (event.provider !== 'local') setMeetingPrepEvent(event);
                                  }}
                                  className={cn(
                                    "p-2 rounded text-sm",
                                    event.provider !== 'local' && "cursor-pointer hover:ring-1 hover:ring-primary/30",
                                    event.provider === 'google' 
                                      ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" 
                                      : event.provider === 'microsoft'
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                      : "bg-accent text-primary"
                                  )}
                                  data-testid={`day-event-${event.id}`}
                                >
                                  <div className="font-medium flex items-center justify-between">
                                    {event.title}
                                    {event.provider !== 'local' && (
                                      <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-2">
                                        {event.provider === 'google' ? 'Google' : 'Outlook'}
                                      </Badge>
                                    )}
                                  </div>
                                  {event.location && (
                                    <div className="text-xs opacity-75">{event.location}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a date"}</span>
                      {selectedDayLoad && (selectedEvents.length > 0 || selectedTasks.length > 0) && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant={selectedDayLoad.isOverloaded ? "destructive" : "secondary"} 
                              className="text-[10px] gap-1"
                              data-testid="badge-day-capacity"
                            >
                              <Timer className="h-3 w-3" weight="bold" />
                              {Math.round(selectedDayLoad.totalMinutes / 60 * 10) / 10}h / {CAPACITY_HOURS}h
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {selectedDayLoad.isOverloaded 
                              ? "This day is overloaded! Consider rescheduling some items."
                              : "Daily capacity usage"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </CardTitle>
                    {selectedDayLoad && (selectedEvents.length > 0 || selectedTasks.length > 0) && (
                      <div className="mt-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(selectedDayLoad.percentage, 100)}%` }} 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              getLoadColor(selectedDayLoad.percentage)
                            )}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {selectedEvents.length} meeting{selectedEvents.length !== 1 ? 's' : ''} + {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                          </span>
                          {selectedDayLoad.isOverloaded && (
                            <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5">
                              <Warning className="h-3 w-3" weight="fill" />
                              Over capacity
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" weight="duotone" />
                        <p className="text-sm">No events for this day</p>
                        <p className="text-xs mt-1">Schedule tasks from the backlog</p>
                      </div>
                    ) : (
                      <>
                        {selectedEvents.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Video className="h-3 w-3" weight="duotone" />
                              Meetings
                            </div>
                            {selectedEvents.map((event: CalendarEvent) => (
                              <div
                                key={event.id}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg border transition-all",
                                  event.provider !== 'local' && "cursor-pointer hover:ring-1 hover:ring-primary/30",
                                  event.provider === 'google' 
                                    ? "bg-red-50/50 border-red-200/50 dark:bg-red-500/5 dark:border-red-500/20"
                                    : event.provider === 'microsoft'
                                    ? "bg-blue-50/50 border-blue-200/50 dark:bg-blue-500/5 dark:border-blue-500/20"
                                    : "bg-card border-border"
                                )}
                                onClick={() => {
                                  if (event.provider !== 'local') setMeetingPrepEvent(event);
                                }}
                                data-testid={`event-${event.id}`}
                              >
                                <div className={cn(
                                  "mt-0.5 flex-shrink-0",
                                  event.provider === 'google' ? "text-red-500" :
                                  event.provider === 'microsoft' ? "text-blue-500" :
                                  "text-primary"
                                )}>
                                  <Clock className="h-4 w-4" weight="duotone" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">
                                    {event.title}
                                  </p>
                                  <p className="text-xs mt-0.5 text-muted-foreground">
                                    {event.allDay ? 'All day' : `${format(parseISO(event.startTime), 'h:mm a')} - ${format(parseISO(event.endTime), 'h:mm a')}`}
                                  </p>
                                  {event.location && (
                                    <p className="text-xs mt-0.5 text-muted-foreground">{event.location}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {event.provider === 'google' ? 'Google' : event.provider === 'microsoft' ? 'Outlook' : 'Local'}
                                    </Badge>
                                    {event.provider !== 'local' && (
                                      <span className="text-[10px] text-primary font-medium">Click for prep actions</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedTasks.length > 0 && (
                          <div className="space-y-2 mt-3">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <ListChecks className="h-3 w-3" weight="duotone" />
                              Tasks
                            </div>
                            {selectedTasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg border bg-card border-border"
                                data-testid={`task-detail-${task.id}`}
                              >
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  task.priority === 'high' || task.priority === 'urgent' ? "bg-destructive" :
                                  task.priority === 'medium' ? "bg-warning" : "bg-success"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground truncate">{task.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                      <Timer className="h-3 w-3" />
                                      {task.estimatedMinutes || 30}m
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                      {task.type}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" weight="duotone" />
                      Calendar Integrations
                    </CardTitle>
                    <CardDescription>
                      Sync your external calendars
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        googleProvider?.connected
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-card border-border"
                      )}
                    >
                      <GoogleLogo className={cn("h-5 w-5", googleProvider?.connected ? "text-green-500" : "text-muted-foreground")} weight="duotone" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">Google Calendar</p>
                        <p className="text-xs text-muted-foreground">
                          {googleProvider?.connected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      {googleProvider?.connected ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncMutation.mutate('google')}
                          disabled={syncMutation.isPending}
                          data-testid="button-sync-google"
                        >
                          {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowsClockwise className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <div
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        microsoftProvider?.connected
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-card border-border"
                      )}
                    >
                      <MicrosoftOutlookLogo className={cn("h-5 w-5", microsoftProvider?.connected ? "text-green-500" : "text-muted-foreground")} weight="duotone" />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">Outlook Calendar</p>
                        <p className="text-xs text-muted-foreground">
                          {microsoftProvider?.connected ? "Connected" : "Not connected"}
                        </p>
                      </div>
                      {microsoftProvider?.connected ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => syncMutation.mutate('microsoft')}
                          disabled={syncMutation.isPending}
                          data-testid="button-sync-outlook"
                        >
                          {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowsClockwise className="h-4 w-4" />}
                        </Button>
                      ) : (
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    <p className="text-xs text-center pt-2 text-muted-foreground">
                      Connect calendars via Settings &rarr; Integrations
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {showBacklog && (
            <div className="space-y-4">
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tray className="h-4 w-4" weight="duotone" />
                    Unscheduled
                  </CardTitle>
                  <CardDescription className="flex items-center justify-between">
                    <span>{backlogItems.length} task{backlogItems.length !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {Math.round(backlogTotalMinutes / 60 * 10) / 10}h total
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {backlogItems.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" weight="duotone" />
                      <p className="text-xs">All tasks are scheduled!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {backlogItems.map((item) => (
                        <div
                          key={item.id}
                          className="group p-2.5 rounded-lg border bg-card border-border hover:border-primary/30 hover:shadow-sm transition-all"
                          data-testid={`backlog-item-${item.id}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0",
                              item.priority === 'high' || item.priority === 'urgent' ? "bg-destructive" :
                              item.priority === 'medium' ? "bg-warning" : "bg-success"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Timer className="h-2.5 w-2.5" />
                                  {item.estimatedMinutes || 30}m
                                </span>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">
                                  {item.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {selectedDate && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full mt-2 h-7 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary hover:bg-primary/5"
                              onClick={() => assignTaskToDate.mutate({ item, date: selectedDate })}
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
                </CardContent>
              </Card>
            </div>
          )}
        </div>

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
