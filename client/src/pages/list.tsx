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
  const { user, theme } = useStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const { data: list, isLoading } = useQuery<CustomList>({
    queryKey: ['custom-list', listId],
    queryFn: async () => {
      const res = await fetch(`/api/lists/${listId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load list');
      return res.json();
    },
    enabled: !!listId,
  });

  const { data: inboxItems = [] } = useQuery({
    queryKey: ['reminders', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id,
  });

  const updateListName = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
  });

  const addItemToList = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await fetch(`/api/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reminderId }),
      });
      if (!res.ok) throw new Error('Failed to add item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      toast({ title: "Item added to list" });
    },
  });

  const removeItemFromList = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/lists/${listId}/items/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to remove item');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-list', listId] });
      toast({ title: "Item removed from list" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className={cn("h-10 rounded-lg animate-pulse", theme === "light" ? "bg-gray-100" : "bg-white/5")} />
        <div className={cn("h-40 rounded-2xl animate-pulse", theme === "light" ? "bg-gray-100" : "bg-white/5")} />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-6 text-center py-12">
        <ListBullets className={cn("h-12 w-12 mx-auto", theme === "light" ? "text-gray-400" : "text-white/30")} weight="duotone" />
        <p className={cn("text-lg", theme === "light" ? "text-gray-600" : "text-white/60")}>List not found</p>
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
                className={cn("text-2xl font-black h-12", theme === "light" ? "bg-white" : "bg-white/10")}
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
              <h1 className="text-2xl md:text-3xl font-black text-gradient-light">{list.name}</h1>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => { setEditName(list.name); setIsEditingName(true); }}
                className={cn("h-8 w-8", theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10")}
              >
                <PencilSimple className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className={cn("text-sm mt-1", theme === "light" ? "text-gray-600" : "text-white/60")}>
            {list.items?.length || 0} items in this list
          </p>
        </div>
      </div>

      <div className={cn(
        "rounded-2xl backdrop-blur-xl border p-6",
        theme === "light" ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/10"
      )}>
        <h3 className={cn("text-sm font-semibold mb-4", theme === "light" ? "text-gray-900" : "text-white")}>
          Items in this list
        </h3>
        
        {(!list.items || list.items.length === 0) ? (
          <div className={cn(
            "text-center py-8 rounded-xl border border-dashed",
            theme === "light" ? "border-gray-200" : "border-white/20"
          )}>
            <ListBullets className={cn("h-10 w-10 mx-auto mb-3", theme === "light" ? "text-gray-400" : "text-white/30")} weight="duotone" />
            <p className={cn("text-sm mb-2", theme === "light" ? "text-gray-600" : "text-white/60")}>
              This list is empty
            </p>
            <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/40")}>
              Add tasks from your inbox to this list
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {list.items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors",
                    theme === "light" ? "bg-gray-50 hover:bg-gray-100" : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <CheckCircle className={cn("h-5 w-5", theme === "light" ? "text-gray-400" : "text-white/40")} weight="duotone" />
                  <span className={cn("flex-1", theme === "light" ? "text-gray-900" : "text-white")}>
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

      <div className={cn(
        "rounded-2xl backdrop-blur-xl border p-6",
        theme === "light" ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/10"
      )}>
        <h3 className={cn("text-sm font-semibold mb-4", theme === "light" ? "text-gray-900" : "text-white")}>
          Add from Inbox
        </h3>
        
        {inboxItems.length === 0 ? (
          <p className={cn("text-sm text-center py-4", theme === "light" ? "text-gray-500" : "text-white/40")}>
            No items in your inbox
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {inboxItems.filter((item: any) => !item.isCompleted).slice(0, 10).map((item: any) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                  theme === "light" ? "bg-gray-50 hover:bg-violet-50" : "bg-white/5 hover:bg-violet-500/10"
                )}
                onClick={() => addItemToList.mutate(item.id)}
              >
                <Plus className={cn("h-4 w-4", theme === "light" ? "text-violet-600" : "text-violet-400")} weight="bold" />
                <span className={cn("flex-1 text-sm", theme === "light" ? "text-gray-900" : "text-white")}>
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
