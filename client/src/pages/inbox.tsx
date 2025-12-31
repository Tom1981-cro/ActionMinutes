import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useActionItems, useUpdateActionItem } from "@/lib/hooks";

interface ActionItemCardProps {
  item: any;
  onConfirm?: () => void;
  onDone?: () => void;
  isReview?: boolean;
}

function ActionItemCard({ item, onConfirm, onDone, isReview }: ActionItemCardProps) {
  const lowConfidence = item.confidenceOwner < 0.6 || item.confidenceDueDate < 0.6;

  return (
    <Card className="hover:shadow-md transition-shadow bg-white border-stone-200 rounded-2xl">
      <CardContent className="p-4 md:p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {lowConfidence && isReview && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 rounded-full">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Low confidence
                  </Badge>
                )}
                {item.dueDate && (
                  <Badge variant="secondary" className="text-xs rounded-full bg-stone-100 text-stone-600">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(item.dueDate), "MMM d")}
                  </Badge>
                )}
              </div>

              <p className="font-medium text-base leading-relaxed text-slate-800">{item.text}</p>

              <div className="flex items-center gap-3 text-sm text-stone-500 flex-wrap">
                {item.ownerName && (
                  <span className="flex items-center gap-1">
                    <span className="text-base">👤</span> {item.ownerName}
                    {item.confidenceOwner < 0.6 && (
                      <span className="text-xs text-amber-600">(uncertain)</span>
                    )}
                  </span>
                )}
                {item.tags && item.tags.length > 0 && (
                  <span className="flex gap-1 flex-wrap">
                    {item.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs rounded-full">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {isReview && onConfirm && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onConfirm} 
                className="rounded-full h-11 px-4 flex-1 sm:flex-none"
                data-testid={`button-confirm-${item.id}`}
              >
                Confirm
              </Button>
            )}
            {onDone && (
              <Button 
                size="sm" 
                onClick={onDone} 
                className="rounded-full bg-teal-500 hover:bg-teal-600 h-11 px-4 flex-1 sm:flex-none"
                data-testid={`button-done-${item.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Done
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InboxPage() {
  const { data: actionItems = [], isLoading } = useActionItems();
  const updateActionItem = useUpdateActionItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const needsReview = actionItems.filter((i: any) => i.status === "needs_review");
  const openItems = actionItems.filter((i: any) => i.status === "open").sort((a: any, b: any) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const markDone = (id: string) => updateActionItem.mutate({ id, updates: { status: "done" } });
  const confirmItem = (id: string) => updateActionItem.mutate({ id, updates: { status: "open", confidenceOwner: 1, confidenceDueDate: 1 } });

  return (
    <div className="space-y-6 md:space-y-8 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Inbox</h1>
        <p className="text-stone-500 text-base">Manage your open loops and commitments.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
          Needs Review 
          <Badge variant="secondary" className="rounded-full bg-stone-200 text-stone-700">{needsReview.length}</Badge>
        </h2>
        
        {needsReview.length === 0 ? (
          <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-2xl">
            <CardContent className="py-8 text-center text-stone-500 text-base">
              Nothing needs review. Nice.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {needsReview.map((item: any) => (
              <ActionItemCard 
                key={item.id} 
                item={item} 
                onConfirm={() => confirmItem(item.id)}
                onDone={() => markDone(item.id)}
                isReview
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-700">
          Open 
          <Badge variant="secondary" className="rounded-full bg-stone-200 text-stone-700">{openItems.length}</Badge>
        </h2>

        {openItems.length === 0 ? (
          <Card className="bg-stone-50/50 border-dashed border-stone-300 rounded-2xl">
             <CardContent className="py-12 text-center space-y-3">
               <div className="mx-auto h-14 w-14 bg-teal-100 rounded-full flex items-center justify-center">
                 <CheckCircle className="h-7 w-7 text-teal-600" />
               </div>
               <p className="text-stone-500 text-base px-4">No open loops. Either you're on top of it… or you haven't logged meetings.</p>
             </CardContent>
           </Card>
        ) : (
          <div className="grid gap-4">
            {openItems.map((item: any) => (
              <ActionItemCard 
                key={item.id} 
                item={item} 
                onDone={() => markDone(item.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
