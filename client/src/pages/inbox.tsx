import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { useActionItems } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { QuickAdd } from "@/components/quick-add";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, addDays, isBefore, startOfDay } from "date-fns";
import {
  CheckCircle, Clock, Trash, User, Flag, CaretDown, CaretRight,
  Sparkle, Lightning, Tray, Plus, Hourglass, Timer, WarningCircle
} from "@phosphor-icons/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { SkeletonList } from "@/components/skeleton-loader";
import { GettingStarted } from "@/components/getting-started";
import { TaskDetailModal } from "@/components/task-detail-modal";

type FilterType = "all" | "unread" | "assigned" | "snoozed";
type ViewMode = "list" | "smart";

interface UnifiedItem {
  id: string;
  realId: string;
  text: string;
  dueDate: string | null;
  ownerName: string | null;
  status: string;
  source: 'meeting' | 'quickadd';
  confidenceOwner?: number;
  confidenceDueDate?: number;
  waitingFor?: string | null;
  priority?: string;
  notes?: string;
  description?: string;
  createdAt: string | null;
  estimatedMinutes?: number;
}

type SmartGroup = {
  key: string;
  label: string;
  icon: React.ElementType;
  badgeColor: string;
};

const SMART_GROUPS: SmartGroup[] = [
  { key: "overdue", label: "OVERDUE", icon: WarningCircle, badgeColor: "bg-red-500/15 text-red-600 dark:text-red-400" },
  { key: "waiting", label: "WAITING ON OTHERS", icon: Hourglass, badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { key: "communication", label: "COMMUNICATION", icon: Tray, badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { key: "deepwork", label: "DEEP WORK", icon: Sparkle, badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { key: "quickwins", label: "QUICK WINS", icon: Lightning, badgeColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { key: "everything", label: "EVERYTHING ELSE", icon: Tray, badgeColor: "bg-muted text-muted-foreground" },
];

const COMMUNICATION_KEYWORDS = ["call", "email", "message", "note", "voice", "feedback", "meeting", "send", "reply", "contact", "discuss"];
const DEEP_WORK_KEYWORDS = ["review", "strategy", "deck", "plan", "analyze", "research", "write", "create", "design", "build", "develop", "update", "prepare"];

function isUnread(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return created > oneDayAgo;
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isBefore(new Date(dueDate), startOfDay(new Date()));
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

function classifyItem(item: UnifiedItem): string {
  if (isOverdue(item.dueDate)) return "overdue";
  if (item.status === "waiting" || item.waitingFor) return "waiting";
  const lower = item.text.toLowerCase();
  if (COMMUNICATION_KEYWORDS.some(kw => lower.includes(kw))) return "communication";
  if (DEEP_WORK_KEYWORDS.some(kw => lower.includes(kw))) return "deepwork";
  if ((item.estimatedMinutes && item.estimatedMinutes < 15) || (!item.dueDate && item.text.length < 60)) return "quickwins";
  return "everything";
}

export default function InboxPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [modalItem, setModalItem] = useState<UnifiedItem | null>(null);

  const { data: actionItems = [], isLoading: actionsLoading } = useActionItems();
  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ["reminders", user.id],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/personal/reminders?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!user.id,
  });

  const isLoading = actionsLoading || remindersLoading;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reminders", user.id] });
    queryClient.invalidateQueries({ queryKey: ["actions", user.id] });
  }, [queryClient, user.id]);

  const completeMutation = useMutation({
    mutationFn: async (item: UnifiedItem) => {
      if (item.source === "meeting") {
        await authenticatedFetch(`/api/actions/${item.realId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${item.realId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCompleted: true, userId: user.id }),
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Item completed" });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async (item: UnifiedItem) => {
      const tomorrow = addDays(new Date(), 1);
      if (item.source === "meeting") {
        await authenticatedFetch(`/api/actions/${item.realId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: tomorrow.toISOString() }),
        });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${item.realId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: tomorrow.toISOString(), userId: user.id }),
        });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Snoozed to tomorrow" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: UnifiedItem) => {
      if (item.source === "meeting") {
        await authenticatedFetch(`/api/actions/${item.realId}`, { method: "DELETE" });
      } else {
        await authenticatedFetch(`/api/personal/reminders/${item.realId}?userId=${user.id}`, { method: "DELETE" });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Item deleted" });
    },
  });

  const unifiedItems: UnifiedItem[] = useMemo(() => [
    ...actionItems.map((item: any) => ({
      id: item.id,
      realId: item.id,
      text: item.text,
      dueDate: item.dueDate,
      ownerName: item.ownerName,
      status: item.status,
      source: 'meeting' as const,
      confidenceOwner: item.confidenceOwner,
      confidenceDueDate: item.confidenceDueDate,
      waitingFor: item.waitingFor,
      priority: item.priority,
      notes: item.notes,
      description: item.notes,
      createdAt: item.createdAt || null,
      estimatedMinutes: item.estimatedMinutes,
    })),
    ...reminders
      .filter((r: any) => !r.isCompleted && r.status !== 'done')
      .map((item: any) => ({
        id: `reminder-${item.id}`,
        realId: item.id,
        text: item.text,
        dueDate: item.dueDate,
        ownerName: user.name,
        status: item.status || 'open',
        source: 'quickadd' as const,
        waitingFor: item.waitingFor,
        priority: item.priority,
        notes: item.notes,
        description: item.description,
        createdAt: item.createdAt || null,
        estimatedMinutes: item.estimatedMinutes ?? 30,
      })),
  ], [actionItems, reminders, user.name]);

  const filteredItems = useMemo(() => {
    let items = unifiedItems;
    if (filter === "unread") items = items.filter(i => isUnread(i.createdAt));
    if (filter === "assigned") items = items.filter(i => i.ownerName === user.name);
    if (filter === "snoozed") items = items.filter(i => i.status === "waiting");
    return items;
  }, [unifiedItems, filter, user.name]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aOverdue = isOverdue(a.dueDate) ? 0 : 1;
      const bOverdue = isOverdue(b.dueDate) ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [filteredItems]);

  const smartGroups = useMemo(() => {
    const assigned = new Set<string>();
    const groups: Record<string, UnifiedItem[]> = {};
    SMART_GROUPS.forEach(g => { groups[g.key] = []; });

    for (const item of filteredItems) {
      if (assigned.has(item.id)) continue;
      const group = classifyItem(item);
      groups[group].push(item);
      assigned.add(item.id);
    }
    return groups;
  }, [filteredItems]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkComplete = useCallback(async () => {
    const items = unifiedItems.filter(i => selectedIds.has(i.id));
    for (const item of items) await completeMutation.mutateAsync(item);
    setSelectedIds(new Set());
  }, [selectedIds, unifiedItems, completeMutation]);

  const handleBulkSnooze = useCallback(async () => {
    const items = unifiedItems.filter(i => selectedIds.has(i.id));
    for (const item of items) await snoozeMutation.mutateAsync(item);
    setSelectedIds(new Set());
  }, [selectedIds, unifiedItems, snoozeMutation]);

  const handleBulkDelete = useCallback(async () => {
    const items = unifiedItems.filter(i => selectedIds.has(i.id));
    for (const item of items) await deleteMutation.mutateAsync(item);
    setSelectedIds(new Set());
  }, [selectedIds, unifiedItems, deleteMutation]);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleItemClick = useCallback((item: UnifiedItem) => {
    setModalItem(item);
  }, []);

  const hasSelection = selectedIds.size > 0;
  const meetingCount = unifiedItems.filter(i => i.source === 'meeting' && !['done', 'completed'].includes(i.status)).length;
  const showGettingStarted = unifiedItems.length === 0 && meetingCount === 0;

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
          <p className="text-muted-foreground text-sm mt-1">Loading...</p>
        </div>
        <SkeletonList count={4} type="action" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {showGettingStarted && (
        <GettingStarted hasMeetings={meetingCount > 0} className="mb-2" />
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, triage, and process your incoming items.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "list" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="toggle-list"
            >
              List
            </button>
            <button
              onClick={() => setViewMode("smart")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "smart" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid="toggle-smart"
            >
              Smart Group
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => setQuickAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            data-testid="button-quick-add"
          >
            <Plus className="h-4 w-4 mr-1" weight="bold" />
            Quick Add
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(["all", "unread", "assigned", "snoozed"] as FilterType[]).map((f) => {
          const labels: Record<FilterType, string> = { all: "All", unread: "Unread", assigned: "Assigned to Me", snoozed: "Snoozed" };
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f
                  ? "bg-accent text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
              data-testid={`filter-${f}`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {viewMode === "list" ? (
        <div className="space-y-1.5">
          {sortedItems.length === 0 ? (
            <EmptyInbox />
          ) : (
            sortedItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                hasSelection={hasSelection}
                onToggleSelect={toggleSelect}
                onClick={handleItemClick}
                onComplete={i => completeMutation.mutate(i)}
                onSnooze={i => snoozeMutation.mutate(i)}
                onDelete={i => deleteMutation.mutate(i)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {SMART_GROUPS.map(group => {
            const items = smartGroups[group.key];
            if (!items || items.length === 0) return null;
            const collapsed = collapsedGroups.has(group.key);
            const Icon = group.icon;
            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-2 w-full text-left py-2 group"
                  data-testid={`group-header-${group.key}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" weight="duotone" />
                  <span className="uppercase text-[11px] font-semibold tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">({items.length})</span>
                  <div className="flex-1" />
                  {collapsed ? (
                    <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
                {!collapsed && (
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        selected={selectedIds.has(item.id)}
                        hasSelection={hasSelection}
                        onToggleSelect={toggleSelect}
                        onClick={handleItemClick}
                        onComplete={i => completeMutation.mutate(i)}
                        onSnooze={i => snoozeMutation.mutate(i)}
                        onDelete={i => deleteMutation.mutate(i)}
                        categoryBadge={group}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredItems.length === 0 && <EmptyInbox />}
        </div>
      )}

      {hasSelection && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 glass-panel rounded-2xl shadow-lg border border-border px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300"
          data-testid="bulk-bar"
        >
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="default" onClick={handleBulkComplete} data-testid="bulk-complete">
            <CheckCircle className="h-4 w-4 mr-1" weight="fill" />
            Complete All
          </Button>
          <Button size="sm" variant="outline" onClick={handleBulkSnooze} data-testid="bulk-snooze">
            <Clock className="h-4 w-4 mr-1" weight="fill" />
            Snooze All
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} data-testid="bulk-delete">
            <Trash className="h-4 w-4 mr-1" weight="fill" />
            Delete All
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} data-testid="bulk-deselect">
            Deselect
          </Button>
        </div>
      )}

      <QuickAdd isOpen={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {modalItem && (
        <TaskDetailModal
          open={!!modalItem}
          onClose={() => setModalItem(null)}
          itemId={modalItem.realId}
          itemType={modalItem.source === "meeting" ? "meeting" : "reminder"}
          onNavigatePrev={() => {
            const items = viewMode === "list" ? sortedItems : filteredItems;
            const idx = items.findIndex(i => i.id === modalItem.id);
            if (idx > 0) setModalItem(items[idx - 1]);
          }}
          onNavigateNext={() => {
            const items = viewMode === "list" ? sortedItems : filteredItems;
            const idx = items.findIndex(i => i.id === modalItem.id);
            if (idx >= 0 && idx < items.length - 1) setModalItem(items[idx + 1]);
          }}
        />
      )}
    </div>
  );
}

function EmptyInbox() {
  return (
    <div className="border border-dashed border-border rounded-xl py-12 text-center space-y-3">
      <div className="mx-auto h-16 w-16 bg-accent rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-primary" weight="duotone" />
      </div>
      <div>
        <p className="text-lg font-medium text-foreground">Inbox zero!</p>
        <p className="text-muted-foreground text-sm mt-1">Press Q to quick-add a task.</p>
      </div>
    </div>
  );
}

interface ItemCardProps {
  item: UnifiedItem;
  selected: boolean;
  hasSelection: boolean;
  onToggleSelect: (id: string) => void;
  onClick: (item: UnifiedItem) => void;
  onComplete: (item: UnifiedItem) => void;
  onSnooze: (item: UnifiedItem) => void;
  onDelete: (item: UnifiedItem) => void;
  categoryBadge?: SmartGroup;
}

function ItemCard({
  item, selected, hasSelection, onToggleSelect, onClick,
  onComplete, onSnooze, onDelete, categoryBadge
}: ItemCardProps) {
  const itemOverdue = isOverdue(item.dueDate);
  const unread = isUnread(item.createdAt);

  const borderColor = item.status === "needs_review"
    ? "border-l-orange-500"
    : itemOverdue
      ? "border-l-primary"
      : "border-l-border";

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 bg-card rounded-xl border-l-[3px] py-3 px-4 cursor-pointer transition-all group",
        "hover:shadow-sm",
        borderColor,
        selected && "ring-1 ring-primary/50 bg-accent/20"
      )}
      data-testid={`card-action-${item.id}`}
    >
      <div
        className={cn(
          "flex-shrink-0 transition-opacity",
          hasSelection ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(item.id)}
          data-testid={`checkbox-${item.id}`}
        />
      </div>

      <div
        className={cn(
          "flex-shrink-0 w-2 h-2 rounded-full",
          unread ? "bg-blue-500" : "bg-muted-foreground/30"
        )}
      />

      <div className="flex-1 min-w-0" onClick={() => onClick(item)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">{item.text}</p>

          <div className="flex items-center gap-2 flex-shrink-0 group-hover:hidden">
            {item.status === "needs_review" && <StatusBadge status="needs_review" size="sm" />}
            {item.priority === "high" && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium bg-red-500/15 text-red-600 border-red-500/25 dark:text-red-400">
                High Priority
              </span>
            )}
            {categoryBadge && (
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", categoryBadge.badgeColor)}>
                {categoryBadge.label}
              </span>
            )}
          </div>

          <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0 animate-in fade-in duration-200">
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(item); }}
              className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-muted-foreground hover:text-emerald-600 transition-colors"
              title="Complete"
              data-testid={`action-complete-${item.id}`}
            >
              <CheckCircle className="h-4 w-4" weight="fill" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSnooze(item); }}
              className="p-1.5 rounded-lg hover:bg-amber-500/15 text-muted-foreground hover:text-amber-600 transition-colors"
              title="Snooze to tomorrow"
              data-testid={`action-snooze-${item.id}`}
            >
              <Clock className="h-4 w-4" weight="fill" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item); }}
              className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted-foreground hover:text-red-600 transition-colors"
              title="Delete"
              data-testid={`action-delete-${item.id}`}
            >
              <Trash className="h-4 w-4" weight="fill" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {item.ownerName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" weight="duotone" />
              {item.ownerName}
            </span>
          )}
          {item.dueDate && (
            <span className={cn("flex items-center gap-1", itemOverdue && "text-destructive")}>
              <Clock className="h-3.5 w-3.5" weight="duotone" />
              {formatDate(item.dueDate)}
              {itemOverdue && <span className="font-medium ml-0.5">Overdue</span>}
            </span>
          )}
          {item.priority && item.priority !== "none" && item.priority !== "normal" && (
            <span className={cn(
              "flex items-center gap-1",
              item.priority === "high" ? "text-red-500" : "text-emerald-500"
            )}>
              <Flag className="h-3.5 w-3.5" weight="fill" />
              {item.priority}
            </span>
          )}
          {item.waitingFor && (
            <span className="flex items-center gap-1 text-amber-500">
              <Hourglass className="h-3.5 w-3.5" weight="duotone" />
              {item.waitingFor}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
