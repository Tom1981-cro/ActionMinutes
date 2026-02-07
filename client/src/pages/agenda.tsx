import { useStore } from "@/lib/store";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, CalendarBlank, Warning, Sun, ArrowRight, SpinnerGap, CaretRight, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { isToday, isTomorrow, isPast, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ActionItem {
  id: string;
  description: string;
  ownerName?: string;
  dueDate?: string;
  status: string;
  meetingId?: string;
  meetingTitle?: string;
  confidence?: number;
}

function AgendaSection({ 
  title, 
  icon: Icon, 
  items, 
  accentColor,
  onMarkDone,
  onTap 
}: { 
  title: string; 
  icon: PhosphorIcon;
  items: ActionItem[];
  accentColor: string;
  onMarkDone: (id: string) => void;
  onTap: (item: ActionItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-6 w-1 ${accentColor} rounded-full`} />
        <Icon className="h-4 w-4 text-muted-foreground" weight="duotone" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <Badge variant="outline" className="bg-accent text-foreground border-border rounded-full ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Card
            key={item.id}
            className="glass-panel rounded-xl hover:bg-accent transition-all cursor-pointer"
            onClick={() => onTap(item)}
            data-testid={`agenda-item-${item.id}`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full shrink-0 mt-0.5 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone(item.id);
                }}
                data-testid={`button-done-${item.id}`}
              >
                <CheckCircle className="h-5 w-5" weight="duotone" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                  {item.ownerName && <span>{item.ownerName}</span>}
                  {item.ownerName && item.meetingTitle && <span>•</span>}
                  {item.meetingTitle && (
                    <span className="truncate">{item.meetingTitle}</span>
                  )}
                </div>
              </div>
              <CaretRight className="h-4 w-4 text-muted-foreground shrink-0" weight="bold" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function AgendaPage() {
  const { user } = useAuth();
  const { currentWorkspaceId } = useStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: actionItems = [], isLoading } = useActionItems();
  const updateActionItem = useUpdateActionItem();

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const nextWeekEnd = addDays(today, 7);

  const openItems = actionItems.filter((item: ActionItem) => {
    const isOpen = item.status !== "done";
    const isAssignedToUser = 
      (item as any).ownerId === user?.id ||
      item.ownerName?.toLowerCase() === user?.name?.toLowerCase() ||
      item.ownerName?.toLowerCase() === user?.email?.toLowerCase() ||
      (!item.ownerName && !(item as any).ownerId);
    return isOpen && isAssignedToUser;
  });

  const overdue = openItems.filter((item: ActionItem) => {
    if (!item.dueDate) return false;
    const due = new Date(item.dueDate);
    return isPast(endOfDay(due)) && !isToday(due);
  });

  const todayItems = openItems.filter((item: ActionItem) => {
    if (!item.dueDate) return false;
    return isToday(new Date(item.dueDate));
  });

  const tomorrowItems = openItems.filter((item: ActionItem) => {
    if (!item.dueDate) return false;
    return isTomorrow(new Date(item.dueDate));
  });

  const nextWeekItems = openItems.filter((item: ActionItem) => {
    if (!item.dueDate) return false;
    const due = new Date(item.dueDate);
    return isWithinInterval(due, {
      start: addDays(tomorrow, 1),
      end: nextWeekEnd
    });
  });

  const noDueDate = openItems.filter((item: ActionItem) => !item.dueDate);

  const handleMarkDone = (id: string) => {
    updateActionItem.mutate({ id, updates: { status: "done" } });
    toast({ title: "Marked as done" });
  };

  const handleTap = (item: ActionItem) => {
    if (item.meetingId) {
      setLocation(`/app/meeting/${item.meetingId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
      </div>
    );
  }

  const totalItems = overdue.length + todayItems.length + tomorrowItems.length + nextWeekItems.length + noDueDate.length;

  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Agenda</h1>
            <p className="text-muted-foreground text-base mt-1">
              {totalItems === 0 ? "All clear" : `${totalItems} upcoming ${totalItems === 1 ? 'item' : 'items'}`}
            </p>
          </div>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="glass-panel rounded-2xl border-dashed border-border py-12 text-center space-y-3">
          <div className="mx-auto h-16 w-16 bg-accent rounded-2xl flex items-center justify-center">
            <CalendarBlank className="h-8 w-8 text-primary" weight="duotone" />
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">All caught up!</p>
            <p className="text-muted-foreground text-base mt-1">No upcoming tasks on your agenda.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <AgendaSection
            title="Overdue"
            icon={Warning}
            items={overdue}
            accentColor="bg-red-500"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          <AgendaSection
            title="Today"
            icon={Sun}
            items={todayItems}
            accentColor="bg-amber-500"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          <AgendaSection
            title="Tomorrow"
            icon={ArrowRight}
            items={tomorrowItems}
            accentColor="bg-sky-500"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          <AgendaSection
            title="Next 7 Days"
            icon={CalendarBlank}
            items={nextWeekItems}
            accentColor="bg-primary"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          {noDueDate.length > 0 && (
            <AgendaSection
              title="No Due Date"
              icon={Clock}
              items={noDueDate}
              accentColor="bg-muted-foreground"
              onMarkDone={handleMarkDone}
              onTap={handleTap}
            />
          )}
        </div>
      )}
    </div>
  );
}
