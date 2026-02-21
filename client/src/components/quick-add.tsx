import { useState, useEffect, useRef, useCallback } from "react";
import {
  Lightning, CalendarDots, X, CalendarBlank, Clock, Timer, Flag,
  Hash, MapPin, Tray, ListBullets, CaretDown,
  Sun, SunHorizon, Calendar as CalendarIcon, ArrowsClockwise,
  Check
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DatePickerModal } from "@/components/date-picker-modal";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { format, addDays, nextSaturday, startOfWeek, addWeeks } from "date-fns";
import * as chrono from "chrono-node";
import { cn } from "@/lib/utils";

interface QuickAddProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: Date | null;
}

type Destination = "inbox" | "meetings" | string;
type Priority = "high" | "normal" | "low" | "none";
type RecurrenceOption = "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | null;

const PRIORITIES: { value: Priority; label: string; color: string; icon: string }[] = [
  { value: "high", label: "High", color: "text-red-500", icon: "🔴" },
  { value: "normal", label: "Normal", color: "text-violet-500", icon: "🟡" },
  { value: "low", label: "Low", color: "text-emerald-500", icon: "🟢" },
  { value: "none", label: "None", color: "text-muted-foreground", icon: "⚪" },
];

const RECURRENCE_OPTIONS: { value: RecurrenceOption; label: string }[] = [
  { value: null, label: "No repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function QuickAdd({ isOpen: controlledOpen, onOpenChange, defaultDate }: QuickAddProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<string>("");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [deadlineTime, setDeadlineTime] = useState<string>("");
  const [priority, setPriority] = useState<Priority>("none");
  const [reminderAt, setReminderAt] = useState<Date | null>(null);
  const [reminderTime, setReminderTime] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [location, setLocation] = useState("");
  const [destination, setDestination] = useState<Destination>("inbox");
  const [recurrence, setRecurrence] = useState<RecurrenceOption>(null);

  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<string>("");
  const [allDay, setAllDay] = useState(false);
  const [reminderMode, setReminderMode] = useState("on_time");
  const [repeatEnds, setRepeatEnds] = useState("endless");
  const [repeatEndDate, setRepeatEndDate] = useState<Date | null>(null);
  const [repeatEndCount, setRepeatEndCount] = useState<number | null>(null);

  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showTagsPicker, setShowTagsPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const { data: globalTags = [] } = useQuery<{ id: string; name: string; color: string | null }[]>({
    queryKey: ["global-tags"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tags");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: customLists = [] } = useQuery<{ id: string; name: string; color?: string }[]>({
    queryKey: ["custom-lists", user.id],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/lists");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  const { data: locationSuggestions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["locations", location],
    queryFn: async () => {
      if (location.length < 3) return [];
      const res = await authenticatedFetch(`/api/locations?search=${encodeURIComponent(location)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen && location.length >= 3,
  });

  useEffect(() => {
    if (isOpen && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
    if (isOpen && defaultDate) {
      setDueDate(defaultDate);
    }
  }, [isOpen, defaultDate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "q" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeEl = document.activeElement;
        const isTyping = activeEl?.tagName === "INPUT" ||
          activeEl?.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement)?.isContentEditable;
        if (!isTyping) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setDueDate(null);
    setDueTime("");
    setDeadline(null);
    setDeadlineTime("");
    setPriority("none");
    setReminderAt(null);
    setReminderTime("");
    setSelectedTags([]);
    setNewTagInput("");
    setLocation("");
    setDestination("inbox");
    setRecurrence(null);
    setEndDate(null);
    setEndTime("");
    setAllDay(false);
    setReminderMode("on_time");
    setRepeatEnds("endless");
    setRepeatEndDate(null);
    setRepeatEndCount(null);
    setShowDatePickerModal(false);
    setShowDatePicker(false);
    setShowDeadlinePicker(false);
    setShowPriorityPicker(false);
    setShowReminderPicker(false);
    setShowTagsPicker(false);
    setShowLocationPicker(false);
    setShowDestinationPicker(false);
  }, []);

  const determineBucket = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (dateOnly <= today) return "today";
    if (dateOnly <= tomorrow) return "tomorrow";
    if (dateOnly <= nextWeek) return "next_week";
    if (dateOnly <= nextMonth) return "next_month";
    return "sometime";
  };

  const combineDateTime = (date: Date | null, time: string): Date | null => {
    if (!date) return null;
    const result = new Date(date);
    if (time) {
      const [h, m] = time.split(":").map(Number);
      result.setHours(h, m, 0, 0);
    }
    return result;
  };

  const createAction = useMutation({
    mutationFn: async () => {
      const finalDueDate = combineDateTime(dueDate, dueTime);
      const finalDeadline = combineDateTime(deadline, deadlineTime);
      const finalReminderAt = combineDateTime(reminderAt, reminderTime);

      if (location) {
        await authenticatedFetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: location }),
        });
      }

      if (destination === "meetings") {
        const res = await authenticatedFetch("/api/meetings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            title: title.trim(),
            date: (finalDueDate || new Date()).toISOString(),
            startTime: dueTime || null,
            duration: null,
            location: location || null,
            rawNotes: description || "",
            parseState: "draft",
          }),
        });
        if (!res.ok) throw new Error("Failed to create meeting");
        const meeting = await res.json();

        if (finalDueDate) {
          const endDate = new Date(finalDueDate);
          endDate.setHours(endDate.getHours() + 1);
          await authenticatedFetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description || "",
              location: location || "",
              startTime: finalDueDate.toISOString(),
              endTime: endDate.toISOString(),
              provider: "local",
              meetingId: meeting.id,
            }),
          });
        }

        return { type: "meeting", data: meeting };
      }

      const reminderData: any = {
        userId: user.id,
        text: title.trim(),
        description: description || null,
        bucket: finalDueDate ? determineBucket(finalDueDate) : "sometime",
        dueDate: finalDueDate?.toISOString() || null,
        deadline: finalDeadline?.toISOString() || null,
        priority: priority === "none" ? "normal" : priority,
        tags: selectedTags,
        location: location || null,
        recurrence: recurrence || null,
        reminderAt: finalReminderAt?.toISOString() || null,
        sourceType: "addaction",
      };

      const res = await authenticatedFetch("/api/personal/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminderData),
      });
      if (!res.ok) throw new Error("Failed to create action");
      const reminder = await res.json();

      if (destination !== "inbox" && destination !== "meetings") {
        await authenticatedFetch(`/api/lists/${destination}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reminderId: reminder.id }),
        });
      }

      return { type: destination, data: reminder };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["actioned"] });
      queryClient.invalidateQueries({ queryKey: ["deleted"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      const destLabel =
        result.type === "inbox" ? "Inbox" :
        result.type === "meetings" ? "Meetings" :
        customLists.find(l => l.id === result.type)?.name || "List";

      toast({
        title: "Action added",
        description: `Added to ${destLabel}`,
      });
      resetForm();
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add action.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createAction.mutate();
  };

  const handleCreateTag = async () => {
    if (!newTagInput.trim()) return;
    const tagName = newTagInput.trim().replace(/^#/, "");
    const res = await authenticatedFetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tagName }),
    });
    if (res.ok) {
      const tag = await res.json();
      setSelectedTags(prev => [...prev, tag.name]);
      setNewTagInput("");
      queryClient.invalidateQueries({ queryKey: ["global-tags"] });
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextMonday = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
  const nextWeekend = nextSaturday(today);

  const getDestinationLabel = () => {
    if (destination === "inbox") return "Inbox";
    if (destination === "meetings") return "Meetings";
    return customLists.find(l => l.id === destination)?.name || "List";
  };

  const getDestinationIcon = () => {
    if (destination === "inbox") return <Tray className="h-3 w-3" weight="duotone" />;
    if (destination === "meetings") return <CalendarBlank className="h-3 w-3" weight="duotone" />;
    return <ListBullets className="h-3 w-3" weight="duotone" />;
  };

  const priorityInfo = PRIORITIES.find(p => p.value === priority)!;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 md:bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg",
          "bg-primary hover:bg-primary/90"
        )}
        data-testid="button-addaction-fab"
      >
        <Lightning weight="fill" className="h-6 w-6 text-primary-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-visible bg-card border-border top-[5%] translate-y-0" data-testid="dialog-addaction">
          <DialogHeader className="px-3 py-2.5 border-b border-border">
            <DialogTitle className="flex items-center gap-1.5 text-sm text-foreground">
              <Lightning weight="fill" className="h-4 w-4 text-primary" />
              <span>Add<span className="text-primary font-semibold">Action</span></span>
              <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
                Q
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-3 pt-3 space-y-1">
              <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task name"
                className="h-8 text-sm bg-transparent border-none shadow-none px-0 font-medium text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
                data-testid="input-addaction-title"
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="h-7 text-xs bg-transparent border-none shadow-none px-0 text-muted-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0"
                data-testid="input-addaction-description"
              />
            </div>

            <div className="px-3 py-2 flex flex-wrap gap-1.5">
              {/* Date Button - opens DatePickerModal */}
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors",
                  dueDate
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:bg-accent"
                )}
                onClick={() => setShowDatePickerModal(true)}
                data-testid="button-addaction-date"
              >
                <CalendarBlank className="h-3 w-3" weight="duotone" />
                {dueDate ? format(dueDate, "d MMM") : "Date"}
                {dueDate && (
                  <span onClick={(e) => { e.stopPropagation(); setDueDate(null); setDueTime(""); setRecurrence(null); }} className="ml-1 hover:text-foreground">
                    <X className="h-3 w-3" />
                  </span>
                )}
              </button>

              {/* Priority Button */}
              <Popover open={showPriorityPicker} onOpenChange={setShowPriorityPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors",
                      priority
                        ? `border-primary/30 bg-primary/10 ${priorityInfo.color}`
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent"
                    )}
                    data-testid="button-addaction-priority"
                  >
                    <Flag className="h-3 w-3" weight="duotone" />
                    {priorityInfo.label}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1 bg-card border-border" align="start" sideOffset={8}>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors",
                        priority === p.value ? "bg-accent" : "hover:bg-accent"
                      )}
                      onClick={() => { setPriority(p.value); setShowPriorityPicker(false); }}
                      data-testid={`priority-${p.value}`}
                    >
                      <span>{p.icon}</span>
                      <span className={cn("flex-1 text-left", p.color)}>{p.label}</span>
                      {priority === p.value && <Check className="h-3.5 w-3.5 text-primary" weight="bold" />}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {recurrence && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary text-[11px]">
                  <ArrowsClockwise className="h-3 w-3" weight="duotone" />
                  {RECURRENCE_OPTIONS.find(r => r.value === recurrence)?.label}
                </span>
              )}

              {/* Tags Button */}
              <Popover open={showTagsPicker} onOpenChange={setShowTagsPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors",
                      selectedTags.length > 0
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent"
                    )}
                    data-testid="button-addaction-tags"
                  >
                    <Hash className="h-3 w-3" weight="duotone" />
                    {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""}` : "Tags"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-card border-border" align="start" sideOffset={8}>
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="# new tag"
                        className="h-8 text-sm flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateTag(); } }}
                        data-testid="input-new-tag"
                      />
                      <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={handleCreateTag}>
                        <Lightning className="h-3.5 w-3.5" weight="bold" />
                      </Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {globalTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className={cn(
                            "flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors",
                            selectedTags.includes(tag.name) ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
                          )}
                          onClick={() => toggleTag(tag.name)}
                          data-testid={`tag-${tag.name}`}
                        >
                          <Hash className="h-3.5 w-3.5" weight="duotone" />
                          <span className="flex-1 text-left">{tag.name}</span>
                          {selectedTags.includes(tag.name) && <Check className="h-3.5 w-3.5" weight="bold" />}
                        </button>
                      ))}
                      {globalTags.length === 0 && !newTagInput && (
                        <p className="text-xs text-muted-foreground text-center py-2">No tags yet. Type above to create one.</p>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Location Button */}
              <Popover open={showLocationPicker} onOpenChange={setShowLocationPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] transition-colors",
                      location
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent"
                    )}
                    data-testid="button-addaction-location"
                  >
                    <MapPin className="h-3 w-3" weight="duotone" />
                    {location ? (location.length > 15 ? location.slice(0, 15) + "..." : location) : "Location"}
                    {location && (
                      <span onClick={(e) => { e.stopPropagation(); setLocation(""); }} className="ml-1 hover:text-foreground">
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 bg-card border-border" align="start" sideOffset={8}>
                  <div className="space-y-2">
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter location..."
                      className="h-8 text-sm"
                      autoFocus
                      data-testid="input-location"
                    />
                    {locationSuggestions.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {locationSuggestions.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm hover:bg-accent text-foreground transition-colors"
                            onClick={() => { setLocation(loc.name); setShowLocationPicker(false); }}
                          >
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
                            <span className="flex-1 text-left">{loc.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {selectedTags.length > 0 && (
              <div className="px-3 pb-1.5 flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] rounded-full gap-0.5 cursor-pointer hover:bg-destructive/10 px-1.5 py-0"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                    <X className="h-2 w-2" weight="bold" />
                  </Badge>
                ))}
              </div>
            )}

            <div className="px-3 py-2 border-t border-border flex items-center justify-between gap-2">
              <Popover open={showDestinationPicker} onOpenChange={setShowDestinationPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-addaction-destination"
                  >
                    {getDestinationIcon()}
                    <span>{getDestinationLabel()}</span>
                    <CaretDown className="h-2.5 w-2.5" weight="bold" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1 bg-card border-border" align="start" side="top" sideOffset={8}>
                  {[
                    { value: "inbox" as Destination, label: "Inbox", icon: <Tray className="h-3.5 w-3.5" weight="duotone" /> },
                    { value: "meetings" as Destination, label: "Meetings", icon: <CalendarBlank className="h-3.5 w-3.5" weight="duotone" /> },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={cn(
                        "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] transition-colors",
                        destination === opt.value ? "bg-accent text-primary" : "hover:bg-accent text-foreground"
                      )}
                      onClick={() => { setDestination(opt.value); setShowDestinationPicker(false); }}
                      data-testid={`destination-${opt.value}`}
                    >
                      {opt.icon}
                      <span className="flex-1 text-left">{opt.label}</span>
                      {destination === opt.value && <Check className="h-3 w-3 text-primary" weight="bold" />}
                    </button>
                  ))}
                  {customLists.length > 0 && (
                    <>
                      <div className="border-t border-border my-1" />
                      {customLists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          className={cn(
                            "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-[11px] transition-colors",
                            destination === list.id ? "bg-accent text-primary" : "hover:bg-accent text-foreground"
                          )}
                          onClick={() => { setDestination(list.id); setShowDestinationPicker(false); }}
                          data-testid={`destination-list-${list.id}`}
                        >
                          <ListBullets className="h-3.5 w-3.5" weight="duotone" />
                          <span className="flex-1 text-left">{list.name}</span>
                          {destination === list.id && <Check className="h-3 w-3 text-primary" weight="bold" />}
                        </button>
                      ))}
                    </>
                  )}
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { resetForm(); setIsOpen(false); }}
                  className="text-xs h-7 px-2"
                  data-testid="button-addaction-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!title.trim() || createAction.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs h-7 px-3"
                  data-testid="button-addaction-submit"
                >
                  {createAction.isPending ? "Adding..." : "AddAction"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DatePickerModal
        open={showDatePickerModal}
        onOpenChange={setShowDatePickerModal}
        date={dueDate}
        time={dueTime}
        endDate={endDate}
        endTime={endTime}
        allDay={allDay}
        reminder={reminderMode}
        recurrence={recurrence}
        repeatEnds={repeatEnds}
        repeatEndDate={repeatEndDate}
        repeatEndCount={repeatEndCount}
        onConfirm={(values) => {
          setDueDate(values.date);
          setDueTime(values.time);
          setEndDate(values.endDate);
          setEndTime(values.endTime);
          setAllDay(values.allDay);
          setReminderMode(values.reminder);
          setRecurrence(values.recurrence as RecurrenceOption);
          setRepeatEnds(values.repeatEnds);
          setRepeatEndDate(values.repeatEndDate);
          setRepeatEndCount(values.repeatEndCount);
        }}
        onClear={() => {
          setDueDate(null);
          setDueTime("");
          setEndDate(null);
          setEndTime("");
          setAllDay(false);
          setReminderMode("on_time");
          setRecurrence(null);
          setRepeatEnds("endless");
          setRepeatEndDate(null);
          setRepeatEndCount(null);
        }}
        showSkipOccurrence={!!recurrence}
      />
    </>
  );
}
