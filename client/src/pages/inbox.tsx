import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, Clock, AlertTriangle, Loader2, 
  Bell, MessageCircle, Pencil, User, Calendar,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { ActionEditSheet } from "@/components/action-edit-sheet";

type FilterType = "my" | "workspace";

interface ActionCardProps {
  item: any;
  onDone: () => void;
  onRemind: () => void;
  onNudge: () => void;
  onEdit: () => void;
  onTap: () => void;
  isReview?: boolean;
}

function ActionCard({ item, onDone, onRemind, onNudge, onEdit, onTap, isReview }: ActionCardProps) {
  const lowConfidence = item.confidenceOwner < 0.6 || item.confidenceDueDate < 0.6;
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

  return (
    <Card className={`bg-white border-stone-200 rounded-2xl overflow-hidden ${isReview ? 'border-l-4 border-l-amber-400' : ''}`}>
      <CardContent className="p-0">
        <button 
          className="w-full p-4 text-left space-y-3 hover:bg-stone-50/50 transition-colors"
          onClick={onTap}
          data-testid={`card-action-${item.id}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-base leading-relaxed text-slate-800 mb-2">
                {item.text}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {item.status === 'needs_review' && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Needs Review
                  </Badge>
                )}
                {item.status === 'open' && (
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 rounded-full text-xs">
                    Open
                  </Badge>
                )}
                {item.status === 'waiting' && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-full text-xs">
                    Waiting
                  </Badge>
                )}
                {lowConfidence && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 rounded-full text-xs">
                    Low confidence
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-600">
            {item.ownerName && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-stone-400" />
                <span>{item.ownerName}</span>
              </span>
            )}
            {item.dueDate && (
              <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : ''}`}>
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(item.dueDate), "MMM d")}</span>
                {isOverdue && <span className="text-xs">(overdue)</span>}
              </span>
            )}
          </div>
        </button>

        <div className="border-t border-stone-100 bg-stone-50/50 px-2 py-2">
          <div className="flex items-center justify-between gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onDone(); }}
              className="flex-1 h-11 rounded-xl text-teal-600 hover:bg-teal-50 hover:text-teal-700 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-done-${item.id}`}
            >
              <CheckCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium">Done</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onRemind(); }}
              className="flex-1 h-11 rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-remind-${item.id}`}
            >
              <Bell className="h-5 w-5" />
              <span className="text-[10px] font-medium">Remind</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onNudge(); }}
              className="flex-1 h-11 rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 flex flex-col items-center gap-0.5 px-2"
              data-testid={`button-nudge-${item.id}`}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-[10px] font-medium">Nudge</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 h-11 rounded-xl text-stone-500 hover:bg-stone-100 hover:text-stone-700 flex flex-col items-center gap-0.5 px-2"
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
  const { data: actionItems = [], isLoading } = useActionItems();
  const updateActionItem = useUpdateActionItem();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("my");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const needsReview = actionItems.filter((i: any) => i.status === "needs_review");
  const openItems = actionItems.filter((i: any) => i.status === "open" || i.status === "waiting").sort((a: any, b: any) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const markDone = (id: string) => {
    updateActionItem.mutate({ id, updates: { status: "done" } });
    toast({ title: "Marked as done" });
  };
  
  const handleRemind = (id: string) => {
    toast({ title: "Reminder set", description: "You'll be reminded about this item." });
  };
  
  const handleNudge = (id: string) => {
    toast({ title: "Nudge sent", description: "The owner has been notified." });
  };
  
  const handleEdit = (item: any) => {
    setEditingItem(item);
    setEditSheetOpen(true);
  };

  const handleTap = (item: any) => {
    setEditingItem(item);
    setEditSheetOpen(true);
  };

  const totalItems = needsReview.length + openItems.length;

  return (
    <div className="space-y-5 pb-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Inbox</h1>
            <p className="text-stone-500 text-base mt-1">
              {totalItems === 0 ? "All clear" : `${totalItems} open ${totalItems === 1 ? 'item' : 'items'}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-stone-100 rounded-2xl">
          <Button
            variant={filter === "my" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("my")}
            className={`flex-1 h-10 rounded-xl ${filter === "my" ? 'bg-white shadow-sm text-slate-800' : 'text-stone-500'}`}
            data-testid="filter-my-items"
          >
            <User className="h-4 w-4 mr-2" />
            My Items
          </Button>
          <Button
            variant={filter === "workspace" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("workspace")}
            className={`flex-1 h-10 rounded-xl ${filter === "workspace" ? 'bg-white shadow-sm text-slate-800' : 'text-stone-500'}`}
            data-testid="filter-workspace-items"
          >
            <Filter className="h-4 w-4 mr-2" />
            Workspace
          </Button>
        </div>
      </div>

      {needsReview.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-amber-400 rounded-full" />
            <h2 className="text-base font-semibold text-slate-700">
              Needs Review
            </h2>
            <Badge className="bg-amber-100 text-amber-700 rounded-full ml-auto">
              {needsReview.length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {needsReview.map((item: any) => (
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => markDone(item.id)}
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
          <div className="h-6 w-1 bg-teal-500 rounded-full" />
          <h2 className="text-base font-semibold text-slate-700">
            Open Items
          </h2>
          <Badge variant="secondary" className="bg-stone-200 text-stone-700 rounded-full ml-auto">
            {openItems.length}
          </Badge>
        </div>

        {openItems.length === 0 && needsReview.length === 0 ? (
          <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-2xl">
             <CardContent className="py-12 text-center space-y-3">
               <div className="mx-auto h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center">
                 <CheckCircle className="h-8 w-8 text-teal-600" />
               </div>
               <div>
                 <p className="text-lg font-medium text-slate-700">Inbox zero!</p>
                 <p className="text-stone-500 text-base mt-1">No open items. You're all caught up.</p>
               </div>
             </CardContent>
           </Card>
        ) : openItems.length === 0 ? (
          <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-2xl">
            <CardContent className="py-8 text-center text-stone-500 text-base">
              No open items. Review the items above to move forward.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {openItems.map((item: any) => (
              <ActionCard 
                key={item.id} 
                item={item} 
                onDone={() => markDone(item.id)}
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
