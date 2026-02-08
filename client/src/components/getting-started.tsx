import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  X, CheckCircle, ArrowRight, Microphone, 
  NotePencil, Sparkle, CalendarBlank, Rocket
} from "@phosphor-icons/react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/lib/motion-shim";

interface GettingStartedStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Microphone;
  href: string;
  completed: boolean;
}

const STORAGE_KEY = "actionminutes-getting-started";

interface GettingStartedState {
  dismissed: boolean;
  completedSteps: string[];
}

function getStoredState(): GettingStartedState {
  if (typeof window === "undefined") return { dismissed: false, completedSteps: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to parse getting started state", e);
  }
  return { dismissed: false, completedSteps: [] };
}

function saveState(state: GettingStartedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save getting started state", e);
  }
}

interface GettingStartedProps {
  className?: string;
  onDismiss?: () => void;
  hasMeetings?: boolean;
  hasNotes?: boolean;
  hasCalendarConnected?: boolean;
}

export function GettingStarted({ 
  className,
  onDismiss,
  hasMeetings = false,
  hasNotes = false,
  hasCalendarConnected = false,
}: GettingStartedProps) {
  const [state, setState] = useState<GettingStartedState>(() => getStoredState());
  const [isVisible, setIsVisible] = useState(!state.dismissed);

  const steps: GettingStartedStep[] = [
    {
      id: "capture",
      title: "Capture your first meeting",
      description: "Record notes, upload audio, or type directly",
      icon: Microphone,
      href: "/app/capture",
      completed: hasMeetings || state.completedSteps.includes("capture"),
    },
    {
      id: "notes",
      title: "Create a note",
      description: "Organize thoughts with encrypted notes",
      icon: NotePencil,
      href: "/app/notes",
      completed: hasNotes || state.completedSteps.includes("notes"),
    },
    {
      id: "calendar",
      title: "Connect your calendar",
      description: "Sync with Google or Outlook",
      icon: CalendarBlank,
      href: "/app/settings",
      completed: hasCalendarConnected || state.completedSteps.includes("calendar"),
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const allCompleted = completedCount === steps.length;

  useEffect(() => {
    if (allCompleted && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [allCompleted, isVisible]);

  const handleDismiss = () => {
    const newState = { ...state, dismissed: true };
    setState(newState);
    saveState(newState);
    setIsVisible(false);
    onDismiss?.();
  };

  const markStepCompleted = (stepId: string) => {
    if (!state.completedSteps.includes(stepId)) {
      const newState = {
        ...state,
        completedSteps: [...state.completedSteps, stepId],
      };
      setState(newState);
      saveState(newState);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={className}
      >
        <Card className="glass-panel border-primary/30 rounded-2xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-accent rounded-xl flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary" weight="fill" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Getting Started</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {allCompleted 
                      ? "You're all set! Great job." 
                      : `${completedCount} of ${steps.length} completed`
                    }
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg"
                data-testid="button-dismiss-getting-started"
              >
                <X className="h-4 w-4" weight="bold" />
              </Button>
            </div>
            
            <Progress 
              value={progressPercent} 
              className="h-1.5 mt-3 bg-muted"
            />
          </CardHeader>
          
          <CardContent className="pt-0 space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isNext = !step.completed && steps.slice(0, index).every(s => s.completed);
              
              return (
                <Link key={step.id} href={step.href}>
                  <motion.div
                    onClick={() => markStepCompleted(step.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group",
                      step.completed 
                        ? "bg-emerald-500/10 border border-emerald-500/20" 
                        : isNext
                        ? "bg-accent border border-primary/30 hover:bg-accent"
                        : "bg-muted border border-border hover:bg-accent"
                    )}
                    whileHover={{ x: 4 }}
                    data-testid={`step-${step.id}`}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      step.completed 
                        ? "bg-emerald-500/20" 
                        : isNext
                        ? "bg-accent"
                        : "bg-muted"
                    )}>
                      {step.completed ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" weight="fill" />
                      ) : (
                        <Icon className={cn(
                          "h-5 w-5",
                          isNext ? "text-primary" : "text-muted-foreground"
                        )} weight="duotone" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm",
                        step.completed ? "text-emerald-300 line-through opacity-70" : "text-foreground"
                      )}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                    
                    {!step.completed && (
                      <ArrowRight className={cn(
                        "h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
                        isNext ? "text-primary" : "text-muted-foreground"
                      )} weight="bold" />
                    )}
                  </motion.div>
                </Link>
              );
            })}
            
            {allCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
              >
                <Sparkle className="h-5 w-5 text-emerald-400" weight="fill" />
                <p className="text-sm text-emerald-300">
                  You're all set up! This panel will hide automatically.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function GettingStartedMini({ className }: { className?: string }) {
  const [state] = useState<GettingStartedState>(() => getStoredState());
  
  if (state.dismissed) return null;
  
  const completedCount = state.completedSteps.length;
  const progressPercent = (completedCount / 3) * 100;
  
  return (
    <Link href="/app/inbox">
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-accent border border-primary/20 hover:bg-accent transition-colors cursor-pointer",
        className
      )} data-testid="link-getting-started-mini">
        <Rocket className="h-5 w-5 text-primary" weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Getting Started</p>
          <Progress value={progressPercent} className="h-1 mt-1 bg-muted" />
        </div>
        <span className="text-xs text-muted-foreground">{completedCount}/3</span>
      </div>
    </Link>
  );
}
