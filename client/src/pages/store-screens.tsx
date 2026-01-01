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
        <div className="bg-white rounded-2xl p-6 shadow-soft border border-gray-100">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Raw Notes</div>
          <div className="text-sm text-slate-600 leading-relaxed space-y-2">
            <p>Mike needs to fix auth bug by Thursday</p>
            <p>Sarah will handle marketing deck for board</p>
            <p>Decision: delay mobile launch 2 weeks</p>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-indigo-500 font-semibold">
            <span>Processing</span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-600">3</div>
            <div className="text-xs text-indigo-500">Actions</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">1</div>
            <div className="text-xs text-purple-500">Decision</div>
          </div>
          <div className="bg-teal-50 rounded-xl p-4 text-center border border-teal-100">
            <div className="text-2xl font-bold text-teal-600">2</div>
            <div className="text-xs text-teal-500">Follow-ups</div>
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
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800">Fix auth bug blocking API</div>
              <div className="text-sm text-slate-500 mt-1">Mike • Due: Thursday</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "95%" }} />
                </div>
                <span className="text-xs font-medium text-green-600">95%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800">Finalize marketing deck</div>
              <div className="text-sm text-slate-500 mt-1">Sarah • Due: Friday</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: "98%" }} />
                </div>
                <span className="text-xs font-medium text-green-600">98%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800">Update Jira roadmap</div>
              <div className="text-sm text-slate-500 mt-1">Mike • No due date</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: "62%" }} />
                </div>
                <span className="text-xs font-medium text-amber-600">62%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-slate-400">Extracted in 1.2 seconds</div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Never miss a follow-up",
    subtitle: "Auto-generated email drafts ready to send",
    content: (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">M</div>
            <div>
              <div className="font-medium text-slate-800">To: Mike</div>
              <div className="text-xs text-slate-400">mike@company.com</div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-slate-600">
            <p className="font-medium mb-2">Re: Q4 Roadmap - Action Items</p>
            <p>Hi Mike,</p>
            <p className="mt-2">Following up from our sync today. You mentioned you'd fix the auth bug by Thursday. Let me know if you need any help.</p>
            <p className="mt-2">Best,<br/>Alex</p>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="btn-gradient text-white flex-1">Send via Gmail</Button>
            <Button size="sm" variant="outline" className="flex-1">Edit</Button>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100 opacity-60">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">S</div>
            <div>
              <div className="font-medium text-slate-800">To: Sarah</div>
              <div className="text-xs text-slate-400">sarah@company.com</div>
            </div>
          </div>
          <div className="text-sm text-slate-500">Draft ready...</div>
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
            <div className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">All</div>
            <div className="px-3 py-1.5 bg-gray-100 text-slate-500 rounded-full text-xs font-medium">Mine</div>
            <div className="px-3 py-1.5 bg-gray-100 text-slate-500 rounded-full text-xs font-medium">Team</div>
          </div>
          <div className="text-xs text-slate-400">12 open</div>
        </div>
        {[
          { title: "Fix auth bug", owner: "Mike", due: "Today", priority: "high" },
          { title: "Marketing deck", owner: "Sarah", due: "Tomorrow", priority: "high" },
          { title: "Update roadmap", owner: "Mike", due: "This week", priority: "medium" },
          { title: "Review contracts", owner: "You", due: "Next week", priority: "low" },
        ].map((task, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-soft border border-gray-100 flex items-center gap-3">
            <div className={cn(
              "w-4 h-4 rounded border-2 flex-shrink-0",
              task.priority === "high" ? "border-red-400" : task.priority === "medium" ? "border-amber-400" : "border-gray-300"
            )} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-800 truncate">{task.title}</div>
              <div className="text-xs text-slate-400">{task.owner}</div>
            </div>
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              task.due === "Today" ? "bg-red-50 text-red-600" : task.due === "Tomorrow" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-slate-500"
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
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Product Team</div>
          <div className="space-y-3">
            {[
              { name: "Alex Chen", role: "Admin", avatar: "A", tasks: 5 },
              { name: "Mike Torres", role: "Member", avatar: "M", tasks: 8 },
              { name: "Sarah Kim", role: "Member", avatar: "S", tasks: 3 },
            ].map((member, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {member.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{member.name}</div>
                  <div className="text-xs text-slate-400">{member.role}</div>
                </div>
                <div className="text-sm font-medium text-indigo-600">{member.tasks} tasks</div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
            <div className="text-2xl font-bold text-indigo-600">16</div>
            <div className="text-xs text-indigo-500">Open tasks</div>
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
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-lg">📝</div>
            <div className="font-medium text-slate-800">Today's Entry</div>
          </div>
          <div className="text-sm text-slate-600 leading-relaxed">
            Feeling overwhelmed with the product launch. Need to delegate more of the technical tasks to the team...
          </div>
          <div className="flex gap-2 mt-4">
            <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-medium">overwhelm</span>
            <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-medium">delegation</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <div className="text-sm font-medium opacity-90 mb-2">AI Prompt</div>
          <div className="text-lg font-semibold">What would "done" look like for the launch?</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Today", "Tomorrow", "This Week"].map((bucket, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-soft border border-gray-100">
              <div className="text-lg font-bold text-slate-700">{[3, 2, 5][i]}</div>
              <div className="text-xs text-slate-400">{bucket}</div>
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
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 font-bold text-sm">G</span>
              </div>
              <span className="font-medium text-slate-800">Gmail</span>
            </div>
            <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Connected</div>
          </div>
          <div className="text-sm text-slate-500">Drafts appear in your Gmail drafts folder. You review and send.</div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">O</span>
              </div>
              <span className="font-medium text-slate-800">Outlook</span>
            </div>
            <div className="px-2 py-1 bg-gray-100 text-slate-500 rounded-full text-xs font-medium">Connect</div>
          </div>
          <div className="text-sm text-slate-500">Link your Microsoft account to create drafts.</div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600">🔒</span>
            </div>
            <div>
              <div className="font-medium text-indigo-800">Your control, always</div>
              <div className="text-sm text-indigo-600">We never send emails on your behalf</div>
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
        <div className="bg-white rounded-2xl p-5 shadow-soft border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-lg">
              📅
            </div>
            <div>
              <div className="font-medium text-slate-800">Export to Calendar</div>
              <div className="text-xs text-slate-400">ICS format for any calendar app</div>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { title: "Fix auth bug", date: "Dec 5", time: "All day" },
              { title: "Marketing deck due", date: "Dec 6", time: "All day" },
              { title: "Board meeting prep", date: "Dec 10", time: "All day" },
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 text-center">
                  <div className="text-xs text-slate-400">{event.date.split(" ")[0]}</div>
                  <div className="text-lg font-bold text-slate-700">{event.date.split(" ")[1]}</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-700">{event.title}</div>
                  <div className="text-xs text-slate-400">{event.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button className="w-full btn-gradient text-white">
          Download .ics File
        </Button>
        <div className="text-center text-xs text-slate-400">
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
      <div className="absolute inset-0 bg-slate-900 rounded-[3rem] shadow-2xl" style={{ transform: "scale(1.04)" }} />
      <div className="relative bg-slate-900 rounded-[2.5rem] p-3">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-10" />
        <div className="bg-gray-50 rounded-[2rem] overflow-hidden">
          <div className="h-6 bg-gray-50" />
          {children}
          <div className="h-6 bg-gray-50" />
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700 rounded-full" />
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">App Store Screenshots</h1>
            <p className="text-slate-500 text-sm">Capture each screen for store submissions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="device-frame"
                checked={showDeviceFrame}
                onCheckedChange={setShowDeviceFrame}
                data-testid="toggle-device-frame"
              />
              <Label htmlFor="device-frame" className="text-sm text-slate-600 cursor-pointer">
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
                  i === currentIndex ? "bg-indigo-500 scale-125" : "bg-gray-300 hover:bg-gray-400"
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

        <div className="text-center text-sm text-slate-500 mb-4">
          Screen {currentIndex + 1} of {screens.length}
        </div>

        <DeviceFrame showFrame={showDeviceFrame}>
          <div className="bg-gray-50 px-6 py-8" style={{ minHeight: "600px" }}>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentScreen.title}</h2>
              <p className="text-sm text-slate-500">{currentScreen.subtitle}</p>
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
                  ? "bg-indigo-50 border-indigo-200"
                  : "bg-white border-gray-100 hover:border-indigo-100"
              )}
            >
              <div className="text-xs font-medium text-slate-700 truncate">{screen.title}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
