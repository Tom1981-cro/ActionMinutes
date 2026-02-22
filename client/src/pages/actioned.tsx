import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowCounterClockwise, User, Flag, CheckCircle, Trash, SortAscending, PushPin
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkeletonList } from "@/components/skeleton-loader";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailModal } from "@/components/task-detail-modal";

interface ActionedData {
  tasks: any[];
  actions: any[];
}

type ItemType = 'task' | 'action';

interface UnifiedItem {
  id: string;
  text: string;
  description?: string;
  ownerName?: string;
  priority?: string;
  completedAt?: string;
  isPinned?: boolean;
  createdAt?: string;
  _type: ItemType;
  _raw: any;
}

function ActionedCard({
  item,
  onRestore,
  onDelete,
  onClick,
}: {
  item: UnifiedItem;
  onRestore: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const completedDate = item.completedAt ? new Date(item.completedAt) : null;

  const priorityColor = item.priority === 'high' || item.priority === 'urgent' ? 'text-red-500' :
    item.priority === 'normal' || item.priority === 'medium' ? 'text-violet-500' :
    item.priority === 'low' ? 'text-emerald-500' : '';

  return (
    <Card
      className={cn(
        "hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl opacity-80",
        item.isPinned && "ring-1 ring-primary/30"
      )}
      onClick={onClick}
      data-testid={`card-actioned-${item._type}-${item.id}`}
    >
      <CardContent className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <div className="flex items-center gap-1.5">
            {item.isPinned && <PushPin className="h-3.5 w-3.5 text-primary flex-shrink-0" weight="fill" />}
            <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors flex-1 min-w-0 line-through decoration-muted-foreground/40">
            {item.text}
          </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="h-3 w-3" weight="fill" />
              Done
            </span>
          </div>
        </div>
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
          {item.priority && item.priority !== 'normal' && item.priority !== 'none' && item.priority !== 'medium' && (
            <span className={cn("flex items-center gap-1", priorityColor)}>
              <Flag className="h-3.5 w-3.5" weight="fill" />
              {item.priority}
            </span>
          )}
          {completedDate && (
            <span className="text-muted-foreground">
              Completed {format(completedDate, "d MMM yyyy")}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(); }}
            className="p-1.5 rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-colors"
            title="Restore to Inbox"
            data-testid={`action-restore-${item.id}`}
          >
            <ArrowCounterClockwise className="h-4 w-4" weight="bold" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
            data-testid={`action-delete-${item.id}`}
          >
            <Trash className="h-4 w-4" weight="bold" />
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}

const PAGE_SIZE = 10;

export default function ActionedPage() {
  const { user } = useStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'meeting' | 'reminder' } | null>(null);
  const [sortOrder, setSortOrder] = useState<"oldest" | "newest">("oldest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ActionedData>({
    queryKey: ["actioned", user.id],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/actioned");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user.id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["actioned"] });
    queryClient.invalidateQueries({ queryKey: ["actions"] });
    queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
    queryClient.invalidateQueries({ queryKey: ["deleted"] });
  };

  const restoreMutation = useMutation({
    mutationFn: async ({ type, id }: { type: ItemType; id: string }) => {
      if (type === 'action') {
        await authenticatedFetch(`/api/actions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "needs_review", completedAt: null }),
        });
      } else {
        await authenticatedFetch(`/api/deleted/${type}/${id}/restore`, { method: "POST" });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Restored to inbox" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: ItemType; id: string }) => {
      if (type === 'action') {
        await authenticatedFetch(`/api/actions/${id}`, { method: "DELETE" });
      } else {
        await authenticatedFetch(`/api/tasks/${id}/soft-delete`, { method: "POST" });
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Moved to deleted" });
    },
  });

  const allItems: UnifiedItem[] = [
    ...(data?.actions || []).map((a: any) => ({
      id: a.id,
      text: a.text,
      description: a.description || a.notes,
      ownerName: a.ownerName,
      priority: undefined,
      completedAt: a.completedAt,
      isPinned: a.isPinned ?? false,
      createdAt: a.createdAt,
      _type: 'action' as ItemType,
      _raw: a,
    })),
    ...(data?.tasks || []).map((t: any) => ({
      id: t.id,
      text: t.title || t.text,
      description: t.description,
      ownerName: t.assignee,
      priority: t.priority,
      completedAt: t.completedAt,
      isPinned: t.isPinned ?? false,
      createdAt: t.createdAt,
      _type: 'task' as ItemType,
      _raw: t,
    })),
  ].sort((a, b) => {
    const aPinned = a.isPinned ? 0 : 1;
    const bPinned = b.isPinned ? 0 : 1;
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

  const totalPages = Math.ceil(allItems.length / PAGE_SIZE);
  const paginatedItems = allItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleItemClick = (item: UnifiedItem) => {
    setSelectedItem({ id: item.id, type: 'meeting' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-emerald-500" weight="duotone" />
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Actioned</h1>
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
      <p className="text-sm text-muted-foreground">Tasks you've completed.</p>

      {isLoading ? (
        <SkeletonList count={4} type="card" />
      ) : allItems.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" weight="duotone" />
          <p className="text-muted-foreground text-sm">No completed items yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedItems.map((item) => (
            <ActionedCard
              key={`${item._type}-${item.id}`}
              item={item}
              onRestore={() => restoreMutation.mutate({ type: item._type, id: item.id })}
              onDelete={() => deleteMutation.mutate({ type: item._type, id: item.id })}
              onClick={() => handleItemClick(item)}
            />
          ))}
          {totalPages > 1 && (
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
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 rounded-lg text-xs"
                data-testid="pagination-next"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <TaskDetailModal
          itemId={selectedItem.id}
          itemType={selectedItem.type}
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
