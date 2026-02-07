import { useState, useEffect, useCallback } from "react";
import {
  Sun,
  SunHorizon,
  CalendarPlus,
  Moon,
  ArrowRight,
  Clock,
  BellRinging,
  ArrowsClockwise,
  Repeat,
  Check,
} from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  isSameDay,
} from "date-fns";

interface DatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  time: string;
  endDate: Date | null;
  endTime: string;
  allDay: boolean;
  reminder: string;
  recurrence: string | null;
  repeatEnds: string;
  repeatEndDate: Date | null;
  repeatEndCount: number | null;
  onConfirm: (values: {
    date: Date | null;
    time: string;
    endDate: Date | null;
    endTime: string;
    allDay: boolean;
    reminder: string;
    recurrence: string | null;
    repeatEnds: string;
    repeatEndDate: Date | null;
    repeatEndCount: number | null;
  }) => void;
  onClear: () => void;
  showSkipOccurrence?: boolean;
}

const REMINDER_OPTIONS = [
  { value: "on_time", label: "On time" },
  { value: "5_min", label: "5 minutes early" },
  { value: "30_min", label: "30 minutes early" },
  { value: "1_hour", label: "1 hour early" },
  { value: "1_day", label: "1 day early" },
  { value: "custom", label: "Custom" },
] as const;

const RECURRENCE_OPTIONS = [
  { value: null, label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const REPEAT_ENDS_OPTIONS = [
  { value: "endless", label: "Endless" },
  { value: "by_date", label: "End by a date" },
  { value: "by_count", label: "End by a repeat count" },
] as const;

export function DatePickerModal({
  open,
  onOpenChange,
  date,
  time,
  endDate,
  endTime,
  allDay,
  reminder,
  recurrence,
  repeatEnds,
  repeatEndDate,
  repeatEndCount,
  onConfirm,
  onClear,
  showSkipOccurrence = false,
}: DatePickerModalProps) {
  const [activeTab, setActiveTab] = useState<"date" | "duration">("date");
  const [localDate, setLocalDate] = useState<Date | null>(null);
  const [localTime, setLocalTime] = useState("10:00");
  const [localEndDate, setLocalEndDate] = useState<Date | null>(null);
  const [localEndTime, setLocalEndTime] = useState("11:00");
  const [localAllDay, setLocalAllDay] = useState(false);
  const [localReminder, setLocalReminder] = useState("on_time");
  const [localRecurrence, setLocalRecurrence] = useState<string | null>(null);
  const [localRepeatEnds, setLocalRepeatEnds] = useState("endless");
  const [localRepeatEndDate, setLocalRepeatEndDate] = useState<Date | null>(null);
  const [localRepeatEndCount, setLocalRepeatEndCount] = useState<number | null>(null);

  const [reminderOpen, setReminderOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [repeatEndsOpen, setRepeatEndsOpen] = useState(false);
  const [repeatEndDateOpen, setRepeatEndDateOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalDate(date);
      setLocalTime(time || "10:00");
      setLocalEndDate(endDate);
      setLocalEndTime(endTime || "11:00");
      setLocalAllDay(allDay);
      setLocalReminder(reminder || "on_time");
      setLocalRecurrence(recurrence);
      setLocalRepeatEnds(repeatEnds || "endless");
      setLocalRepeatEndDate(repeatEndDate);
      setLocalRepeatEndCount(repeatEndCount);
      setReminderOpen(false);
      setRecurrenceOpen(false);
      setRepeatEndsOpen(false);
      setRepeatEndDateOpen(false);
    }
  }, [open, date, time, endDate, endTime, allDay, reminder, recurrence, repeatEnds, repeatEndDate, repeatEndCount]);

  const handleConfirm = useCallback(() => {
    onConfirm({
      date: localDate,
      time: localTime,
      endDate: localEndDate,
      endTime: localEndTime,
      allDay: localAllDay,
      reminder: localReminder,
      recurrence: localRecurrence,
      repeatEnds: localRepeatEnds,
      repeatEndDate: localRepeatEndDate,
      repeatEndCount: localRepeatEndCount,
    });
    onOpenChange(false);
  }, [localDate, localTime, localEndDate, localEndTime, localAllDay, localReminder, localRecurrence, localRepeatEnds, localRepeatEndDate, localRepeatEndCount, onConfirm, onOpenChange]);

  const handleClear = useCallback(() => {
    setLocalDate(null);
    setLocalTime("10:00");
    setLocalEndDate(null);
    setLocalEndTime("11:00");
    setLocalAllDay(false);
    setLocalReminder("on_time");
    setLocalRecurrence(null);
    setLocalRepeatEnds("endless");
    setLocalRepeatEndDate(null);
    setLocalRepeatEndCount(null);
    onClear();
    onOpenChange(false);
  }, [onClear, onOpenChange]);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeekDate = addDays(startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }), 0);
  const nextMonthDate = addMonths(today, 1);

  const isQuickDateSelected = (quickDate: Date) =>
    localDate !== null && isSameDay(localDate, quickDate);

  const getReminderLabel = () =>
    REMINDER_OPTIONS.find((o) => o.value === localReminder)?.label || "On time";

  const getRecurrenceLabel = () => {
    if (!localRecurrence) return "None";
    const opt = RECURRENCE_OPTIONS.find((o) => o.value === localRecurrence);
    if (!opt) return "None";
    if (localRecurrence === "weekly" && localDate) {
      return `Weekly (${format(localDate, "EEEE")})`;
    }
    return opt.label;
  };

  const getRepeatEndsLabel = () =>
    REPEAT_ENDS_OPTIONS.find((o) => o.value === localRepeatEnds)?.label || "Endless";

  const reminderRow = (
    <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
          data-testid="button-datepicker-reminder"
        >
          <BellRinging className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <span className="flex-1 text-left text-foreground">{getReminderLabel()}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 bg-card border-border" align="start" sideOffset={4}>
        {REMINDER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            onClick={() => { setLocalReminder(opt.value); setReminderOpen(false); }}
            data-testid={`reminder-option-${opt.value}`}
          >
            <span className="flex-1 text-left text-foreground">{opt.label}</span>
            {localReminder === opt.value && <Check className="h-4 w-4 text-primary" weight="bold" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  const recurrenceRow = (
    <Popover open={recurrenceOpen} onOpenChange={setRecurrenceOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
          data-testid="button-datepicker-repeat"
        >
          <ArrowsClockwise className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <span className="flex-1 text-left text-foreground">{getRecurrenceLabel()}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 bg-card border-border" align="start" sideOffset={4}>
        {RECURRENCE_OPTIONS.map((opt) => (
          <button
            key={opt.value ?? "none"}
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            onClick={() => {
              setLocalRecurrence(opt.value);
              if (!opt.value) {
                setLocalRepeatEnds("endless");
                setLocalRepeatEndDate(null);
                setLocalRepeatEndCount(null);
              }
              setRecurrenceOpen(false);
            }}
            data-testid={`recurrence-option-${opt.value ?? "none"}`}
          >
            <span className="flex-1 text-left text-foreground">{opt.label}</span>
            {localRecurrence === opt.value && <Check className="h-4 w-4 text-primary" weight="bold" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );

  const repeatEndsRow = localRecurrence ? (
    <Popover open={repeatEndsOpen} onOpenChange={setRepeatEndsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-accent transition-colors text-sm"
          data-testid="button-datepicker-repeat-ends"
        >
          <Repeat className="h-4 w-4 text-muted-foreground" weight="duotone" />
          <span className="flex-1 text-left text-foreground">
            Repeat Ends: {getRepeatEndsLabel()}
            {localRepeatEnds === "by_date" && localRepeatEndDate && ` (${format(localRepeatEndDate, "d MMM yyyy")})`}
            {localRepeatEnds === "by_count" && localRepeatEndCount !== null && ` (${localRepeatEndCount}x)`}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1 bg-card border-border" align="start" sideOffset={4}>
        {REPEAT_ENDS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
            onClick={() => {
              setLocalRepeatEnds(opt.value);
              if (opt.value === "endless") {
                setLocalRepeatEndDate(null);
                setLocalRepeatEndCount(null);
              }
              if (opt.value !== "by_date") setRepeatEndsOpen(false);
              if (opt.value !== "by_count") setRepeatEndsOpen(false);
            }}
            data-testid={`repeat-ends-option-${opt.value}`}
          >
            <span className="flex-1 text-left text-foreground">{opt.label}</span>
            {localRepeatEnds === opt.value && <Check className="h-4 w-4 text-primary" weight="bold" />}
          </button>
        ))}
        {localRepeatEnds === "by_date" && (
          <div className="px-2 py-2 border-t border-border mt-1">
            <Popover open={repeatEndDateOpen} onOpenChange={setRepeatEndDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded-lg text-sm hover:bg-accent border border-border"
                  data-testid="button-repeat-end-date"
                >
                  {localRepeatEndDate ? format(localRepeatEndDate, "d MMM yyyy") : "Select end date"}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                <Calendar
                  mode="single"
                  selected={localRepeatEndDate ?? undefined}
                  onSelect={(d) => { setLocalRepeatEndDate(d ?? null); setRepeatEndDateOpen(false); }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
        {localRepeatEnds === "by_count" && (
          <div className="px-2 py-2 border-t border-border mt-1">
            <Input
              type="number"
              min={1}
              value={localRepeatEndCount ?? ""}
              onChange={(e) => setLocalRepeatEndCount(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Number of repeats"
              className="h-8 text-sm"
              data-testid="input-repeat-end-count"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  ) : null;

  const bottomButtons = (
    <div className="flex items-center gap-2 px-3 py-3 border-t border-border">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 rounded-xl"
        onClick={handleClear}
        data-testid="button-datepicker-clear"
      >
        Clear
      </Button>
      <Button
        type="button"
        size="sm"
        className="flex-1 rounded-xl"
        onClick={handleConfirm}
        data-testid="button-datepicker-ok"
      >
        OK
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[300px] p-0 gap-0 bg-card border-border rounded-2xl overflow-hidden"
        data-testid="dialog-datepicker"
      >
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          <button
            type="button"
            className={cn(
              "flex-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
              activeTab === "date"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            onClick={() => setActiveTab("date")}
            data-testid="tab-datepicker-date"
          >
            Date
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors",
              activeTab === "duration"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
            onClick={() => setActiveTab("duration")}
            data-testid="tab-datepicker-duration"
          >
            Duration
          </button>
        </div>

        {activeTab === "date" ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-around px-4 py-2">
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                  isQuickDateSelected(today) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocalDate(today)}
                data-testid="quick-date-today"
              >
                <Sun className="h-5 w-5" weight="duotone" />
                <span className="text-[10px]">Today</span>
              </button>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                  isQuickDateSelected(tomorrow) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocalDate(tomorrow)}
                data-testid="quick-date-tomorrow"
              >
                <SunHorizon className="h-5 w-5" weight="duotone" />
                <span className="text-[10px]">Tomorrow</span>
              </button>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                  isQuickDateSelected(nextWeekDate) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocalDate(nextWeekDate)}
                data-testid="quick-date-next-week"
              >
                <CalendarPlus className="h-5 w-5" weight="duotone" />
                <span className="text-[10px]">+7</span>
              </button>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                  isQuickDateSelected(nextMonthDate) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setLocalDate(nextMonthDate)}
                data-testid="quick-date-next-month"
              >
                <Moon className="h-5 w-5" weight="duotone" />
                <span className="text-[10px]">Month</span>
              </button>
              {showSkipOccurrence && (
                <button
                  type="button"
                  className="flex flex-col items-center gap-1 p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => {}}
                  data-testid="quick-date-skip"
                >
                  <ArrowRight className="h-5 w-5" weight="duotone" />
                  <span className="text-[10px]">Skip</span>
                </button>
              )}
            </div>

            <div className="px-1">
              <Calendar
                mode="single"
                selected={localDate ?? undefined}
                onSelect={(d) => setLocalDate(d ?? null)}
                className="w-full"
              />
            </div>

            <div className="space-y-0.5 px-0 py-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-accent transition-colors">
                <Clock className="h-4 w-4 text-muted-foreground" weight="duotone" />
                <span className="text-sm text-foreground flex-1">Time</span>
                <Input
                  type="time"
                  value={localTime}
                  onChange={(e) => setLocalTime(e.target.value)}
                  className="h-7 w-24 text-sm border-none bg-accent/50 rounded-lg text-right px-2"
                  data-testid="input-datepicker-time"
                />
              </div>

              {reminderRow}
              {recurrenceRow}
              {repeatEndsRow}
            </div>

            {bottomButtons}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="space-y-2 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10">Start</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex-1 text-left px-2 py-1.5 rounded-lg text-sm border border-border hover:bg-accent transition-colors"
                      data-testid="button-duration-start-date"
                    >
                      {localDate ? format(localDate, "d MMM yyyy") : "Select date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={localDate ?? undefined}
                      onSelect={(d) => setLocalDate(d ?? null)}
                    />
                  </PopoverContent>
                </Popover>
                {!localAllDay && (
                  <Input
                    type="time"
                    value={localTime}
                    onChange={(e) => setLocalTime(e.target.value)}
                    className="h-8 w-24 text-sm"
                    data-testid="input-duration-start-time"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-10">End</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex-1 text-left px-2 py-1.5 rounded-lg text-sm border border-border hover:bg-accent transition-colors"
                      data-testid="button-duration-end-date"
                    >
                      {localEndDate ? format(localEndDate, "d MMM yyyy") : "Select date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={localEndDate ?? undefined}
                      onSelect={(d) => setLocalEndDate(d ?? null)}
                    />
                  </PopoverContent>
                </Popover>
                {!localAllDay && (
                  <Input
                    type="time"
                    value={localEndTime}
                    onChange={(e) => setLocalEndTime(e.target.value)}
                    className="h-8 w-24 text-sm"
                    data-testid="input-duration-end-time"
                  />
                )}
              </div>
              <div className="flex items-center justify-between px-1 py-1">
                <span className="text-sm text-foreground">All Day</span>
                <Switch
                  checked={localAllDay}
                  onCheckedChange={setLocalAllDay}
                  data-testid="switch-duration-allday"
                />
              </div>
            </div>

            <div className="space-y-0.5 px-0 py-1 border-t border-border">
              {reminderRow}
              {recurrenceRow}
              {repeatEndsRow}
            </div>

            {bottomButtons}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
