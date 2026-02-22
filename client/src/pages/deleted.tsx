import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trash, ArrowCounterClockwise, User, Flag, Warning, SortAscending, PushPin
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkeletonList } from "@/components/skeleton-loader";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface DeletedData {
  tasks: any[];
  reminders: any[];
  actions: any[];
}

function DeletedCard({ item, type, onRestore, onPermanentDelete }: { 
  item: any; 
  type: 'task' | 'reminder' | 'action';
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const title = type === 'task' ? (item.title || item.text) : item.text;
  const deletedDate = item.deletedAt ? new Date(item.deletedAt) : null;

  const priorityColor = item.priority === 'high' || item.priority === 'urgent' ? 'text-red-500' :
    item.priority === 'normal' || item.priority === 'medium' ? 'text-violet-500' :
    item.priority === 'low' ? 'text-emerald-500' : '';

  return (
    <Card
      className={cn(
        "rounded-2xl opacity-70",
        item.isPinned && "ring-1 ring-primary/30"
      )}
      data-testid={`card-deleted-${type}-${item.id}`}
    >
      <CardContent className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex items-center gap-1.5">
            {item.isPinned && <PushPin className="h-3.5 w-3.5 text-primary flex-shrink-0" weight="fill" />}
            <p className="text-sm font-medium leading-snug text-foreground flex-1 min-w-0 line-through decoration-muted-foreground/40">
              {title}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
            <Trash className="h-3 w-3" weight="fill" />
            Deleted
          </span>
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-snug">{item.description}</p>
        )}
      </CardContent>
      <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-4 text-xs text-muted-foreground flex justify-between items-center">
        <span className="flex items-center gap-3 flex-wrap">
          {(item.ownerName || (type === 'task' && item.assignee)) && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" weight="duotone" />
              {item.ownerName || item.assignee}
            </span>
          )}
          {item.priority && item.priority !== 'normal' && item.priority !== 'none' && item.priority !== 'medium' && (
            <span className={cn("flex items-center gap-1", priorityColor)}>
              <Flag className="h-3.5 w-3.5" weight="fill" />
              {item.priority}
            </span>
          )}
          {deletedDate && (
            <span className="text-muted-foreground">
              Deleted {format(deletedDate, "d MMM yyyy")}
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            className="h-8 px-3 text-xs rounded-full hover:bg-primary/10 hover:text-primary"
            data-testid={`button-restore-${type}-${item.id}`}
          >
            <ArrowCounterClockwise className="h-3.5 w-3.5 mr-1" weight="bold" />
            Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onPermanentDelete(); }}
            className="h-8 px-3 text-xs rounded-full hover:bg-destructive/10 hover:text-destructive"
            data-testid={`button-permanent-delete-${type}-${item.id}`}
          >
            <Trash className="h-3.5 w-3.5 mr-1" weight="bold" />
            Delete forever
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

const PAGE_SIZE = 10;

export default function DeletedPage() {
  const { user } = useStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const { data, isLoading } = useQuery<DeletedData>({
    queryKey: ["deleted", user.id],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/deleted");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user.id,
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const res = await authenticatedFetch(`/api/deleted/${type}/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to restore");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted"] });
      queryClient.invalidateQueries({ queryKey: ["actioned"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      toast({ title: "Item restored" });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const res = await authenticatedFetch(`/api/deleted/${type}/${id}/permanent`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deleted"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["custom-list"] });
      queryClient.invalidateQueries({ queryKey: ["custom-lists"] });
      toast({ title: "Item permanently deleted" });
    },
  });

  const allItems = [
    ...(data?.tasks || []).map(t => ({ ...t, _type: 'task' as const })),
    ...(data?.reminders || []).map(r => ({ ...r, _type: 'reminder' as const })),
    ...(data?.actions || []).map(a => ({ ...a, _type: 'action' as const })),
  ].sort((a, b) => {
    const aPinned = (a as any).isPinned ? 0 : 1;
    const bPinned = (b as any).isPinned ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;
    if (sortOrder === "oldest") {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aDate - bDate;
    }
    const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash className="h-6 w-6 text-muted-foreground" weight="duotone" />
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Deleted</h1>
          {allItems.length > 0 && (
            <span className="text-sm text-muted-foreground">({allItems.length})</span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={cn(
              "px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border",
              sortOrder !== "oldest"
                ? "bg-violet-50 text-violet-600 border-violet-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            )}
            data-testid="button-sort"
          >
            <SortAscending className="h-4 w-4" />
            Sort
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44">
                {([
                  { value: "oldest" as const, label: "Oldest first" },
                  { value: "newest" as const, label: "Newest first" },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortOrder(opt.value); setShowSortMenu(false); setCurrentPage(1); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs transition-colors",
                      sortOrder === opt.value ? "bg-violet-50 text-violet-600 font-semibold" : "text-gray-700 hover:bg-gray-50"
                    )}
                    data-testid={`sort-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Items you've deleted. Restore them or remove permanently.</p>

      {isLoading ? (
        <SkeletonList count={4} type="card" />
      ) : allItems.length === 0 ? (
        <div className="text-center py-16">
          <Trash className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" weight="duotone" />
          <p className="text-muted-foreground text-sm">No deleted items.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item) => (
            <DeletedCard 
              key={`${item._type}-${item.id}`} 
              item={item} 
              type={item._type}
              onRestore={() => restoreMutation.mutate({ type: item._type, id: item.id })}
              onPermanentDelete={() => permanentDeleteMutation.mutate({ type: item._type, id: item.id })}
            />
          ))}
          {Math.ceil(allItems.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 rounded-lg text-xs"
                data-testid="pagination-prev"
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {Math.ceil(allItems.length / PAGE_SIZE)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(allItems.length / PAGE_SIZE), p + 1))}
                disabled={currentPage === Math.ceil(allItems.length / PAGE_SIZE)}
                className="h-8 rounded-lg text-xs"
                data-testid="pagination-next"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
