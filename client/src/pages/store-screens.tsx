import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const screens = [
  {
    id: 1,
    title: "Minutes → Actions → Follow-ups",
    subtitle: "Turn messy meeting notes into calm, clear actions",
    content: (
      <div className="space-y-6">
        <div className="bg-card rounded-2xl p-6 shadow-soft border border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Raw Notes</div>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>Mike needs to fix auth bug by Thursday</p>
            <p>Sarah will handle marketing deck for board</p>
            <p>Decision: delay mobile launch 2 weeks</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span>Processing</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-accent rounded-xl p-4 text-center border border-border">
            <div className="text-2xl font-bold text-primary">3</div>
            <div className="text-xs text-primary">Actions</div>
          </div>
          <div className="bg-accent rounded-xl p-4 text-center border border-border">
            <div className="text-2xl font-bold text-primary">1</div>
            <div className="text-xs text-primary">Decision</div>
          </div>
          <div className="bg-accent rounded-xl p-4 text-center border border-border">
            <div className="text-2xl font-bold text-primary">2</div>
            <div className="text-xs text-primary">Follow-ups</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Extract actions in 60 seconds",
    subtitle: "AI-powered extraction with confidence scoring",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground">Fix auth bug blocking API</div>
              <div className="text-sm text-muted-foreground mt-1">Mike • Due: Thursday</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "95%" }} />
                </div>
                <span className="text-xs font-medium text-green-600">95%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground">Finalize marketing deck</div>
              <div className="text-sm text-muted-foreground mt-1">Sarah • Due: Friday</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "98%" }} />
                </div>
                <span className="text-xs font-medium text-green-600">98%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground">Update Jira roadmap</div>
              <div className="text-sm text-muted-foreground mt-1">Mike • No due date</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "62%" }} />
                </div>
                <span className="text-xs font-medium text-amber-600">62%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground">Extracted in 1.2 seconds</div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Never miss a follow-up",
    subtitle: "Auto-generated email drafts ready to send",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">M</div>
            <div>
              <div className="font-medium text-foreground">To: Mike</div>
              <div className="text-xs text-muted-foreground">mike@company.com</div>
            </div>
          </div>
          <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Re: Q4 Roadmap - Action Items</p>
            <p>Hi Mike,</p>
            <p className="mt-2">Following up from our sync today. You mentioned you'd fix the auth bug by Thursday. Let me know if you need any help.</p>
            <p className="mt-2">Best,<br/>Alex</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="btn-gradient text-primary-foreground flex-1">Send via Gmail</Button>
            <Button size="sm" variant="outline" className="flex-1">Edit</Button>
          </div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border opacity-60">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">S</div>
            <div>
              <div className="font-medium text-foreground">To: Sarah</div>
              <div className="text-xs text-muted-foreground">sarah@company.com</div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Draft ready...</div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: "Inbox: open loops, sorted",
    subtitle: "All your tasks in one prioritized view",
    content: (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-accent text-primary rounded-full text-xs font-medium">All</div>
            <div className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">Mine</div>
            <div className="px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">Team</div>
          </div>
          <div className="text-xs text-muted-foreground">12 open</div>
        </div>
        {[
          { title: "Fix auth bug", owner: "Mike", due: "Today", priority: "high" },
          { title: "Marketing deck", owner: "Sarah", due: "Tomorrow", priority: "high" },
          { title: "Update roadmap", owner: "Mike", due: "This week", priority: "medium" },
          { title: "Review contracts", owner: "You", due: "Next week", priority: "low" },
        ].map((task, i) => (
          <div key={i} className="bg-card rounded-xl p-4 shadow-soft border border-border flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex-shrink-0",
              task.priority === "high" ? "border-red-400" : task.priority === "medium" ? "border-amber-400" : "border-border"
            )} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{task.title}</div>
              <div className="text-xs text-muted-foreground">{task.owner}</div>
            </div>
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              task.due === "Today" ? "bg-red-50 text-red-600" : task.due === "Tomorrow" ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground"
            )}>
              {task.due}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 5,
    title: "Team: assign & track",
    subtitle: "Role-based permissions and workspace management",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Product Team</div>
          <div className="space-y-3">
            {[
              { name: "Alex Chen", role: "Admin", avatar: "A", tasks: 5 },
              { name: "Mike Torres", role: "Member", avatar: "M", tasks: 8 },
              { name: "Sarah Kim", role: "Member", avatar: "S", tasks: 3 },
            ].map((member, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{member.name}</div>
                  <div className="text-xs text-muted-foreground">{member.role}</div>
                </div>
                <div className="text-sm font-medium text-primary">{member.tasks} tasks</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-accent rounded-xl p-4 border border-border">
            <div className="text-2xl font-bold text-primary">16</div>
            <div className="text-xs text-primary">Open tasks</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="text-2xl font-bold text-green-600">24</div>
            <div className="text-xs text-green-500">Completed</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: "Personal: journal + reminders",
    subtitle: "Private space for reflection and planning",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-lg">📝</div>
            <div className="font-medium text-foreground">Today's Entry</div>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Feeling overwhelmed with the product launch. Need to delegate more of the technical tasks to the team...
          </div>
          <div className="flex gap-2 mt-4">
            <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">overwhelm</span>
            <span className="px-2 py-1 bg-accent text-primary rounded-full text-xs font-medium">delegation</span>
          </div>
        </div>
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
          <div className="text-sm font-medium opacity-90 mb-2">AI Prompt</div>
          <div className="text-lg font-semibold">What would "done" look like for the launch?</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Today", "Tomorrow", "This Week"].map((bucket, i) => (
            <div key={i} className="bg-card rounded-xl p-3 text-center shadow-soft border border-border">
              <div className="text-lg font-bold text-foreground">{[3, 2, 5][i]}</div>
              <div className="text-xs text-muted-foreground">{bucket}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: "Gmail/Outlook drafts (no send)",
    subtitle: "Generates drafts in your email client—you control send",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">G</span>
              </div>
              <span className="font-medium text-foreground">Gmail</span>
            </div>
            <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Connected</div>
          </div>
          <div className="text-sm text-muted-foreground">Drafts appear in your Gmail drafts folder. You review and send.</div>
        </div>
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">O</span>
              </div>
              <span className="font-medium text-foreground">Outlook</span>
            </div>
            <div className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">Connect</div>
          </div>
          <div className="text-sm text-muted-foreground">Link your Microsoft account to create drafts.</div>
        </div>
        <div className="bg-accent rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
              <span className="text-primary">🔒</span>
            </div>
            <div>
              <div className="font-medium text-primary">Your control, always</div>
              <div className="text-sm text-primary">We never send emails on your behalf</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 8,
    title: "Calendar export",
    subtitle: "Export reminders and due dates to your calendar",
    content: (
      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-5 shadow-soft border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground text-lg">
              📅
            </div>
            <div>
              <div className="font-medium text-foreground">Export to Calendar</div>
              <div className="text-xs text-muted-foreground">ICS format for any calendar app</div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { title: "Fix auth bug", date: "Dec 5", time: "All day" },
              { title: "Marketing deck due", date: "Dec 6", time: "All day" },
              { title: "Board meeting prep", date: "Dec 10", time: "All day" },
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <div className="w-12 text-center">
                  <div className="text-xs text-muted-foreground">{event.date.split(" ")[0]}</div>
                  <div className="text-lg font-bold text-foreground">{event.date.split(" ")[1]}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{event.title}</div>
                  <div className="text-xs text-muted-foreground">{event.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button className="w-full btn-gradient text-primary-foreground">
          Download .ics File
        </Button>
        <div className="text-center text-xs text-muted-foreground">
          Works with Google Calendar, Apple Calendar, Outlook
        </div>
      </div>
    ),
  },
];

function DeviceFrame({ children, showFrame }: { children: React.ReactNode; showFrame: boolean }) {
  if (!showFrame) {
    return <>{children}</>;
  }

  return (
    <div className="relative mx-auto" style={{ maxWidth: "375px" }}>
      <div className="absolute inset-0 bg-secondary rounded-[3rem] shadow-2xl" style={{ transform: "scale(1.04)" }} />
      <div className="relative bg-secondary rounded-[2.5rem] p-3">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-secondary rounded-b-2xl z-10" />
        <div className="bg-muted rounded-[2rem] overflow-hidden">
          <div className="h-6 bg-muted" />
          {children}
          <div className="h-6 bg-muted" />
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-secondary rounded-full" />
    </div>
  );
}

export default function StoreScreensPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);

  const currentScreen = screens[currentIndex];

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + screens.length) % screens.length);
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">App Store Screenshots</h1>
            <p className="text-muted-foreground text-sm">Capture each screen for store submissions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="device-frame"
                checked={showDeviceFrame}
                onCheckedChange={setShowDeviceFrame}
                data-testid="toggle-device-frame"
              />
              <Label htmlFor="device-frame" className="text-sm text-muted-foreground cursor-pointer">
                <span className="flex items-center gap-1.5">
                  {showDeviceFrame ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  Device Frame
                </span>
              </Label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            data-testid="button-prev-screen"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex justify-center gap-2">
            {screens.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                data-testid={`screen-dot-${i}`}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all",
                  i === currentIndex ? "bg-primary scale-125" : "bg-border hover:bg-muted-foreground"
                )}
              />
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={goNext}
            data-testid="button-next-screen"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground mb-4">
          Screen {currentIndex + 1} of {screens.length}
        </div>

        <DeviceFrame showFrame={showDeviceFrame}>
          <div className="bg-muted px-6 py-8" style={{ minHeight: "600px" }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">{currentScreen.title}</h2>
              <p className="text-sm text-muted-foreground">{currentScreen.subtitle}</p>
            </div>
            {currentScreen.content}
          </div>
        </DeviceFrame>

        <div className="mt-8 grid grid-cols-4 gap-3">
          {screens.map((screen, i) => (
            <button
              key={screen.id}
              onClick={() => setCurrentIndex(i)}
              data-testid={`thumbnail-${i}`}
              className={cn(
                "p-3 rounded-xl text-left transition-all border",
                i === currentIndex
                  ? "bg-accent border-primary"
                  : "bg-card border-border hover:border-primary"
              )}
            >
              <div className="text-xs font-medium text-foreground truncate">{screen.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
