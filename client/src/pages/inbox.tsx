import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  CheckCircle, Clock, AlertTriangle, Loader2, 
  Bell, Pencil, User, Calendar,
  Zap
} from "lucide-react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { ActionEditSheet } from "@/components/action-edit-sheet";
import { useStore } from "@/lib/store";
import { useTheme } from "@/theme/useTheme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkeletonList } from "@/components/skeleton-loader";
import { GettingStarted } from "@/components/getting-started";

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
  waitingFor?: string | null;
  priority?: string;
  notes?: string;
  originalItem: any;
}

interface ActionCardProps {
  item: UnifiedItem;
  onDone: () => void;
  onWaiting: () => void;
  onRemind: () => void;
  onEdit: () => void;
  onTap: () => void;
  isReview?: boolean;
}

function ActionCard({ item, onDone, onWaiting, onRemind, onEdit, onTap, isReview }: ActionCardProps) {
  const lowConfidence = (item.confidenceOwner && item.confidenceOwner < 0.6) || (item.confidenceDueDate && item.confidenceDueDate < 0.6);
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/30"
      onClick={onTap}
      data-testid={`card-action-${item.id}`}
    >
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-sm leading-snug text-foreground flex-1 min-w-0">
            {item.text}
          </p>
          <StatusBadge status={item.status} size="sm" />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {item.dueDate && (
            <>
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className={isOverdue ? 'text-destructive' : ''}>{format(new Date(item.dueDate), "MMM d")}</span>
              {isOverdue && <span className="text-destructive">(overdue)</span>}
            </>
          )}
          {item.dueDate && item.ownerName && <span className="mx-1">·</span>}
          {item.ownerName && <span>{item.ownerName}</span>}
          {item.waitingFor && (
            <>
              <span className="mx-1">·</span>
              <span>Waiting: {item.waitingFor}</span>
            </>
          )}
          <span className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            {item.source === 'quickadd' && (
              <span className="pill-accent text-[11px]">
                <Zap className="h-3 w-3 inline mr-0.5" />quick
              </span>
            )}
            {lowConfidence && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                low
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onDone(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onDone(); } }}
            className="inline-flex items-center gap-1 rounded-full border font-medium text-xs px-2.5 py-0.5 transition-colors flex-shrink-0 cursor-pointer bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/25 dark:text-emerald-400"
            data-testid={`button-done-${item.id}`}
          >
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Done</span>
          </span>
          {item.status !== 'waiting' && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onWaiting(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onWaiting(); } }}
              className="inline-flex items-center gap-1 rounded-full border font-medium text-xs px-2.5 py-0.5 transition-colors flex-shrink-0 cursor-pointer bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/25 dark:text-amber-400"
              data-testid={`button-waiting-${item.id}`}
            >
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Waiting</span>
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onRemind(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onRemind(); } }}
            className="inline-flex items-center gap-1 rounded-full border font-medium text-xs px-2.5 py-0.5 transition-colors flex-shrink-0 cursor-pointer bg-rose-500/15 text-rose-600 border-rose-500/25 hover:bg-rose-500/25 dark:text-rose-400"
            data-testid={`button-remind-${item.id}`}
          >
            <Bell className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Remind</span>
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onEdit(); } }}
            className="inline-flex items-center gap-1 rounded-full border font-medium text-xs px-2.5 py-0.5 transition-colors flex-shrink-0 cursor-pointer bg-blue-500/15 text-blue-600 border-blue-500/25 hover:bg-blue-500/25 dark:text-blue-400"
            data-testid={`button-edit-${item.id}`}
          >
            <Pencil className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Edit</span>
          </span>
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
  const { mode } = useTheme();
  const queryClient = useQueryClient();

  const [doneModalOpen, setDoneModalOpen] = useState(false);
  const [waitingModalOpen, setWaitingModalOpen] = useState(false);
  const [remindModalOpen, setRemindModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [waitingNote, setWaitingNote] = useState("");
  const [remindDate, setRemindDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editForm, setEditForm] = useState<{ text: string; notes: string; priority: string }>({ text: "", notes: "", priority: "normal" });

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
    onError: () => {
      toast({ title: "Failed to update reminder", variant: "destructive" });
    },
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
      originalItem: item,
    })),
    ...reminders
      .filter((r: any) => !r.isCompleted && r.status !== 'done')
      .map((item: any) => ({
        id: `reminder-${item.id}`,
        text: item.text,
        dueDate: item.dueDate,
        ownerName: user.name,
        status: item.status || 'open',
        source: 'quickadd' as const,
        waitingFor: item.waitingFor,
        priority: item.priority,
        notes: item.notes,
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

  const openDoneModal = (item: UnifiedItem) => {
    setSelectedItem(item);
    setDoneModalOpen(true);
  };

  const confirmDone = () => {
    if (!selectedItem) return;
    if (selectedItem.source === 'meeting') {
      updateActionItem.mutate({ id: selectedItem.originalItem.id, updates: { status: "done" } });
    } else {
      updateReminder.mutate({ id: selectedItem.originalItem.id, updates: { isCompleted: true, status: 'done' } });
    }
    toast({ title: "Task completed!" });
    setDoneModalOpen(false);
    setSelectedItem(null);
  };

  const openWaitingModal = (item: UnifiedItem) => {
    setSelectedItem(item);
    setWaitingNote(item.waitingFor || "");
    setWaitingModalOpen(true);
  };

  const confirmWaiting = () => {
    if (!selectedItem) return;
    if (selectedItem.source === 'meeting') {
      updateActionItem.mutate({ id: selectedItem.originalItem.id, updates: { status: "waiting", waitingFor: waitingNote } });
    } else {
      updateReminder.mutate({ id: selectedItem.originalItem.id, updates: { status: 'waiting', waitingFor: waitingNote } });
    }
    toast({ title: "Marked as waiting", description: waitingNote ? `Waiting for: ${waitingNote}` : "Waiting for a response." });
    setWaitingModalOpen(false);
    setSelectedItem(null);
    setWaitingNote("");
  };

  const openRemindModal = (item: UnifiedItem) => {
    setSelectedItem(item);
    setRemindDate(undefined);
    setShowCalendar(false);
    setRemindModalOpen(true);
  };

  const setRemindPreset = (preset: 'tomorrow' | 'next_week' | 'next_month') => {
    const today = new Date();
    let dueDate: Date;
    let bucket: string;
    
    switch (preset) {
      case 'tomorrow':
        dueDate = addDays(today, 1);
        bucket = 'tomorrow';
        break;
      case 'next_week':
        dueDate = addWeeks(today, 1);
        bucket = 'next_week';
        break;
      case 'next_month':
        dueDate = addMonths(today, 1);
        bucket = 'next_month';
        break;
    }
    
    confirmRemind(dueDate, bucket);
  };

  const confirmRemind = (date: Date, bucket: string) => {
    if (!selectedItem) return;
    
    if (selectedItem.source === 'quickadd') {
      updateReminder.mutate({ 
        id: selectedItem.originalItem.id, 
        updates: { dueDate: date.toISOString(), bucket } 
      });
      toast({ title: "Reminder set", description: `You'll be reminded on ${format(date, "MMM d, yyyy")}` });
    } else {
      updateActionItem.mutate({ 
        id: selectedItem.originalItem.id, 
        updates: { dueDate: date.toISOString() } 
      });
      toast({ title: "Due date updated", description: `Due on ${format(date, "MMM d, yyyy")}` });
    }
    
    setRemindModalOpen(false);
    setSelectedItem(null);
    setRemindDate(undefined);
    setShowCalendar(false);
  };

  const openEditModal = (item: UnifiedItem) => {
    setSelectedItem(item);
    setEditForm({
      text: item.text || "",
      notes: item.notes || "",
      priority: item.priority || "normal",
    });
    if (item.source === 'meeting') {
      setEditingItem(item.originalItem);
      setEditSheetOpen(true);
    } else {
      setEditModalOpen(true);
    }
  };

  const confirmEdit = () => {
    if (!selectedItem) return;
    
    if (selectedItem.source === 'quickadd') {
      updateReminder.mutate({ 
        id: selectedItem.originalItem.id, 
        updates: { text: editForm.text, notes: editForm.notes, priority: editForm.priority } 
      });
      toast({ title: "Task updated" });
    }
    
    setEditModalOpen(false);
    setSelectedItem(null);
  };

  const handleTap = (item: UnifiedItem) => {
    openEditModal(item);
  };

  const totalItems = needsReview.length + openItems.length;
  const meetingCount = unifiedItems.filter(i => i.source === 'meeting' && !['done', 'completed'].includes(i.status)).length;
  const quickAddCount = unifiedItems.filter(i => i.source === 'quickadd').length;

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
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
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
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => openDoneModal(item)}
                onWaiting={() => openWaitingModal(item)}
                onRemind={() => openRemindModal(item)}
                onEdit={() => openEditModal(item)}
                onTap={() => handleTap(item)}
                isReview
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">

        {openItems.length === 0 && needsReview.length === 0 ? (
          <Card className="border-dashed border-border">
             <CardContent className="py-12 text-center space-y-3">
               <div className="mx-auto h-16 w-16 bg-accent rounded-full flex items-center justify-center shadow-token">
                 <CheckCircle className="h-8 w-8 text-primary" />
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
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => openDoneModal(item)}
                onWaiting={() => openWaitingModal(item)}
                onRemind={() => openRemindModal(item)}
                onEdit={() => openEditModal(item)}
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

      <Dialog open={doneModalOpen} onOpenChange={setDoneModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Task complete?</DialogTitle>
            <DialogDescription>
              Mark "{selectedItem?.text}" as done?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDoneModalOpen(false)}>
              No
            </Button>
            <Button onClick={confirmDone} className="bg-primary hover:bg-primary/90">
              Yes, complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waitingModalOpen} onOpenChange={setWaitingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What are you waiting for?</DialogTitle>
            <DialogDescription>
              Add a note about who or what you're waiting on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="waiting-note">Waiting for</Label>
              <Input
                id="waiting-note"
                placeholder="e.g., Response from John, Approval from manager..."
                value={waitingNote}
                onChange={(e) => setWaitingNote(e.target.value)}
                data-testid="input-waiting-note"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setWaitingModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmWaiting} className="bg-amber-600 hover:bg-amber-700">
              Mark as Waiting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={remindModalOpen} onOpenChange={setRemindModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set reminder</DialogTitle>
            <DialogDescription>
              When should we remind you about this task?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!showCalendar ? (
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start h-12"
                  onClick={() => setRemindPreset('tomorrow')}
                  data-testid="remind-tomorrow"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  Tomorrow
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-12"
                  onClick={() => setRemindPreset('next_week')}
                  data-testid="remind-next-week"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  Next week
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-12"
                  onClick={() => setRemindPreset('next_month')}
                  data-testid="remind-next-month"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  Next month
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start h-12"
                  onClick={() => setShowCalendar(true)}
                  data-testid="remind-custom"
                >
                  <Calendar className="h-4 w-4 mr-3" />
                  Choose a date...
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <CalendarComponent
                  mode="single"
                  selected={remindDate}
                  onSelect={setRemindDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowCalendar(false)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={() => remindDate && confirmRemind(remindDate, 'custom')} 
                    disabled={!remindDate}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    Set reminder
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-text">Title</Label>
              <Input
                id="edit-text"
                value={editForm.text}
                onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                data-testid="input-edit-text"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Description</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
                placeholder="Add more details..."
                data-testid="input-edit-notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <div className="flex gap-2">
                {['low', 'normal', 'high'].map((p) => (
                  <Button
                    key={p}
                    variant={editForm.priority === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditForm({ ...editForm, priority: p })}
                    className={editForm.priority === p ? 
                      (p === 'high' ? 'bg-red-600' : p === 'low' ? 'bg-secondary' : 'bg-primary') : ''
                    }
                    data-testid={`priority-${p}`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit} className="bg-primary hover:bg-primary/90">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
