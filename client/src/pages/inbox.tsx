import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  CheckCircle, Clock, AlertTriangle, Loader2, 
  Bell, MessageCircle, Pencil, User, Calendar,
  Users, Zap
} from "lucide-react";
import { format } from "date-fns";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { ActionEditSheet } from "@/components/action-edit-sheet";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type SourceType = "all" | "meetings" | "quickadd";

interface UnifiedItem {
  id: string;
  text: string;
  dueDate: string | null;
  ownerName: string | null;
  status: string;
  source: 'meeting' | 'quickadd';
  confidenceOwner?: number;
  confidenceDueDate?: number;
  originalItem: any;
}

interface ActionCardProps {
  item: UnifiedItem;
  onDone: () => void;
  onWaiting: () => void;
  onRemind: () => void;
  onNudge: () => void;
  onEdit: () => void;
  onTap: () => void;
  isReview?: boolean;
}

function ActionCard({ item, onDone, onWaiting, onRemind, onNudge, onEdit, onTap, isReview }: ActionCardProps) {
  const lowConfidence = (item.confidenceOwner && item.confidenceOwner < 0.6) || (item.confidenceDueDate && item.confidenceDueDate < 0.6);
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

  return (
    <Card className={`overflow-hidden ${isReview ? 'border-l-4 border-l-amber-400' : ''}`}>
      <CardContent className="p-0">
        <button 
          className="w-full p-4 text-left space-y-3 tap-highlight"
          onClick={onTap}
          data-testid={`card-action-${item.id}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-base leading-relaxed text-white mb-2 light:text-gray-900">
                {item.text}
              </p>
              
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={item.status} size="sm" />
                {item.source === 'quickadd' && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-violet-500/20 text-violet-400 border-violet-500/30">
                    <Zap className="h-3 w-3" />
                    Quick Add
                  </span>
                )}
                {lowConfidence && (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <AlertTriangle className="h-3 w-3" />
                    Low confidence
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/60 light:text-gray-500">
            {item.ownerName && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-white/40 light:text-gray-400" />
                <span>{item.ownerName}</span>
              </span>
            )}
            {item.dueDate && (
              <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-400' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(item.dueDate), "MMM d")}</span>
                {isOverdue && <span className="text-xs">(overdue)</span>}
              </span>
            )}
          </div>
        </button>

        <div className="border-t border-white/10 bg-white/5 px-2 py-2">
          <div className="flex items-center justify-between gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onDone(); }}
              className="flex-1 h-11 rounded-xl text-violet-400 hover:bg-violet-500/20 hover:text-violet-300 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-done-${item.id}`}
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium">Done</span>
            </Button>
            
            {item.status !== 'waiting' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onWaiting(); }}
                className="flex-1 h-11 rounded-xl text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 flex flex-col items-center gap-0.5 px-2"
                data-testid={`button-waiting-${item.id}`}
              >
                <Clock className="h-5 w-5" />
                <span className="text-[10px] font-medium">Waiting</span>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onRemind(); }}
              className="flex-1 h-11 rounded-xl text-white/50 hover:bg-white/10 hover:text-white/80 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-remind-${item.id}`}
            >
              <Bell className="h-5 w-5" />
              <span className="text-[10px] font-medium">Remind</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onNudge(); }}
              className="flex-1 h-11 rounded-xl text-white/50 hover:bg-white/10 hover:text-white/80 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-nudge-${item.id}`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium">Nudge</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 h-11 rounded-xl text-white/50 hover:bg-white/10 hover:text-white/80 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-edit-${item.id}`}
            >
              <Pencil className="h-5 w-5" />
              <span className="text-[10px] font-medium">Edit</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InboxPage() {
  const { data: actionItems = [], isLoading: actionsLoading } = useActionItems();
  const updateActionItem = useUpdateActionItem();
  const { toast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<SourceType>("all");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const { user } = useStore();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ["reminders", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch reminders");
      return response.json();
    },
    enabled: !!user.id,
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update reminder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const isLoading = actionsLoading || remindersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const unifiedItems: UnifiedItem[] = [
    ...actionItems.map((item: any) => ({
      id: item.id,
      text: item.text,
      dueDate: item.dueDate,
      ownerName: item.ownerName,
      status: item.status,
      source: 'meeting' as const,
      confidenceOwner: item.confidenceOwner,
      confidenceDueDate: item.confidenceDueDate,
      originalItem: item,
    })),
    ...reminders
      .filter((r: any) => !r.isCompleted)
      .map((item: any) => ({
        id: `reminder-${item.id}`,
        text: item.text,
        dueDate: item.dueDate,
        ownerName: user.name,
        status: 'open',
        source: 'quickadd' as const,
        originalItem: item,
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

  const markDone = (item: UnifiedItem) => {
    if (item.source === 'meeting') {
      updateActionItem.mutate({ id: item.originalItem.id, updates: { status: "done" } });
    } else {
      updateReminder.mutate({ id: item.originalItem.id, updates: { isCompleted: true } });
    }
    toast({ title: "Marked as done" });
  };

  const markWaiting = (item: UnifiedItem) => {
    if (item.source === 'meeting') {
      updateActionItem.mutate({ id: item.originalItem.id, updates: { status: "waiting" } });
      toast({ title: "Marked as waiting", description: "Waiting for a response." });
    }
  };
  
  const handleRemind = (id: string) => {
    toast({ title: "Reminder set", description: "You'll be reminded about this item." });
  };
  
  const handleNudge = (id: string) => {
    toast({ title: "Nudge sent", description: "The owner has been notified." });
  };
  
  const handleEdit = (item: UnifiedItem) => {
    if (item.source === 'meeting') {
      setEditingItem(item.originalItem);
      setEditSheetOpen(true);
    }
  };

  const handleTap = (item: UnifiedItem) => {
    if (item.source === 'meeting') {
      setEditingItem(item.originalItem);
      setEditSheetOpen(true);
    }
  };

  const totalItems = needsReview.length + openItems.length;
  const meetingCount = unifiedItems.filter(i => i.source === 'meeting' && !['done', 'completed'].includes(i.status)).length;
  const quickAddCount = unifiedItems.filter(i => i.source === 'quickadd').length;

  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gradient-light light:text-charcoal-900">Inbox</h1>
            <p className="text-white/50 text-base mt-1 light:text-gray-500">
              {totalItems === 0 ? "All clear" : `${totalItems} open ${totalItems === 1 ? 'item' : 'items'}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 p-1 glass-panel rounded-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSourceFilter("all")}
              className={`h-8 rounded-lg text-xs transition-all duration-300 ${
                sourceFilter === "all" 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/60 hover:text-white/80'
              }`}
              data-testid="source-all"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSourceFilter("meetings")}
              className={`h-8 rounded-lg text-xs transition-all duration-300 ${
                sourceFilter === "meetings" 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/60 hover:text-white/80'
              }`}
              data-testid="source-meetings"
            >
              Meetings ({meetingCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSourceFilter("quickadd")}
              className={`h-8 rounded-lg text-xs transition-all duration-300 ${
                sourceFilter === "quickadd" 
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                  : 'text-white/60 hover:text-white/80'
              }`}
              data-testid="source-quickadd"
            >
              Quick Add ({quickAddCount})
            </Button>
          </div>
        </div>
      </div>

      {needsReview.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-amber-400 rounded-full shadow-glow-sm" />
            <h2 className="text-base font-semibold text-white light:text-gray-900">
              Needs Review
            </h2>
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full ml-auto light:bg-amber-100 light:text-amber-700 light:border-amber-200">
              {needsReview.length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {needsReview.map((item) => (
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => markDone(item)}
                onWaiting={() => markWaiting(item)}
                onRemind={() => handleRemind(item.id)}
                onNudge={() => handleNudge(item.id)}
                onEdit={() => handleEdit(item)}
                onTap={() => handleTap(item)}
                isReview
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-violet-500 rounded-full shadow-glow-sm" />
          <h2 className="text-base font-semibold text-white light:text-gray-900">
            Open Items
          </h2>
          <Badge variant="secondary" className="bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full ml-auto light:bg-violet-100 light:text-violet-700 light:border-violet-200">
            {openItems.length}
          </Badge>
        </div>

        {openItems.length === 0 && needsReview.length === 0 ? (
          <Card className="border-dashed border-white/20">
             <CardContent className="py-12 text-center space-y-3">
               <div className="mx-auto h-16 w-16 bg-violet-500/20 rounded-full flex items-center justify-center shadow-glow-sm">
                 <CheckCircle className="h-8 w-8 text-violet-400" />
               </div>
               <div>
                 <p className="text-lg font-medium text-white">Inbox zero!</p>
                 <p className="text-white/50 text-base mt-1">Press Q to quick-add a task.</p>
               </div>
             </CardContent>
           </Card>
        ) : openItems.length === 0 ? (
          <Card className="border-dashed border-white/20">
            <CardContent className="py-8 text-center text-white/50 text-base">
              No open items. Review the items above to move forward.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openItems.map((item) => (
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => markDone(item)}
                onWaiting={() => markWaiting(item)}
                onRemind={() => handleRemind(item.id)}
                onNudge={() => handleNudge(item.id)}
                onEdit={() => handleEdit(item)}
                onTap={() => handleTap(item)}
              />
            ))}
          </div>
        )}
      </section>

      <ActionEditSheet 
        item={editingItem}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />
    </div>
  );
}
