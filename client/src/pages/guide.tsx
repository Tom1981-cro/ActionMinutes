import { Link } from "wouter";
import { ArrowLeft, PlayCircle, Microphone, Camera, NotePencil, CheckCircle, EnvelopeSimple, Users, CalendarBlank, Lightning, Sparkle, Bell, BookOpen, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export default function GuidePage() {
  const { theme } = useStore();
  const isDark = theme === "dark";

  const steps = [
    {
      number: 1,
      title: "Capture Your Meeting Notes",
      icon: NotePencil,
      description: "Start by entering your meeting notes. You can type them directly, upload a photo of handwritten notes, or record audio to be transcribed.",
      tips: [
        "Add a clear meeting title and select the date",
        "Include all attendees - names are required, emails optional",
        "Don't worry about formatting - our AI handles messy notes"
      ],
      screenshot: null,
    },
    {
      number: 2,
      title: "Use Voice or Photo Input",
      icon: Microphone,
      description: "Too busy to type? Use our voice transcription or photo import features to capture notes on the go.",
      tips: [
        "Voice: Click the microphone button and upload an audio recording",
        "Photo: Click the camera button to upload a photo of handwritten notes",
        "Both features use AI to convert your input to text"
      ],
      screenshot: null,
      secondaryIcon: Camera,
    },
    {
      number: 3,
      title: "Extract Action Items with AI",
      icon: Sparkle,
      description: "Click 'Extract Actions' and our AI will analyze your notes in seconds. It identifies action items, decisions, risks, and generates a meeting summary.",
      tips: [
        "Each action item gets an owner and suggested due date",
        "Items with low confidence are marked for your review",
        "You can edit any extracted item before finalizing"
      ],
      screenshot: null,
    },
    {
      number: 4,
      title: "Review and Assign Tasks",
      icon: CheckCircle,
      description: "Review the extracted action items in your Inbox. Assign owners, adjust due dates, and mark items as complete as work progresses.",
      tips: [
        "Use the 'Mine' filter to see only tasks assigned to you",
        "Click any task to see its source meeting context",
        "Update status: Not Started → In Progress → Complete"
      ],
      screenshot: null,
    },
    {
      number: 5,
      title: "Send Follow-up Emails",
      icon: EnvelopeSimple,
      description: "AI generates ready-to-send follow-up emails for each meeting. Connect Gmail or Outlook to send directly from ActionMinutes.",
      tips: [
        "Drafts include meeting summary and action items",
        "Customize the tone in Settings (formal, friendly, or brief)",
        "Send individually or as a group recap"
      ],
      screenshot: null,
    },
    {
      number: 6,
      title: "Collaborate with Your Team",
      icon: Users,
      description: "Create workspaces to share meetings with your team. Everyone sees the same action items and can track progress together.",
      tips: [
        "Invite team members via email",
        "Switch between Personal and Team modes",
        "Each workspace has its own meetings and inbox"
      ],
      screenshot: null,
    },
  ];

  const personalFeatures = [
    {
      icon: Bell,
      title: "Personal Reminders",
      description: "Organize your personal tasks in a Kanban-style board with buckets: Today, Tomorrow, Next Week, Next Month, and Sometime. Drag and drop to reschedule."
    },
    {
      icon: BookOpen,
      title: "Personal Journal",
      description: "Capture thoughts and reflect with AI-powered prompts. The journal detects patterns like overwhelm or decision-making and offers supportive suggestions."
    }
  ];

  return (
    <div className={cn(
      "min-h-screen p-6",
      isDark ? "bg-[#0a0a0a] text-white" : "bg-gray-50 text-gray-900"
    )} data-testid="page-guide">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/app/inbox">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-full",
                isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              )}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" weight="duotone" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")} data-testid="text-guide-title">
              Getting Started with ActionMinutes
            </h1>
            <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>
              Transform your meeting notes into action items in under 60 seconds
            </p>
          </div>
        </div>

        <Card className={cn(
          "overflow-hidden rounded-2xl",
          isDark ? "bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-500/30" : "bg-gradient-to-br from-violet-50 to-fuchsia-50 border-violet-200"
        )} data-testid="card-overview">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Lightning className="h-6 w-6 text-white" weight="fill" />
              </div>
              <div>
                <h2 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>
                  Minutes → Actions → Follow-ups
                </h2>
                <p className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>
                  ActionMinutes is your AI-powered meeting assistant. Paste your meeting notes, and we'll extract action items with owners and due dates, identify key decisions and risks, and generate ready-to-send follow-up emails. No more lost tasks or forgotten commitments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Step-by-Step Guide
          </h2>

          {steps.map((step) => (
            <Card 
              key={step.number}
              className={cn(
                "overflow-hidden rounded-2xl",
                isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
              )}
              data-testid={`card-step-${step.number}`}
            >
              <CardHeader className={cn(
                "border-b",
                isDark ? "border-white/10" : "border-gray-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg",
                    isDark ? "bg-violet-500/20 text-violet-400" : "bg-violet-100 text-violet-600"
                  )}>
                    {step.number}
                  </div>
                  <div className="flex items-center gap-2">
                    <step.icon className={cn("h-5 w-5", isDark ? "text-violet-400" : "text-violet-500")} weight="duotone" />
                    {step.secondaryIcon && (
                      <step.secondaryIcon className={cn("h-5 w-5", isDark ? "text-fuchsia-400" : "text-fuchsia-500")} weight="duotone" />
                    )}
                    <CardTitle className={cn("text-lg", isDark ? "text-white" : "text-gray-900")}>
                      {step.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className={cn("text-sm", isDark ? "text-white/80" : "text-gray-600")}>
                  {step.description}
                </p>
                <div className={cn(
                  "p-4 rounded-xl space-y-2",
                  isDark ? "bg-white/5" : "bg-gray-50"
                )}>
                  <p className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-violet-400" : "text-violet-600")}>
                    Tips
                  </p>
                  <ul className="space-y-2">
                    {step.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className={cn("h-4 w-4 mt-0.5 flex-shrink-0", isDark ? "text-violet-400" : "text-violet-500")} weight="bold" />
                        <span className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>
            Personal Mode Features
          </h2>
          <p className={cn("text-sm", isDark ? "text-white/60" : "text-gray-500")}>
            Enable Personal mode in Settings to access these additional features for individual productivity.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {personalFeatures.map((feature) => (
              <Card 
                key={feature.title}
                className={cn(
                  "overflow-hidden rounded-2xl",
                  isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                )}
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      isDark ? "bg-violet-500/20" : "bg-violet-100"
                    )}>
                      <feature.icon className={cn("h-5 w-5", isDark ? "text-violet-400" : "text-violet-600")} weight="duotone" />
                    </div>
                    <div>
                      <h3 className={cn("font-semibold mb-1", isDark ? "text-white" : "text-gray-900")}>
                        {feature.title}
                      </h3>
                      <p className={cn("text-sm", isDark ? "text-white/70" : "text-gray-600")}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className={cn(
          "overflow-hidden rounded-2xl",
          isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
        )} data-testid="card-quick-actions">
          <CardContent className="p-6">
            <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-900")}>
              Quick Actions
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/app/capture">
                <Button 
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white rounded-xl"
                  data-testid="button-start-capture"
                >
                  <NotePencil className="h-4 w-4 mr-2" weight="duotone" />
                  Capture Meeting Notes
                </Button>
              </Link>
              <Link href="/app/inbox">
                <Button 
                  variant="outline"
                  className={cn(
                    "rounded-xl",
                    isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-200"
                  )}
                  data-testid="button-view-inbox"
                >
                  <CheckCircle className="h-4 w-4 mr-2" weight="duotone" />
                  View Inbox
                </Button>
              </Link>
              <Link href="/app/settings">
                <Button 
                  variant="outline"
                  className={cn(
                    "rounded-xl",
                    isDark ? "border-white/20 text-white hover:bg-white/10" : "border-gray-200"
                  )}
                  data-testid="button-open-settings"
                >
                  Customize Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className={cn(
          "text-center py-6 border-t",
          isDark ? "border-white/10" : "border-gray-200"
        )}>
          <p className={cn("text-sm", isDark ? "text-white/50" : "text-gray-400")}>
            Need help? Visit our <Link href="/support" className="text-violet-400 hover:text-violet-300">Support page</Link> or send feedback from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
