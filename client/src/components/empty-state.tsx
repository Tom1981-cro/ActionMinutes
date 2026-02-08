import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tray, CalendarBlank, Note, BookOpen, Microphone, 
  FileText, PaperPlaneTilt, Sparkle, Plus, Play,
  LightbulbFilament, CheckCircle, ArrowRight
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type EmptyStateVariant = 
  | "inbox" 
  | "meetings" 
  | "transcripts" 
  | "drafts" 
  | "journal" 
  | "calendar" 
  | "notes"
  | "tasks"
  | "capture"
  | "generic";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onAction?: () => void;
  actionLabel?: string;
  showTutorial?: boolean;
  onTutorialStart?: () => void;
}

const EMPTY_STATE_CONFIG: Record<EmptyStateVariant, {
  icon: typeof Tray;
  title: string;
  description: string;
  tips: string[];
  defaultAction: string;
  illustration?: string;
}> = {
  inbox: {
    icon: Tray,
    title: "Your inbox is empty",
    description: "Action items from meetings and quick tasks will appear here. This is your central hub for what needs your attention.",
    tips: [
      "Press Q anywhere to quickly add a task",
      "Extract actions from meeting notes automatically",
      "Items with due dates show up first"
    ],
    defaultAction: "Add your first task",
  },
  meetings: {
    icon: CalendarBlank,
    title: "No meetings captured yet",
    description: "Capture meeting notes and let AI extract action items, decisions, and risks automatically.",
    tips: [
      "Type or paste your meeting notes",
      "Upload images of handwritten notes",
      "Record audio for automatic transcription"
    ],
    defaultAction: "Capture a meeting",
  },
  transcripts: {
    icon: Microphone,
    title: "No transcripts yet",
    description: "Record meetings or upload audio files to create searchable, AI-analyzed transcripts.",
    tips: [
      "Record directly from your browser",
      "Upload MP3, WAV, or M4A files",
      "AI extracts key points and action items"
    ],
    defaultAction: "Create a transcript",
  },
  drafts: {
    icon: PaperPlaneTilt,
    title: "No drafts saved",
    description: "AI-generated follow-up emails and meeting summaries will appear here for review before sending.",
    tips: [
      "Drafts are created from meeting summaries",
      "Review and edit before sending",
      "Connect your email to send directly"
    ],
    defaultAction: "Create from a meeting",
  },
  journal: {
    icon: BookOpen,
    title: "Start your journal",
    description: "Capture thoughts, reflections, and ideas. AI prompts help you explore your thinking.",
    tips: [
      "Track your mood over time",
      "Get personalized writing prompts",
      "AI summarizes key themes and insights"
    ],
    defaultAction: "Write your first entry",
  },
  calendar: {
    icon: CalendarBlank,
    title: "No events scheduled",
    description: "Connect your Google or Outlook calendar to see your schedule and create events.",
    tips: [
      "Sync with Google Calendar or Outlook",
      "Create events from meeting action items",
      "Get reminders before important meetings"
    ],
    defaultAction: "Connect calendar",
  },
  notes: {
    icon: Note,
    title: "No notes yet",
    description: "Create encrypted notes with rich formatting, tags, and cross-references.",
    tips: [
      "Use tags to organize your notes",
      "Link notes together for quick navigation",
      "All notes are encrypted for privacy"
    ],
    defaultAction: "Create a note",
  },
  tasks: {
    icon: CheckCircle,
    title: "No tasks yet",
    description: "Manage your to-dos with due dates, priorities, and smart reminders.",
    tips: [
      "Set due dates and priorities",
      "Mark tasks as waiting when blocked",
      "Get reminded at the right time"
    ],
    defaultAction: "Add a task",
  },
  capture: {
    icon: FileText,
    title: "Ready to capture",
    description: "Enter meeting notes, upload an image, or start recording audio.",
    tips: [
      "Paste text from your notes app",
      "Take a photo of whiteboard notes",
      "Record the entire meeting"
    ],
    defaultAction: "Start capturing",
  },
  generic: {
    icon: FileText,
    title: "Nothing here yet",
    description: "Get started by adding your first item.",
    tips: [],
    defaultAction: "Get started",
  },
};

export function EmptyState({ 
  variant, 
  onAction, 
  actionLabel, 
  showTutorial = true,
  onTutorialStart 
}: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[variant];
  const Icon = config.icon;

  return (
    <div
      style={{ animation: "fadeUp 0.4s ease-out forwards" }}
    >
      <Card className="glass-panel border-dashed border-border rounded-2xl overflow-hidden">
        <CardContent className="py-12 px-6 md:px-12">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="mx-auto h-20 w-20 bg-accent rounded-2xl flex items-center justify-center shadow-token animate-glow-pulse">
              <Icon className="h-10 w-10 text-primary" weight="duotone" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">{config.title}</h3>
              <p className="text-muted-foreground text-base leading-relaxed">
                {config.description}
              </p>
            </div>

            {config.tips.length > 0 && (
              <div className="bg-muted rounded-xl p-4 text-left space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <LightbulbFilament className="h-4 w-4 text-amber-400" weight="fill" />
                  Quick tips
                </p>
                <ul className="space-y-2">
                  {config.tips.map((tip, index) => (
                    <li 
                      key={index}
                      className="flex items-start gap-2 text-sm text-foreground"
                      style={{ animation: `fadeIn 0.3s ease-out ${0.1 * (index + 1)}s both` }}
                    >
                      <Sparkle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" weight="fill" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {onAction && (
                <Button 
                  onClick={onAction}
                  className="rounded-xl btn-gradient h-12 px-6"
                  data-testid={`button-empty-action-${variant}`}
                >
                  <Plus className="h-5 w-5 mr-2" weight="bold" />
                  {actionLabel || config.defaultAction}
                </Button>
              )}
              
              {showTutorial && onTutorialStart && (
                <Button 
                  variant="outline"
                  onClick={onTutorialStart}
                  className="rounded-xl h-12 px-6 border-primary/30 text-primary hover:bg-accent"
                  data-testid={`button-tutorial-${variant}`}
                >
                  <Play className="h-4 w-4 mr-2" weight="fill" />
                  Watch tutorial
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface InlineEmptyStateProps {
  icon: typeof Tray;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InlineEmptyState({ 
  icon: Icon, 
  title, 
  description,
  action,
  className 
}: InlineEmptyStateProps) {
  return (
    <div className={cn(
      "py-8 text-center border border-dashed border-border rounded-xl",
      className
    )}>
      <div className="mx-auto h-12 w-12 bg-muted rounded-xl flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" weight="duotone" />
      </div>
      <p className="text-foreground font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      )}
      {action && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={action.onClick}
          className="mt-3 text-primary hover:text-primary hover:bg-accent"
        >
          {action.label}
          <ArrowRight className="h-4 w-4 ml-1" weight="bold" />
        </Button>
      )}
    </div>
  );
}
