import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { useActionItems, useIntegrations } from "@/lib/hooks";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { 
  Calendar as CalendarIcon, CaretLeft, CaretRight, GoogleLogo, MicrosoftOutlookLogo, 
  CheckCircle, Clock, Bell, Link as LinkIcon
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'action' | 'reminder' | 'meeting';
  source: 'internal' | 'google' | 'outlook';
  completed?: boolean;
}

export default function CalendarPage() {
  const { user, theme } = useStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['/api/personal/reminders', user.id],
    queryFn: async () => {
      const response = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!user.id,
  });

  const { data: actionItems = [], isLoading: actionsLoading } = useActionItems();
  const { data: integrations } = useIntegrations();

  const isLoading = remindersLoading || actionsLoading;

  const events: CalendarEvent[] = [
    ...reminders
      .filter((r: any) => r.dueDate)
      .map((r: any) => ({
        id: `reminder-${r.id}`,
        title: r.text,
        date: new Date(r.dueDate),
        type: 'reminder' as const,
        source: 'internal' as const,
        completed: r.isCompleted,
      })),
    ...actionItems
      .filter((a: any) => a.dueDate)
      .map((a: any) => ({
        id: `action-${a.id}`,
        title: a.text,
        date: new Date(a.dueDate),
        type: 'action' as const,
        source: 'internal' as const,
        completed: a.status === 'done',
      })),
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const hasGoogleCalendar = integrations?.google?.connected;
  const hasOutlookCalendar = integrations?.microsoft?.connected;

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
            Your unified schedule and deadlines
          </p>
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
                  onClick={goToPreviousMonth}
                  className="h-8 w-8"
                  data-testid="button-prev-month"
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                </Button>
                <h2 className={cn("text-lg font-bold min-w-[160px] text-center", theme === "light" ? "text-gray-900" : "text-white")}>
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-8 w-8"
                  data-testid="button-next-month"
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
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const hasEvents = dayEvents.length > 0;
                const hasIncomplete = dayEvents.some(e => !e.completed);

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
                      <div className="flex gap-0.5 mt-0.5">
                        {hasIncomplete && (
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        )}
                        {!hasIncomplete && hasEvents && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
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
                  ? "No items scheduled"
                  : `${selectedEvents.length} ${selectedEvents.length === 1 ? 'item' : 'items'}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <div className={cn("text-center py-8", theme === "light" ? "text-gray-400" : "text-white/40")}>
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" weight="duotone" />
                  <p className="text-sm">No items for this day</p>
                </div>
              ) : (
                selectedEvents.map(event => (
                  <div
                    key={event.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      event.completed
                        ? theme === "light" ? "bg-gray-50 border-gray-200" : "bg-white/5 border-white/10 opacity-60"
                        : theme === "light" ? "bg-white border-gray-200" : "bg-white/5 border-white/10"
                    )}
                    data-testid={`event-${event.id}`}
                  >
                    <div className={cn(
                      "mt-0.5 flex-shrink-0",
                      event.completed ? "text-green-500" : "text-violet-500"
                    )}>
                      {event.completed ? (
                        <CheckCircle className="h-5 w-5" weight="fill" />
                      ) : event.type === 'reminder' ? (
                        <Bell className="h-5 w-5" weight="duotone" />
                      ) : (
                        <Clock className="h-5 w-5" weight="duotone" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium",
                        event.completed && "line-through",
                        theme === "light" ? "text-gray-900" : "text-white"
                      )}>
                        {event.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {event.type === 'reminder' ? 'Reminder' : 'Action'}
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
                Connect your calendars to see all events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  hasGoogleCalendar
                    ? theme === "light" ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/30"
                    : theme === "light" ? "bg-white border-gray-200 hover:bg-gray-50" : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                data-testid="button-connect-google"
              >
                <GoogleLogo className={cn("h-5 w-5", hasGoogleCalendar ? "text-green-500" : (theme === "light" ? "text-gray-500" : "text-white/60"))} weight="duotone" />
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-medium", theme === "light" ? "text-gray-900" : "text-white")}>
                    Google Calendar
                  </p>
                  <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/50")}>
                    {hasGoogleCalendar ? "Connected" : "Sync your Google events"}
                  </p>
                </div>
                {hasGoogleCalendar && (
                  <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                )}
              </button>

              <button
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  hasOutlookCalendar
                    ? theme === "light" ? "bg-green-50 border-green-200" : "bg-green-500/10 border-green-500/30"
                    : theme === "light" ? "bg-white border-gray-200 hover:bg-gray-50" : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
                data-testid="button-connect-outlook"
              >
                <MicrosoftOutlookLogo className={cn("h-5 w-5", hasOutlookCalendar ? "text-green-500" : (theme === "light" ? "text-gray-500" : "text-white/60"))} weight="duotone" />
                <div className="flex-1 text-left">
                  <p className={cn("text-sm font-medium", theme === "light" ? "text-gray-900" : "text-white")}>
                    Outlook Calendar
                  </p>
                  <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/50")}>
                    {hasOutlookCalendar ? "Connected" : "Sync your Outlook events"}
                  </p>
                </div>
                {hasOutlookCalendar && (
                  <CheckCircle className="h-5 w-5 text-green-500" weight="fill" />
                )}
              </button>

              <p className={cn("text-xs text-center pt-2", theme === "light" ? "text-gray-400" : "text-white/40")}>
                Calendar sync coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
