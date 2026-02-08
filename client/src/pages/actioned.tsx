import { useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  ArrowRight, User, Flag, CheckCircle
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { SkeletonList } from "@/components/skeleton-loader";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/hooks/use-auth";

interface ActionedData {
  tasks: any[];
  reminders: any[];
}

function ActionedCard({ item, type }: { item: any; type: 'task' | 'reminder' }) {
  const [, navigate] = useLocation();
  const title = item.title || item.text;
  const completedDate = item.completedAt ? new Date(item.completedAt) : null;

  const priorityColor = item.priority === 'high' || item.priority === 'urgent' ? 'text-red-500' :
    item.priority === 'normal' || item.priority === 'medium' ? 'text-amber-500' :
    item.priority === 'low' ? 'text-emerald-500' : '';

  const handleClick = () => {
    navigate(`/app/action/reminder/${item.id}`);
  };

  return (
    <Card
      className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl opacity-80"
      onClick={handleClick}
      data-testid={`card-actioned-${type}-${item.id}`}
    >
      <CardContent className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors flex-1 min-w-0 line-through decoration-muted-foreground/40">
            {title}
          </p>
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
          {completedDate && (
            <span className="text-muted-foreground">
              Completed {format(completedDate, "d MMM yyyy")}
            </span>
          )}
        </span>
        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" weight="bold" />
      </CardFooter>
    </Card>
  );
}

export default function ActionedPage() {
  const { user } = useStore();

  const { data, isLoading } = useQuery<ActionedData>({
    queryKey: ["actioned", user.id],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/actioned");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!user.id,
  });

  const allItems = [
    ...(data?.tasks || []).map(t => ({ ...t, _type: 'task' as const })),
    ...(data?.reminders || []).map(r => ({ ...r, _type: 'reminder' as const })),
  ].sort((a, b) => {
    const aDate = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bDate = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-6 w-6 text-emerald-500" weight="duotone" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Actioned</h1>
        {allItems.length > 0 && (
          <span className="text-sm text-muted-foreground">({allItems.length})</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">Tasks and reminders you've completed.</p>

      {isLoading ? (
        <SkeletonList count={4} type="card" />
      ) : allItems.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" weight="duotone" />
          <p className="text-muted-foreground text-sm">No completed items yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.map((item) => (
            <ActionedCard key={`${item._type}-${item.id}`} item={item} type={item._type} />
          ))}
        </div>
      )}
    </div>
  );
}
