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
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
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
  parseISO
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
  Rows
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

export default function CalendarPage() {
  const { theme } = useStore();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
      toast.success('Event created');
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

  const navigate = (direction: 'prev' | 'next') => {
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
      toast.error('Please fill in required fields');
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

  const googleProvider = providers.find((p: any) => p.id === 'google');
  const microsoftProvider = providers.find((p: any) => p.id === 'microsoft');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gradient-light light:text-charcoal-900">Calendar</h1>
          <p className="text-white/50 text-base mt-1 light:text-gray-500">
            Your unified schedule and events
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn("flex rounded-lg p-1", theme === "light" ? "bg-gray-100" : "bg-white/10")}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('day')}
              className={cn("h-8 px-3", viewMode === 'day' && (theme === "light" ? "bg-white shadow-sm" : "bg-white/20"))}
              data-testid="button-view-day"
            >
              <CalendarBlank className="h-4 w-4" weight="duotone" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('week')}
              className={cn("h-8 px-3", viewMode === 'week' && (theme === "light" ? "bg-white shadow-sm" : "bg-white/20"))}
              data-testid="button-view-week"
            >
              <Rows className="h-4 w-4" weight="duotone" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('month')}
              className={cn("h-8 px-3", viewMode === 'month' && (theme === "light" ? "bg-white shadow-sm" : "bg-white/20"))}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('prev')}
                  className="h-8 w-8"
                  data-testid="button-prev"
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                </Button>
                <h2 className={cn("text-lg font-bold min-w-[200px] text-center", theme === "light" ? "text-gray-900" : "text-white")}>
                  {getViewTitle()}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('next')}
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
                    <div key={day} className={cn("text-center text-xs font-medium py-2", theme === "light" ? "text-gray-500" : "text-white/50")}>
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const hasEvents = dayEvents.length > 0;

                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(day)}
                        data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                        className={cn(
                          "relative aspect-square p-1 rounded-lg transition-all flex flex-col items-center justify-start",
                          isCurrentMonth ? "" : "opacity-30",
                          isSelected
                            ? theme === "light"
                              ? "bg-violet-100 border-2 border-violet-500"
                              : "bg-violet-500/20 border-2 border-violet-500"
                            : theme === "light"
                              ? "hover:bg-gray-100"
                              : "hover:bg-white/5",
                          isTodayDate && !isSelected && (theme === "light" ? "bg-violet-50" : "bg-violet-500/10")
                        )}
                      >
                        <span className={cn(
                          "text-sm font-medium",
                          isTodayDate && "text-violet-500 font-bold",
                          !isTodayDate && (theme === "light" ? "text-gray-900" : "text-white")
                        )}>
                          {format(day, 'd')}
                        </span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-full">
                            {dayEvents.slice(0, 3).map((event: CalendarEvent) => (
                              <div
                                key={event.id}
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  event.provider === 'google' ? "bg-red-400" :
                                  event.provider === 'microsoft' ? "bg-blue-400" :
                                  "bg-violet-500"
                                )}
                              />
                            ))}
                          </div>
                        )}
                      </button>
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
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);

                    return (
                      <div key={index} className="space-y-1">
                        <button
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "w-full text-center py-2 rounded-lg transition-colors",
                            isSelected
                              ? theme === "light" ? "bg-violet-100" : "bg-violet-500/20"
                              : theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5",
                            isTodayDate && "border-2 border-violet-500"
                          )}
                          data-testid={`week-day-${format(day, 'yyyy-MM-dd')}`}
                        >
                          <div className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/50")}>
                            {format(day, 'EEE')}
                          </div>
                          <div className={cn(
                            "text-lg font-bold",
                            isTodayDate ? "text-violet-500" : (theme === "light" ? "text-gray-900" : "text-white")
                          )}>
                            {format(day, 'd')}
                          </div>
                        </button>
                        <div className="space-y-1 min-h-[100px]">
                          {dayEvents.map((event: CalendarEvent) => (
                            <div
                              key={event.id}
                              className={cn(
                                "p-1.5 rounded text-xs truncate cursor-pointer",
                                event.provider === 'google' 
                                  ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" 
                                  : event.provider === 'microsoft'
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                  : "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300"
                              )}
                              data-testid={`week-event-${event.id}`}
                            >
                              {event.title}
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
                      <div className={cn("w-16 text-xs text-right pr-2 py-1", theme === "light" ? "text-gray-500" : "text-white/50")}>
                        {format(hour, 'h:mm a')}
                      </div>
                      <div className={cn(
                        "flex-1 border-t py-1 space-y-1",
                        theme === "light" ? "border-gray-200" : "border-white/10"
                      )}>
                        {hourEvents.map((event: CalendarEvent) => (
                          <div
                            key={event.id}
                            className={cn(
                              "p-2 rounded text-sm",
                              event.provider === 'google' 
                                ? "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300" 
                                : event.provider === 'microsoft'
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                : "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300"
                            )}
                            data-testid={`day-event-${event.id}`}
                          >
                            <div className="font-medium">{event.title}</div>
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
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
              </CardTitle>
              <CardDescription>
                {selectedEvents.length === 0
                  ? "No events scheduled"
                  : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'event' : 'events'}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <div className={cn("text-center py-8", theme === "light" ? "text-gray-400" : "text-white/40")}>
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" weight="duotone" />
                  <p className="text-sm">No events for this day</p>
                </div>
              ) : (
                selectedEvents.map((event: CalendarEvent) => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      theme === "light" ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                    )}
                    data-testid={`event-${event.id}`}
                  >
                    <div className={cn(
                      "mt-0.5 flex-shrink-0",
                      event.provider === 'google' ? "text-red-500" :
                      event.provider === 'microsoft' ? "text-blue-500" :
                      "text-violet-500"
                    )}>
                      <Clock className="h-5 w-5" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", theme === "light" ? "text-gray-900" : "text-white")}>
                        {event.title}
                      </p>
                      <p className={cn("text-xs mt-0.5", theme === "light" ? "text-gray-500" : "text-white/50")}>
                        {event.allDay ? 'All day' : `${format(parseISO(event.startTime), 'h:mm a')} - ${format(parseISO(event.endTime), 'h:mm a')}`}
                      </p>
                      {event.location && (
                        <p className={cn("text-xs mt-0.5", theme === "light" ? "text-gray-400" : "text-white/40")}>
                          {event.location}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {event.provider === 'google' ? 'Google' : event.provider === 'microsoft' ? 'Outlook' : 'Local'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
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
                    ? theme === "light" ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/30"
                    : theme === "light" ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                )}
              >
                <GoogleLogo className={cn("h-5 w-5", googleProvider?.connected ? "text-green-500" : (theme === "light" ? "text-gray-500" : "text-white/60"))} weight="duotone" />
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-medium", theme === "light" ? "text-gray-900" : "text-white")}>
                    Google Calendar
                  </p>
                  <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/50")}>
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
                  <CheckCircle className="h-5 w-5 text-gray-300" />
                )}
              </div>

              <div
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  microsoftProvider?.connected
                    ? theme === "light" ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/30"
                    : theme === "light" ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                )}
              >
                <MicrosoftOutlookLogo className={cn("h-5 w-5", microsoftProvider?.connected ? "text-green-500" : (theme === "light" ? "text-gray-500" : "text-white/60"))} weight="duotone" />
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-medium", theme === "light" ? "text-gray-900" : "text-white")}>
                    Outlook Calendar
                  </p>
                  <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/50")}>
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
                  <CheckCircle className="h-5 w-5 text-gray-300" />
                )}
              </div>

              <p className={cn("text-xs text-center pt-2", theme === "light" ? "text-gray-400" : "text-white/40")}>
                Connect calendars via Settings &rarr; Integrations
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
