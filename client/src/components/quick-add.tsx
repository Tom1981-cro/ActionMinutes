import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Lightning, CalendarDots, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import * as chrono from "chrono-node";
import { cn } from "@/lib/utils";

interface QuickAddProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickAdd({ isOpen: controlledOpen, onOpenChange }: QuickAddProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [text, setText] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, theme } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setText("");
        setParsedDate(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  const parseText = useCallback((value: string) => {
    setText(value);
    const results = chrono.parse(value, new Date(), { forwardDate: true });
    if (results.length > 0 && results[0].start) {
      setParsedDate(results[0].start.date());
    } else {
      setParsedDate(null);
    }
  }, []);

  const createReminder = useMutation({
    mutationFn: async (data: { text: string; dueDate: Date | null }) => {
      const bucket = data.dueDate ? determineBucket(data.dueDate) : "sometime";
      const response = await fetch(`/api/personal/reminders?userId=${user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          bucket,
          dueDate: data.dueDate?.toISOString() || null,
          priority: "normal",
        }),
      });
      if (!response.ok) throw new Error("Failed to create reminder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      toast({ title: "Added", description: "Task added to your inbox." });
      setText("");
      setParsedDate(null);
      setIsOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    },
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    createReminder.mutate({ text: text.trim(), dueDate: parsedDate });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-20 md:bottom-6 right-6 z-40 rounded-full w-14 h-14 shadow-lg",
          "bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500",
          "shadow-violet-500/30"
        )}
        data-testid="button-quick-add-fab"
      >
        <Plus weight="bold" className="h-6 w-6 text-white" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setText("");
          setParsedDate(null);
        }
      }}>
        <DialogContent className={cn(
          "sm:max-w-lg p-0 gap-0 overflow-hidden",
          theme === "light" ? "bg-white" : "bg-[#1a1a1a] border-white/10"
        )}>
          <DialogHeader className={cn(
            "px-4 py-3 border-b",
            theme === "light" ? "border-gray-200" : "border-white/10"
          )}>
            <DialogTitle className={cn(
              "flex items-center gap-2 text-lg",
              theme === "light" ? "text-gray-900" : "text-white"
            )}>
              <Lightning weight="duotone" className="h-5 w-5 text-violet-500" />
              Quick Add
              <Badge variant="secondary" className="ml-2 text-xs bg-white/10 text-white/60">
                Press Q
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="space-y-2">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => parseText(e.target.value)}
                placeholder="What do you need to do? e.g., 'Review report tomorrow at 2pm'"
                className={cn(
                  "h-12 text-base",
                  theme === "light" 
                    ? "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                    : "bg-white/5 border-white/10 text-white placeholder:text-white/40"
                )}
                data-testid="input-quick-add"
              />
              
              {parsedDate && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  theme === "light"
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                )}>
                  <CalendarDots weight="duotone" className="h-4 w-4" />
                  <span>Due: {format(parsedDate, "EEEE, MMMM d 'at' h:mm a")}</span>
                  <button 
                    type="button" 
                    onClick={() => setParsedDate(null)}
                    className="ml-auto hover:opacity-70"
                  >
                    <X weight="bold" className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className={cn(
                "text-xs",
                theme === "light" ? "text-gray-500" : "text-white/40"
              )}>
                Try: "tomorrow", "next Friday", "in 2 hours"
              </p>
              
              <Button
                type="submit"
                disabled={!text.trim() || createReminder.isPending}
                className="bg-violet-600 hover:bg-violet-700 text-white"
                data-testid="button-quick-add-submit"
              >
                {createReminder.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
