import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MagnifyingGlass, Tray, ListBullets, Check, Flag } from "@phosphor-icons/react";

interface LinkParentTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTaskId: string;
  onLinked: () => void;
}

interface ActionItem {
  id: string;
  text: string;
  priority: string;
  status: string;
  parentTaskId?: string | null;
}

interface CustomList {
  id: string;
  name: string;
  icon?: string;
}

interface ListWithItems extends CustomList {
  items: { actionItemId?: string | null }[];
}

interface GroupedSection {
  name: string;
  icon: "inbox" | "list";
  tasks: ActionItem[];
}

export function LinkParentTaskModal({ open, onOpenChange, currentTaskId, onLinked }: LinkParentTaskModalProps) {
  const { user } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const { data: allActions = [] } = useQuery<ActionItem[]>({
    queryKey: ["all-actions-for-link", user.id],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/actions?userId=${user.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && !!user.id,
  });

  const { data: lists = [] } = useQuery<CustomList[]>({
    queryKey: ["custom-lists"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/lists");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: listsWithItems = [] } = useQuery<ListWithItems[]>({
    queryKey: ["lists-with-items-for-link", lists.map(l => l.id).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        lists.map(async (list) => {
          const res = await authenticatedFetch(`/api/lists/${list.id}`);
          if (!res.ok) return { ...list, items: [] };
          return res.json();
        })
      );
      return results;
    },
    enabled: open && lists.length > 0,
  });

  const sections = useMemo<GroupedSection[]>(() => {
    const eligible = allActions.filter(
      (a) => a.id !== currentTaskId && !a.parentTaskId
    );

    const taskListMap = new Map<string, string>();
    for (const list of listsWithItems) {
      for (const item of list.items || []) {
        if (item.actionItemId) {
          taskListMap.set(item.actionItemId, list.id);
        }
      }
    }

    const inboxTasks: ActionItem[] = [];
    const listTasksMap = new Map<string, ActionItem[]>();

    for (const task of eligible) {
      const listId = taskListMap.get(task.id);
      if (listId) {
        if (!listTasksMap.has(listId)) listTasksMap.set(listId, []);
        listTasksMap.get(listId)!.push(task);
      } else {
        inboxTasks.push(task);
      }
    }

    const result: GroupedSection[] = [];

    if (inboxTasks.length > 0) {
      result.push({ name: "Inbox", icon: "inbox", tasks: inboxTasks });
    }

    for (const list of listsWithItems) {
      const tasks = listTasksMap.get(list.id);
      if (tasks && tasks.length > 0) {
        result.push({ name: list.name, icon: "list", tasks });
      }
    }

    return result;
  }, [allActions, listsWithItems, currentTaskId]);

  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        tasks: section.tasks.filter((t) => t.text.toLowerCase().includes(q)),
      }))
      .filter((section) => section.tasks.length > 0);
  }, [sections, search]);

  const handleSelect = async (parentTask: ActionItem) => {
    setIsLinking(true);
    try {
      const res = await authenticatedFetch(`/api/actions/${currentTaskId}/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentTaskId: parentTask.id }),
      });
      if (!res.ok) throw new Error("Failed to link");
      toast({ title: "Linked as subtask", description: `Now a subtask of "${parentTask.text}"` });
      onLinked();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to link parent task", variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden" data-testid="link-parent-task-modal">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">Link Parent Task</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 h-9 rounded-lg text-sm"
              data-testid="input-search-parent-task"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[360px] overflow-y-auto px-2 pb-4">
          {filteredSections.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No tasks found
            </div>
          )}

          {filteredSections.map((section) => (
            <div key={section.name} className="mb-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5">
                {section.icon === "inbox" ? (
                  <Tray className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ListBullets className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.name}
                </span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto">
                  {section.tasks.length}
                </span>
              </div>

              <div className="space-y-0.5">
                {section.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => !isLinking && handleSelect(task)}
                    disabled={isLinking}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors",
                      "hover:bg-accent/60 text-foreground",
                      isLinking && "opacity-50 cursor-not-allowed"
                    )}
                    data-testid={`link-parent-option-${task.id}`}
                  >
                    <Check className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
                    <span className="flex-1 text-sm truncate">{task.text}</span>
                    {task.priority === "high" && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-500/15 text-red-500 border border-red-500/25">
                        <Flag className="h-3 w-3" weight="fill" />
                        High
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
