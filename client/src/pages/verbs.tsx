import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { 
  Phone, PencilSimple, Eye, Crosshair, Tray, CalendarBlank,
  Circle, CheckCircle, Flag
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TaskDetailModal } from "@/components/task-detail-modal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type VerbConfig = {
  title: string;
  desc: string;
  icon: PhosphorIcon;
  color: string;
  bg: string;
  border: string;
  tags: string[];
};

const verbConfigs: VerbConfig[] = [
  { title: "Call", desc: "Phone & video syncs", icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50", border: "hover:border-emerald-200", tags: ["call", "phone", "sync"] },
  { title: "Write", desc: "Drafting docs & emails", icon: PencilSimple, color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200", tags: ["write", "draft", "email", "letter"] },
  { title: "Review", desc: "Reading & approving", icon: Eye, color: "text-purple-600", bg: "bg-purple-50", border: "hover:border-purple-200", tags: ["review", "read", "approve"] },
  { title: "Plan", desc: "Strategy & scheduling", icon: Crosshair, color: "text-orange-600", bg: "bg-orange-50", border: "hover:border-orange-200", tags: ["plan", "schedule", "strategy"] },
  { title: "Process", desc: "Inbox zero & admin", icon: Tray, color: "text-rose-600", bg: "bg-rose-50", border: "hover:border-rose-200", tags: ["process", "admin", "inbox"] },
  { title: "Meet", desc: "Scheduled meetings", icon: CalendarBlank, color: "text-indigo-600", bg: "bg-indigo-50", border: "hover:border-indigo-200", tags: ["meet", "meeting", "attend"] },
];

function matchesVerb(action: any, verb: VerbConfig): boolean {
  if (action.status === 'done' || action.deletedAt) return false;
  const textLower = (action.text || "").toLowerCase();
  const actionTags = (action.tags || []).map((t: string) => t.toLowerCase().replace(/^#/, ""));
  return verb.tags.some(tag => actionTags.includes(tag) || textLower.includes(tag));
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-500",
  normal: "text-gray-400",
  low: "text-blue-400",
};

export default function ActionVerbsPage() {
  const [deepWorkMode, setDeepWorkMode] = useState(false);
  const [selectedVerb, setSelectedVerb] = useState<VerbConfig | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: actions = [] } = useQuery({
    queryKey: ['actions-for-verbs'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/actions');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const getVerbTasks = (verb: VerbConfig): any[] => {
    return actions.filter((a: any) => matchesVerb(a, verb));
  };

  const getVerbCount = (verb: VerbConfig): number => {
    return getVerbTasks(verb).length;
  };

  return (
    <div className="h-full flex flex-col p-6" data-testid="action-verbs-page">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Action Verbs</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Batch actions by mental context via tags.</p>
      </div>

      <div className="grid gap-4 mb-8 flex-1 grid-cols-2 md:grid-cols-3">
        {verbConfigs.map((verb, idx) => {
          const Icon = verb.icon;
          const count = getVerbCount(verb);
          return (
            <button
              key={idx}
              onClick={() => setSelectedVerb(verb)}
              className={`bg-white p-5 rounded-3xl flex flex-col items-start justify-between border border-gray-100 ${verb.border} transition-all text-left shadow-sm group hover:shadow-md min-h-[140px]`}
              data-testid={`card-verb-${verb.title.toLowerCase()}`}
            >
              <div className="w-full flex justify-between items-start mb-4">
                <div className={`${verb.bg} p-3.5 rounded-2xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${verb.color}`} weight="bold" />
                </div>
                <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200">
                  {count} items
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{verb.title}</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5 leading-tight">{verb.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gray-900 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl mt-auto" data-testid="deep-work-toggle">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-white opacity-80" weight="bold" />
          </div>
          <div>
            <h3 className="text-base font-bold">Deep Work Mode</h3>
            <p className="text-xs text-gray-400 mt-0.5 font-medium line-clamp-1">Silence notifications for task contexts.</p>
          </div>
        </div>
        <button
          onClick={() => setDeepWorkMode(!deepWorkMode)}
          className={`w-12 h-7 rounded-full flex items-center p-1 cursor-pointer transition-colors ${deepWorkMode ? 'bg-violet-600 justify-end' : 'bg-gray-700 justify-start hover:bg-gray-600'}`}
          data-testid="button-deep-work"
        >
          <div className="w-5 h-5 bg-white rounded-full shadow-sm"></div>
        </button>
      </div>

      <Dialog open={!!selectedVerb && !selectedTaskId} onOpenChange={(open) => { if (!open) setSelectedVerb(null); }}>
        <DialogContent className="max-w-lg p-0 rounded-2xl overflow-hidden bg-card border-border">
          {selectedVerb && (() => {
            const Icon = selectedVerb.icon;
            const tasks = getVerbTasks(selectedVerb);
            return (
              <div>
                <div className={`${selectedVerb.bg} px-5 py-4 flex items-center gap-3 border-b border-border`}>
                  <div className={`p-2.5 rounded-xl bg-white/80`}>
                    <Icon className={`w-5 h-5 ${selectedVerb.color}`} weight="bold" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-gray-900">{selectedVerb.title}</h3>
                    <p className="text-xs text-gray-500">{selectedVerb.desc}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{tasks.length} tasks</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {tasks.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No tasks match this verb. Tag tasks with #{selectedVerb.title.toLowerCase()} to see them here.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {tasks.map((task: any) => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent/50 transition-colors text-left group"
                          data-testid={`verb-task-${task.id}`}
                        >
                          {task.status === 'done' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" weight="fill" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{task.text}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.dueDate && (
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(task.dueDate), "d MMM")}
                                </span>
                              )}
                              {task.ownerName && (
                                <span className="text-[10px] text-muted-foreground">
                                  {task.ownerName}
                                </span>
                              )}
                              {(task.tags || []).map((tag: string) => (
                                <span key={tag} className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          {task.priority && task.priority !== 'normal' && (
                            <Flag className={cn("w-3.5 h-3.5 flex-shrink-0", PRIORITY_COLORS[task.priority] || "text-gray-400")} weight="fill" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {selectedTaskId && (
        <TaskDetailModal
          itemId={selectedTaskId}
          itemType="action"
          open={true}
          onClose={() => {
            setSelectedTaskId(null);
            queryClient.invalidateQueries({ queryKey: ['actions-for-verbs'] });
          }}
        />
      )}
    </div>
  );
}
