import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ListBullets, Trash, CheckCircle, Clock, Plus, PencilSimple, Check, X 
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { authenticatedFetch } from "@/hooks/use-auth";

type CustomList = {
  id: string;
  name: string;
  color?: string;
  position: number;
  items?: CustomListItem[];
};

type CustomListItem = {
  id: string;
  listId: string;
  reminderId?: string;
  taskId?: string;
  position: number;
  reminder?: {
    id: string;
    text: string;
    dueDate?: string;
    isCompleted: boolean;
  };
};

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

  const { data: inboxItems = [] } = useQuery({
    queryKey: ['reminders', user.id],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/personal/reminders`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id,
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
      setNewTaskText("");
      setIsAddingTask(false);
      toast({ title: "Task added" });
    },
    onError: () => {
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  const addItemToList = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await authenticatedFetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      toast({ title: "Item added to list" });
    },
    onError: () => {
      toast({ title: "Failed to add item", variant: "destructive" });
    },
  });

  const removeItemFromList = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await authenticatedFetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      toast({ title: "Item removed from list" });
    },
    onError: () => {
      toast({ title: "Failed to remove item", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 rounded-lg animate-pulse bg-muted" />
        <div className="h-40 rounded-2xl animate-pulse bg-muted" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-6 text-center py-12">
        <ListBullets className="h-12 w-12 mx-auto text-muted-foreground" weight="duotone" />
        <p className="text-lg text-muted-foreground">List not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-black h-12 bg-card"
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
            {list.items?.length || 0} items in this list
          </p>
        </div>
      </div>

      <div className="rounded-2xl backdrop-blur-xl border p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Items in this list
          </h3>
          {!isAddingTask && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAddingTask(true)}
              className="h-8 gap-1"
            >
              <Plus className="h-4 w-4" />
              Add task
            </Button>
          )}
        </div>

        {isAddingTask && (
          <div className="flex items-center gap-2 mb-4">
            <Input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Enter task..."
              className="flex-1 bg-card"
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
              className="bg-primary hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => { setIsAddingTask(false); setNewTaskText(""); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        {(!list.items || list.items.length === 0) && !isAddingTask ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-border">
            <ListBullets className="h-10 w-10 mx-auto mb-3 text-muted-foreground" weight="duotone" />
            <p className="text-sm mb-2 text-muted-foreground">
              This list is empty
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add your first task
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {list.items?.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors bg-muted hover:bg-accent"
                >
                  <CheckCircle className="h-5 w-5 text-muted-foreground" weight="duotone" />
                  <span className="flex-1 text-foreground">
                    {item.reminder?.text || `Item ${item.id.slice(0, 8)}`}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItemFromList.mutate(item.id)}
                    className="h-8 w-8 text-red-400 hover:text-red-500"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="rounded-2xl backdrop-blur-xl border p-6 bg-card border-border">
        <h3 className="text-sm font-semibold mb-4 text-foreground">
          Add from Inbox
        </h3>
        
        {inboxItems.length === 0 ? (
          <p className="text-sm text-center py-4 text-muted-foreground">
            No items in your inbox
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inboxItems.filter((item: any) => !item.isCompleted).slice(0, 10).map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors bg-muted hover:bg-accent"
                onClick={() => addItemToList.mutate(item.id)}
              >
                <Plus className="h-4 w-4 text-primary" weight="bold" />
                <span className="flex-1 text-sm text-foreground">
                  {item.text}
                </span>
                {item.dueDate && (
                  <Badge variant="secondary" className="text-xs">
                    {formatDistanceToNow(new Date(item.dueDate), { addSuffix: true })}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
