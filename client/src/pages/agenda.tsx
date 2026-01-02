import { useState } from "react";
import { useStore } from "@/lib/store";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, CalendarClock, AlertCircle, Calendar, ChevronRight, Clock, Sun, ArrowRight } from "lucide-react";
import { format, isToday, isTomorrow, isPast, addDays, isWithinInterval, startOfDay, endOfDay } from "date-fns";
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
  icon: React.ComponentType<{ className?: string }>;
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
        <Icon className="h-4 w-4 text-slate-600" />
        <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        <Badge variant="secondary" className="bg-gray-200 text-gray-700 rounded-full ml-auto">
          {items.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Card
            key={item.id}
            className="bg-white border-gray-200 rounded-xl hover:shadow-md transition-all cursor-pointer"
            onClick={() => onTap(item)}
            data-testid={`agenda-item-${item.id}`}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full shrink-0 mt-0.5 text-gray-400 hover:text-green-600 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone(item.id);
                }}
                data-testid={`button-done-${item.id}`}
              >
                <CheckCircle className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 font-medium line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                  {item.ownerName && <span>{item.ownerName}</span>}
                  {item.ownerName && item.meetingTitle && <span>•</span>}
                  {item.meetingTitle && (
                    <span className="truncate">{item.meetingTitle}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
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
      setLocation(`/meeting/${item.meetingId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const totalItems = overdue.length + todayItems.length + tomorrowItems.length + nextWeekItems.length + noDueDate.length;

  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Agenda</h1>
            <p className="text-gray-500 text-base mt-1">
              {totalItems === 0 ? "All clear" : `${totalItems} upcoming ${totalItems === 1 ? 'item' : 'items'}`}
            </p>
          </div>
        </div>
      </div>

      {totalItems === 0 ? (
        <Card className="bg-gray-50/50 border-dashed border-gray-300 rounded-xl">
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <CalendarClock className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">All caught up!</p>
              <p className="text-gray-500 text-base mt-1">No upcoming tasks on your agenda.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <AgendaSection
            title="Overdue"
            icon={AlertCircle}
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
            accentColor="bg-blue-500"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          <AgendaSection
            title="Next 7 Days"
            icon={Calendar}
            items={nextWeekItems}
            accentColor="bg-indigo-500"
            onMarkDone={handleMarkDone}
            onTap={handleTap}
          />
          {noDueDate.length > 0 && (
            <AgendaSection
              title="No Due Date"
              icon={Clock}
              items={noDueDate}
              accentColor="bg-gray-400"
              onMarkDone={handleMarkDone}
              onTap={handleTap}
            />
          )}
        </div>
      )}
    </div>
  );
}
