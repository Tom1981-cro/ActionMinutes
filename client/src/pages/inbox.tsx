import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ArrowRight, Lightning,
  User, Hourglass, Flag
} from "@phosphor-icons/react";
import { CheckCircle as LucideCheck } from "lucide-react";
import { format } from "date-fns";
import { useActionItems } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useTheme } from "@/theme/useTheme";
import { useQuery } from "@tanstack/react-query";
import { SkeletonList } from "@/components/skeleton-loader";
import { GettingStarted } from "@/components/getting-started";
import { cn } from "@/lib/utils";

type SourceType = "all" | "meetings" | "quickadd";

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
}

function ActionCard({ item }: { item: UnifiedItem }) {
  const [, navigate] = useLocation();
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
  const lowConfidence = (item.confidenceOwner && item.confidenceOwner < 0.6) || (item.confidenceDueDate && item.confidenceDueDate < 0.6);

  const priorityColor = item.priority === 'high' ? 'text-red-500' :
    item.priority === 'normal' ? 'text-amber-500' :
    item.priority === 'low' ? 'text-emerald-500' : '';

  const handleClick = () => {
    const type = item.source === 'meeting' ? 'meeting' : 'reminder';
    navigate(`/app/action/${type}/${item.realId}`);
  };

  return (
    <Card
      className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl"
      onClick={handleClick}
      data-testid={`card-action-${item.id}`}
    >
      <CardContent className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors flex-1 min-w-0">
            {item.text}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <StatusBadge status={item.status} size="sm" />
            {item.dueDate && (
              <span className={cn("text-xs sm:hidden", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                {format(new Date(item.dueDate), "d MMM")}
              </span>
            )}
          </div>
        </div>
        {item.dueDate && (
          <span className={cn("text-xs hidden sm:block mt-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
            {format(new Date(item.dueDate), "d MMM yyyy")}
            {isOverdue && " (overdue)"}
          </span>
        )}
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-snug">{item.description}</p>
        )}
      </CardContent>
      <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-4 text-xs text-muted-foreground flex justify-between items-center">
        <span className="flex items-center gap-3 flex-wrap">
          {item.ownerName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" weight="duotone" />
              {item.ownerName}
            </span>
          )}
          {item.waitingFor && (
            <span className="flex items-center gap-1 text-amber-500">
              <Hourglass className="h-3.5 w-3.5" weight="duotone" />
              {item.waitingFor}
            </span>
          )}
          {item.priority && item.priority !== 'normal' && item.priority !== 'none' && (
            <span className={cn("flex items-center gap-1", priorityColor)}>
              <Flag className="h-3.5 w-3.5" weight="fill" />
              {item.priority}
            </span>
          )}
          {item.source === 'quickadd' && (
            <span className="flex items-center gap-1">
              <Lightning className="h-3.5 w-3.5" weight="fill" />
              quick
            </span>
          )}
          {lowConfidence && (
            <span className="text-amber-500 text-[11px]">low confidence</span>
          )}
        </span>
        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" weight="bold" />
      </CardFooter>
    </Card>
  );
}

export default function InboxPage() {
  const { data: actionItems = [], isLoading: actionsLoading } = useActionItems();
  const [sourceFilter, setSourceFilter] = useState<SourceType>("all");
  const { user } = useStore();
  const { mode } = useTheme();

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ["reminders", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!user.id,
  });

  const isLoading = actionsLoading || remindersLoading;

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
              <p className="text-muted-foreground text-base mt-1">Loading...</p>
            </div>
          </div>
        </div>
        <SkeletonList count={4} type="action" />
      </div>
    );
  }

  const unifiedItems: UnifiedItem[] = [
    ...actionItems.map((item: any) => ({
      id: item.id,
      realId: item.id,
      text: item.title || item.text,
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
    })),
    ...reminders
      .filter((r: any) => !r.isCompleted && r.status !== 'done')
      .map((item: any) => ({
        id: `reminder-${item.id}`,
        realId: item.id,
        text: item.title || item.text,
        dueDate: item.dueDate,
        ownerName: user.name,
        status: item.status || 'open',
        source: 'quickadd' as const,
        waitingFor: item.waitingFor,
        priority: item.priority,
        notes: item.notes,
        description: item.description,
      })),
  ];

  const filteredItems = unifiedItems.filter((item) => {
    if (sourceFilter === 'meetings' && item.source !== 'meeting') return false;
    if (sourceFilter === 'quickadd' && item.source !== 'quickadd') return false;
    return true;
  });

  const needsReview = filteredItems.filter((i) => i.status === "needs_review");
  const openItems = filteredItems.filter((i) => i.status === "open" || i.status === "pending" || i.status === "waiting").sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const totalItems = needsReview.length + openItems.length;
  const meetingCount = unifiedItems.filter(i => i.source === 'meeting' && !['done', 'completed'].includes(i.status)).length;

  const showGettingStarted = totalItems === 0 && meetingCount === 0;

  return (
    <div className="space-y-5 pb-6">
      {showGettingStarted && (
        <GettingStarted 
          hasMeetings={meetingCount > 0}
          className="mb-2"
        />
      )}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalItems === 0 ? "All clear" : `${totalItems} open ${totalItems === 1 ? 'item' : 'items'}`} · {mode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sourceFilter === "all" 
                ? 'bg-accent text-foreground border border-border' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
            data-testid="source-all"
          >
            All
          </button>
          <button
            onClick={() => setSourceFilter("meetings")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors pt-[0px] pb-[0px] ${
              sourceFilter === "meetings" 
                ? 'bg-accent text-foreground border border-border' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
            data-testid="source-meetings"
          >
            Meetings
          </button>
          <button
            onClick={() => setSourceFilter("quickadd")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              sourceFilter === "quickadd" 
                ? 'bg-accent text-foreground border border-border' 
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
            data-testid="source-quickadd"
          >
            Quick Add
          </button>
        </div>
      </div>
      {needsReview.length > 0 && (
        <section className="space-y-2">
          <div className="space-y-2">
            {needsReview.map((item) => (
              <ActionCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
      <section className="space-y-2">
        {openItems.length === 0 && needsReview.length === 0 ? (
          <Card className="border-dashed border-border">
             <CardContent className="py-12 text-center space-y-3">
               <div className="mx-auto h-16 w-16 bg-accent rounded-full flex items-center justify-center shadow-token">
                 <LucideCheck className="h-8 w-8 text-primary" />
               </div>
               <div>
                 <p className="text-lg font-medium text-foreground">Inbox zero!</p>
                 <p className="text-muted-foreground text-base mt-1">Press Q to quick-add a task.</p>
               </div>
             </CardContent>
           </Card>
        ) : openItems.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="py-8 text-center text-muted-foreground text-base">
              No open items. Review the items above to move forward.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {openItems.map((item) => (
              <ActionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
