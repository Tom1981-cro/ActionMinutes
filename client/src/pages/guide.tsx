import { Link } from "wouter";
import { 
  ArrowLeft, ArrowRight, Tray, Brain, Bell, BookOpen, 
  Calendar, NotePencil, ListBullets, Lightning, Sparkle,
  CheckCircle, Plus
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GuidePage() {
  const features = [
    {
      icon: Tray,
      title: "Inbox",
      color: "violet",
      description: "Your central hub for capturing quick thoughts and reviewing what needs attention.",
      tips: [
        "Use Quick Add to jot down thoughts instantly",
        "Review your inbox daily to stay organized",
        "Move items to reminders, lists, or notes as needed"
      ]
    },
    {
      icon: Brain,
      title: "AI Extraction",
      color: "fuchsia",
      highlight: true,
      description: "Paste meeting notes and let AI find action items, decisions, and deadlines automatically.",
      tips: [
        "Works best with detailed meeting notes",
        "Each extracted task gets an owner and due date",
        "You can edit any item before saving"
      ]
    },
    {
      icon: Bell,
      title: "Task Inbox",
      color: "amber",
      description: "All your tasks unified in one place — from meetings, quick adds, and AI extraction.",
      tips: [
        "Drag and drop tasks between time buckets",
        "Natural language input: 'Call mom tomorrow'",
        "Mark complete to reach inbox zero"
      ]
    },
    {
      icon: BookOpen,
      title: "Journal",
      color: "emerald",
      description: "Capture daily thoughts with AI prompts that help you reflect and plan ahead.",
      tips: [
        "Start with the daily AI prompt for inspiration",
        "Track your mood over time",
        "Private and encrypted for your eyes only"
      ]
    },
    {
      icon: Calendar,
      title: "Calendar",
      color: "blue",
      description: "Sync with Google Calendar and Outlook. See your schedule alongside your tasks.",
      tips: [
        "Connect in Settings → Integrations",
        "View day, week, or month at a glance",
        "Create events that sync back to your calendar"
      ]
    },
    {
      icon: NotePencil,
      title: "Notes",
      color: "pink",
      description: "Encrypted notes for anything. Link them together, tag them, search them.",
      tips: [
        "Use tags to organize by project or topic",
        "Link related notes together",
        "Full-text search finds anything instantly"
      ]
    },
    {
      icon: ListBullets,
      title: "Custom Lists",
      color: "indigo",
      description: "Create your own lists for projects, shopping, goals—whatever you need.",
      tips: [
        "Create unlimited lists on any topic",
        "Check off items as you complete them",
        "Rename or delete lists anytime"
      ]
    },
    {
      icon: Lightning,
      title: "Quick Add",
      color: "orange",
      description: "Capture thoughts instantly from anywhere with natural language input.",
      tips: [
        "Available from your inbox",
        "Type naturally: 'Buy groceries tomorrow'",
        "AI understands dates, times, and context"
      ]
    }
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
    fuchsia: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
    amber: { bg: "bg-violet-600/20", text: "text-violet-400", border: "border-violet-500/30" },
    emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    blue: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    pink: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
    indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
    orange: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  };

  return (
    <div className="min-h-screen p-6 bg-background text-foreground" data-testid="page-guide">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/app/inbox">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" weight="duotone" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-guide-title">
              Getting Started
            </h1>
            <p className="text-sm text-muted-foreground">
              Your guide to personal productivity with ActionMinutes
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl bg-accent border-border" data-testid="card-overview">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary">
                <Sparkle className="h-6 w-6 text-primary-foreground" weight="fill" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2 text-foreground">
                  Your Personal Productivity Assistant
                </h2>
                <p className="text-sm text-muted-foreground">
                  ActionMinutes brings together everything you need to stay organized: notes, reminders, journal, calendar, and custom lists—all in one place. 
                  Plus, powerful AI that turns messy meeting notes into clear action items.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Quick Start
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="rounded-2xl bg-card border-border">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold bg-accent text-primary">
                  1
                </div>
                <h3 className="font-semibold text-foreground">
                  Capture
                </h3>
                <p className="text-sm text-muted-foreground">
                  Quick-add thoughts, notes, or paste meeting content into your Inbox.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-card border-border">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold bg-fuchsia-500/20 text-fuchsia-500">
                  2
                </div>
                <h3 className="font-semibold text-foreground">
                  Organize
                </h3>
                <p className="text-sm text-muted-foreground">
                  Move items to reminders, lists, or let AI extract tasks from notes.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-card border-border">
              <CardContent className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold bg-emerald-500/20 text-emerald-500">
                  3
                </div>
                <h3 className="font-semibold text-foreground">
                  Execute
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complete tasks, reflect in your journal, and reach inbox zero.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">
            Features
          </h2>

          <div className="space-y-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              const colors = colorClasses[feature.color];
              
              return (
                <Card 
                  key={feature.title}
                  className={cn(
                    "overflow-hidden rounded-2xl bg-card border-border",
                    feature.highlight && "border-fuchsia-500/30 ring-1 ring-fuchsia-500/20"
                  )}
                  data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardHeader className="border-b pb-4 border-border">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", colors.bg)}>
                        <Icon className={cn("h-5 w-5", colors.text)} weight="duotone" />
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                        {feature.title}
                        {feature.highlight && (
                          <span className="text-xs bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full">
                            AI Powered
                          </span>
                        )}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                    <div className="p-4 rounded-xl space-y-2 bg-muted">
                      <p className={cn("text-xs font-semibold uppercase tracking-wider", colors.text)}>
                        Tips
                      </p>
                      <ul className="space-y-2">
                        {feature.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.text)} weight="fill" />
                            <span className="text-sm text-muted-foreground">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl bg-card border-border" data-testid="card-quick-actions">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-foreground">
              Get Started Now
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/app/inbox">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
                  data-testid="button-go-inbox"
                >
                  <Tray className="h-4 w-4 mr-2" weight="duotone" />
                  Go to Inbox
                </Button>
              </Link>
              <Link href="/app/capture">
                <Button 
                  variant="outline"
                  className="rounded-xl border-border text-foreground hover:bg-accent"
                  data-testid="button-ai-extraction"
                >
                  <Brain className="h-4 w-4 mr-2" weight="duotone" />
                  AI Extraction
                </Button>
              </Link>
              <Link href="/app/journal">
                <Button 
                  variant="outline"
                  className="rounded-xl border-border text-foreground hover:bg-accent"
                  data-testid="button-journal"
                >
                  <BookOpen className="h-4 w-4 mr-2" weight="duotone" />
                  Start Journaling
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-6 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Need help? Visit our <Link href="/support" className="text-primary hover:text-primary">Support page</Link> or send feedback from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
