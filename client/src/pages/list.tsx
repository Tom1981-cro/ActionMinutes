import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ListBullets, Plus, PencilSimple, Check, X,
  ArrowRight, Flag, User, Hourglass,
  House, Briefcase, UsersThree, Heart, GraduationCap, PaintBrush, Flower, Barbell, ChatCircle, UserCircle
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "@/hooks/use-auth";

const LIST_ICON_MAP: Record<string, PhosphorIcon> = {
  home: House, work: Briefcase, family: UsersThree, health: Heart,
  education: GraduationCap, hobby: PaintBrush, wellness: Flower,
  workout: Barbell, social: ChatCircle, personal: UserCircle,
};

type CustomList = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  position: number;
  items?: CustomListItem[];
};

type CustomListItem = {
  id: string;
  listId: string;
  reminderId?: string;
  taskId?: string;
  actionItemId?: string;
  position: number;
  reminder?: {
    id: string;
    text: string;
    dueDate?: string;
    isCompleted: boolean;
    status?: string;
    priority?: string;
    notes?: string;
    description?: string;
    ownerName?: string;
    waitingFor?: string;
  };
  actionItem?: {
    id: string;
    text: string;
    dueDate?: string;
    status?: string;
    ownerName?: string;
    tags?: string[];
  };
};

function TaskCard({ item, listId, listName }: { item: CustomListItem; listId: string; listName: string }) {
  const [, navigate] = useLocation();
  const r = item.reminder;
  const a = item.actionItem;
  if (!r && !a) return null;

  const text = r?.text || a?.text || "";
  const dueDate = r?.dueDate || a?.dueDate;
  const status = r?.status || (r?.isCompleted ? 'done' : undefined) || a?.status || 'open';
  const ownerName = r?.ownerName || a?.ownerName;
  const priority = r?.priority;

  const isOverdue = dueDate && new Date(dueDate) < new Date();
  const priorityColor = priority === 'high' || priority === 'urgent' ? 'text-red-500' :
    priority === 'normal' || priority === 'medium' ? 'text-amber-500' :
    priority === 'low' ? 'text-emerald-500' : '';

  const handleClick = () => {
    if (r) {
      navigate(`/app/action/reminder/${r.id}?from=list&listId=${listId}&listName=${encodeURIComponent(listName)}`);
    } else if (a) {
      navigate(`/app/action/meeting/${a.id}?from=list&listId=${listId}&listName=${encodeURIComponent(listName)}`);
    }
  };

  return (
    <Card
      className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl"
      onClick={handleClick}
      data-testid={`card-list-item-${item.id}`}
    >
      <CardContent className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors flex-1 min-w-0">
            {text}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <StatusBadge status={status} size="sm" />
            {dueDate && (
              <span className={cn("text-xs sm:hidden", isOverdue ? "text-destructive" : "text-muted-foreground")}>
                {format(new Date(dueDate), "d MMM")}
              </span>
            )}
          </div>
        </div>
        {dueDate && (
          <span className={cn("text-xs hidden sm:block mt-1", isOverdue ? "text-destructive" : "text-muted-foreground")}>
            {format(new Date(dueDate), "d MMM yyyy")}
            {isOverdue && " (overdue)"}
          </span>
        )}
        {r?.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-snug">{r.description}</p>
        )}
      </CardContent>
      <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-4 text-xs text-muted-foreground flex justify-between items-center">
        <span className="flex items-center gap-3 flex-wrap">
          {ownerName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" weight="duotone" />
              {ownerName}
            </span>
          )}
          {r?.waitingFor && (
            <span className="flex items-center gap-1 text-amber-500">
              <Hourglass className="h-3.5 w-3.5" weight="duotone" />
              {r.waitingFor}
            </span>
          )}
          {priority && priority !== 'normal' && priority !== 'none' && (
            <span className={cn("flex items-center gap-1", priorityColor)}>
              <Flag className="h-3.5 w-3.5" weight="fill" />
              {priority}
            </span>
          )}
        </span>
        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" weight="bold" />
      </CardFooter>
    </Card>
  );
}

export default function ListPage() {
  const [, params] = useRoute("/app/lists/:id");
  const listId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  const { data: list, isLoading } = useQuery<CustomList>({
    queryKey: ['custom-list', listId],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/lists/${listId}`);
      if (!res.ok) throw new Error('Failed to load list');
      return res.json();
    },
    enabled: !!listId,
  });

  const updateListName = useMutation({
    mutationFn: async (name: string) => {
      const res = await authenticatedFetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update list');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setIsEditingName(false);
      toast({ title: "List renamed" });
    },
    onError: () => {
      toast({ title: "Failed to rename list", variant: "destructive" });
    },
  });

  const addNewTask = useMutation({
    mutationFn: async (text: string) => {
      const res = await authenticatedFetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('Failed to add task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setNewTaskText("");
      setIsAddingTask(false);
      toast({ title: "Task added" });
    },
    onError: () => {
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="h-10 rounded-lg animate-pulse bg-muted" />
        <div className="h-40 rounded-2xl animate-pulse bg-muted" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-5 pb-6 text-center py-12">
        <ListBullets className="h-12 w-12 mx-auto text-muted-foreground" weight="duotone" />
        <p className="text-lg text-muted-foreground">List not found</p>
      </div>
    );
  }

  const IconComp = list.icon ? (LIST_ICON_MAP[list.icon] || ListBullets) : ListBullets;
  const activeItems = list.items?.filter(i => {
    if (i.reminder) return !i.reminder.isCompleted;
    if (i.actionItem) return i.actionItem.status !== 'done' && i.actionItem.status !== 'completed';
    return false;
  }) || [];
  const completedItems = list.items?.filter(i => {
    if (i.reminder) return i.reminder.isCompleted;
    if (i.actionItem) return i.actionItem.status === 'done' || i.actionItem.status === 'completed';
    return false;
  }) || [];

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-black h-10 bg-card"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') updateListName.mutate(editName);
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" onClick={() => updateListName.mutate(editName)} className="text-green-500">
                <Check className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)} className="text-red-400">
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <IconComp className="h-7 w-7 text-primary" weight="duotone" />
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{list.name}</h1>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => { setEditName(list.name); setIsEditingName(true); }}
                className="h-8 w-8 hover:bg-accent"
              >
                <PencilSimple className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-sm mt-1 text-muted-foreground">
            {activeItems.length} open {activeItems.length === 1 ? 'item' : 'items'}
            {completedItems.length > 0 && ` · ${completedItems.length} completed`}
          </p>
        </div>
        {!isAddingTask && (
          <Button
            size="sm"
            onClick={() => setIsAddingTask(true)}
            className="bg-primary hover:bg-primary/90 rounded-xl gap-1"
            data-testid="button-add-list-task"
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>

      {isAddingTask && (
        <div className="flex items-center gap-2">
          <Input
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Enter task..."
            className="flex-1 bg-card rounded-xl"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTaskText.trim()) {
                addNewTask.mutate(newTaskText.trim());
              }
              if (e.key === 'Escape') {
                setIsAddingTask(false);
                setNewTaskText("");
              }
            }}
            data-testid="input-new-list-task"
          />
          <Button 
            size="icon" 
            onClick={() => newTaskText.trim() && addNewTask.mutate(newTaskText.trim())}
            disabled={!newTaskText.trim()}
            className="bg-primary hover:bg-primary/90 rounded-xl"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => { setIsAddingTask(false); setNewTaskText(""); }}
            className="rounded-xl"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {activeItems.length === 0 && !isAddingTask ? (
        <Card className="border-dashed border-border">
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto h-16 w-16 bg-accent rounded-full flex items-center justify-center shadow-token">
              <IconComp className="h-8 w-8 text-primary" weight="duotone" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">This list is empty</p>
              <p className="text-muted-foreground text-base mt-1">Add your first task to get started.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="mt-2 rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-2">
          <AnimatePresence>
            {activeItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <TaskCard item={item} listId={list.id} listName={list.name} />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {completedItems.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            Completed ({completedItems.length})
          </h3>
          {completedItems.map((item) => (
            <div key={item.id}>
              <TaskCard item={item} listId={list.id} listName={list.name} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
