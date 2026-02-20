import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useActionItems, useMeetings } from "@/lib/hooks";
import { authenticatedFetch } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Sun, Moon, CloudSun, CloudRain, CloudSnow, Wind, CloudFog, Cloud, Lightning as LightningBolt, Thermometer,
  MapPin, Circle, CheckCircle, Clock, CalendarBlank, Bell, Target, Users, CaretRight,
  Plus, ArrowRight, Sparkle, Star
} from "@phosphor-icons/react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const WMO_CODES: Record<number, { label: string; icon: typeof Sun }> = {
  0: { label: "Clear", icon: Sun },
  1: { label: "Mostly clear", icon: Sun },
  2: { label: "Partly cloudy", icon: CloudSun },
  3: { label: "Overcast", icon: Cloud },
  45: { label: "Foggy", icon: CloudFog },
  48: { label: "Rime fog", icon: CloudFog },
  51: { label: "Light drizzle", icon: CloudRain },
  53: { label: "Drizzle", icon: CloudRain },
  55: { label: "Heavy drizzle", icon: CloudRain },
  61: { label: "Light rain", icon: CloudRain },
  63: { label: "Rain", icon: CloudRain },
  65: { label: "Heavy rain", icon: CloudRain },
  71: { label: "Light snow", icon: CloudSnow },
  73: { label: "Snow", icon: CloudSnow },
  75: { label: "Heavy snow", icon: CloudSnow },
  77: { label: "Snow grains", icon: CloudSnow },
  80: { label: "Showers", icon: CloudRain },
  81: { label: "Heavy showers", icon: CloudRain },
  82: { label: "Violent showers", icon: CloudRain },
  85: { label: "Snow showers", icon: CloudSnow },
  86: { label: "Heavy snow showers", icon: CloudSnow },
  95: { label: "Thunderstorm", icon: LightningBolt },
  96: { label: "Hail storm", icon: LightningBolt },
  99: { label: "Heavy hail", icon: LightningBolt },
};

interface WeatherData {
  temperature: number;
  weatherCode: number;
  locationName: string;
}

function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });

        const { latitude, longitude } = position.coords;

        const [weatherRes, geoRes] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`),
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`),
        ]);

        const weatherData = await weatherRes.json();
        const geoData = await geoRes.json();

        if (!cancelled) {
          setWeather({
            temperature: Math.round(weatherData.current.temperature_2m),
            weatherCode: weatherData.current.weather_code,
            locationName: geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.address?.county || "Your location",
          });
        }
      } catch {
        if (!cancelled) {
          try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,weather_code');
            const data = await res.json();
            setWeather({
              temperature: Math.round(data.current.temperature_2m),
              weatherCode: data.current.weather_code,
              locationName: "London",
            });
          } catch {
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <div className="w-20 h-4 bg-muted rounded" />
      </div>
    );
  }

  if (!weather) return null;

  const weatherInfo = WMO_CODES[weather.weatherCode] || WMO_CODES[0];
  const WeatherIcon = weatherInfo.icon;

  return (
    <div className="flex items-center gap-3 text-muted-foreground" data-testid="weather-widget">
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" weight="fill" />
        <span className="text-sm">{weather.locationName}</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <WeatherIcon className="h-4 w-4" weight="duotone" />
        <span className="text-sm font-medium text-foreground">{weather.temperature}°C</span>
        <span className="text-xs hidden sm:inline">{weatherInfo.label}</span>
      </div>
    </div>
  );
}

interface ActionTask {
  id: string;
  text: string;
  dueDate: string | null;
  ownerName: string | null;
  status: string;
  priority?: string;
  source: 'meeting' | 'quickadd';
}

interface Reminder {
  id: string;
  text: string;
  bucket: string;
  dueDate: string | null;
  isCompleted: boolean;
  priority: string;
  status: string;
  deletedAt?: string | null;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  duration?: string;
  location?: string;
  attendeeCount?: number;
}

function TaskCard({ task, onClick }: { task: ActionTask; onClick: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-all text-left group"
      data-testid={`planner-task-${task.id}`}
    >
      <div className={cn(
        "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
        task.status === 'done' ? "bg-primary border-primary" : "border-muted-foreground/30"
      )}>
        {task.status === 'done' && <CheckCircle className="h-3 w-3 text-primary-foreground" weight="fill" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium text-foreground", task.status === 'done' && "line-through text-muted-foreground")}>{task.text}</p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {task.ownerName && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {task.ownerName}
            </span>
          )}
          {isOverdue && <span className="text-destructive font-medium">Overdue</span>}
          {task.priority === 'high' && (
            <span className="flex items-center gap-1 text-orange-500">
              <Star className="h-3 w-3" weight="fill" /> High
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {task.status === 'needs_review' && (
          <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold tracking-wide bg-destructive/10 text-destructive border border-destructive/20">
            Needs Review
          </span>
        )}
        {(task.status === 'open' || task.status === 'waiting') && (
          <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
            {task.status === 'waiting' ? 'Waiting' : 'Open'}
          </span>
        )}
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </button>
  );
}

function ReminderCard({ reminder, onClick }: { reminder: Reminder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card/60 hover:bg-card rounded-lg p-3 border border-dashed border-border hover:border-primary/30 transition-all flex items-center gap-3 text-left"
      data-testid={`planner-reminder-${reminder.id}`}
    >
      <div className={cn(
        "w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0",
        reminder.isCompleted ? "bg-primary/80 border-primary/80" : "border-muted-foreground/40"
      )}>
        {reminder.isCompleted && <div className="w-2 h-2 bg-primary-foreground rounded-full" />}
      </div>
      <span className={cn("text-sm flex-1", reminder.isCompleted ? "text-muted-foreground line-through" : "text-foreground")}>
        {reminder.text}
      </span>
      {reminder.dueDate && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {new Date(reminder.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      )}
    </button>
  );
}

function MeetingCard({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10 text-left hover:bg-primary/10 transition-colors"
      data-testid={`planner-meeting-${meeting.id}`}
    >
      <div className="flex flex-col items-center justify-center bg-card w-12 h-12 rounded-lg shadow-sm text-primary flex-shrink-0">
        {meeting.startTime ? (
          <>
            <span className="text-xs font-bold">{meeting.startTime.split(':').slice(0, 2).join(':')}</span>
          </>
        ) : (
          <CalendarBlank className="h-5 w-5" weight="duotone" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{meeting.title}</p>
        <p className="text-xs text-muted-foreground">
          {meeting.attendeeCount ? `${meeting.attendeeCount} attendees` : ""}
          {meeting.location ? ` · ${meeting.location}` : ""}
        </p>
      </div>
      <CaretRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

export default function PlannerPage() {
  const { user } = useStore();
  const [, navigate] = useLocation();

  const { data: actions = [], isLoading: actionsLoading } = useActionItems();

  const { data: reminders = [], isLoading: remindersLoading } = useQuery<Reminder[]>({
    queryKey: ["reminders", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch reminders");
      return res.json();
    },
    enabled: !!user.id,
  });

  const { data: allMeetings = [], isLoading: meetingsLoading } = useMeetings();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayActions: ActionTask[] = (actions as any[])
    .filter((a: any) => {
      if (a.status === 'done' || a.status === 'completed') return false;
      if (a.deletedAt) return false;
      if (!a.dueDate) return a.status === 'needs_review';
      const due = new Date(a.dueDate);
      return due <= endOfToday;
    })
    .map((a: any) => ({
      id: a.id,
      text: a.text,
      dueDate: a.dueDate,
      ownerName: a.ownerName,
      status: a.status,
      priority: a.priority || 'normal',
      source: a.meetingId ? 'meeting' as const : 'quickadd' as const,
    }))
    .sort((a, b) => {
      if (a.status === 'needs_review' && b.status !== 'needs_review') return -1;
      if (a.status !== 'needs_review' && b.status === 'needs_review') return 1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
    });

  const overdueActions = todayActions.filter(t => t.dueDate && new Date(t.dueDate) < startOfToday);
  const focusActions = todayActions.filter(t => !t.dueDate || new Date(t.dueDate) >= startOfToday);

  const todayReminders = reminders
    .filter(r => {
      if (r.deletedAt) return false;
      if (r.bucket === 'today') return true;
      if (r.dueDate) {
        const due = new Date(r.dueDate);
        return due >= startOfToday && due < endOfToday;
      }
      return false;
    });

  const todayMeetings = (allMeetings as any[])
    .filter((m: any) => {
      const mDate = new Date(m.date);
      return mDate >= startOfToday && mDate < endOfToday;
    })
    .sort((a: any, b: any) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .map((m: any) => ({
      id: m.id,
      title: m.title,
      date: m.date,
      startTime: m.startTime,
      duration: m.duration,
      location: m.location,
      attendeeCount: m.attendeeCount,
    }));

  const isLoading = actionsLoading || remindersLoading || meetingsLoading;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-12 w-full bg-muted rounded-xl mt-6" />
          <div className="grid grid-cols-12 gap-8 mt-8">
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
            </div>
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="h-40 bg-muted rounded-xl" />
              <div className="h-32 bg-muted rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalTodayItems = todayActions.length + todayReminders.filter(r => !r.isCompleted).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8" data-testid="planner-page">
      <header className="mb-8">
        <div className="flex items-end justify-between mb-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              {getGreeting()}, {user.name || "there"}
            </h1>
            <p className="text-muted-foreground font-medium">{getFormattedDate()}</p>
          </div>
          <WeatherWidget />
        </div>

        <div className="mt-6 relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Plus className="text-muted-foreground group-focus-within:text-primary transition-colors h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="What is your main focus for today?"
            className="block w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl shadow-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:shadow-md transition-all text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                authenticatedFetch('/api/personal/reminders', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id, text: val, bucket: 'today', priority: 'normal' }),
                }).then(() => {
                  (e.target as HTMLInputElement).value = '';
                  window.dispatchEvent(new Event('focus'));
                });
              }
            }}
            data-testid="planner-quick-input"
          />
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 lg:gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {overdueActions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4" weight="duotone" /> Overdue & Urgent
                </h2>
                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
                  {overdueActions.length} {overdueActions.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="space-y-2">
                {overdueActions.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/app/action/${task.source === 'meeting' ? 'meeting' : 'reminder'}/${task.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4 w-4" weight="duotone" /> Today's Focus
              </h2>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                {focusActions.length} {focusActions.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            {focusActions.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-dashed border-border">
                <Sparkle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" weight="duotone" />
                <p className="text-muted-foreground">No tasks scheduled for today.</p>
                <button
                  onClick={() => navigate('/app/inbox')}
                  className="mt-2 text-primary text-sm font-medium hover:underline inline-flex items-center gap-1"
                >
                  Pick from Inbox <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {focusActions.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => navigate(`/app/action/${task.source === 'meeting' ? 'meeting' : 'reminder'}/${task.id}`)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Bell className="h-4 w-4" weight="duotone" /> Personal Reminders
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {todayReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onClick={() => navigate(`/app/reminders`)}
                />
              ))}
              {todayReminders.length === 0 && (
                <div className="col-span-2 text-center py-6 text-muted-foreground text-sm">
                  No reminders for today
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-2xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <CalendarBlank className="h-4 w-4" weight="duotone" /> Today's Meetings
            </h3>
            {todayMeetings.length === 0 ? (
              <div className="text-center py-6">
                <CalendarBlank className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" weight="duotone" />
                <p className="text-sm text-muted-foreground">No meetings today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayMeetings.map(meeting => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => navigate(`/app/meeting/${meeting.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks today</span>
                <span className="text-sm font-semibold text-foreground">{todayActions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reminders</span>
                <span className="text-sm font-semibold text-foreground">{todayReminders.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meetings</span>
                <span className="text-sm font-semibold text-foreground">{todayMeetings.length}</span>
              </div>
              {overdueActions.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-destructive">Overdue</span>
                  <span className="text-sm font-semibold text-destructive">{overdueActions.length}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/app/journal')}
            className="w-full bg-amber-400 rounded-2xl p-5 text-[#1A1A1A] shadow-[0_2px_8px_rgba(0,0,0,0.06)] relative overflow-hidden group cursor-pointer text-left hover:shadow-md transition-shadow"
            data-testid="planner-daily-review"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkle className="h-16 w-16" weight="fill" />
            </div>
            <h3 className="font-bold text-lg mb-1 relative z-10">Daily Review</h3>
            <p className="text-[#1A1A1A]/70 text-sm mb-3 relative z-10">Clear your mind before ending the day.</p>
            <span className="bg-white/30 hover:bg-white/40 px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-block">
              Start Reflection
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
