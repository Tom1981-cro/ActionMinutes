import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ActionItem } from "@/lib/types";

export default function InboxPage() {
  const { actionItems, updateActionItem } = useStore();

  const needsReview = actionItems.filter(i => i.status === "needs_review");
  const openItems = actionItems.filter(i => i.status === "open").sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const markDone = (id: string) => updateActionItem(id, { status: "done" });
  const confirmItem = (id: string) => updateActionItem(id, { status: "open", confidenceOwner: 1, confidenceDueDate: 1 });

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">Manage your open loops and commitments.</p>
      </div>

      {/* Needs Review Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Needs Review 
          <Badge variant="secondary" className="rounded-full">{needsReview.length}</Badge>
        </h2>
        
        {needsReview.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nothing needs review. Nice.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {needsReview.map(item => (
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

      {/* Open Items Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          Open 
          <Badge variant="secondary" className="rounded-full">{openItems.length}</Badge>
        </h2>

        {openItems.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
             <CardContent className="py-12 text-center space-y-2">
               <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center">
                 <CheckCircle className="h-6 w-6 text-muted-foreground" />
               </div>
               <p className="text-muted-foreground">No open loops. Either you’re on top of it… or you haven’t logged meetings.</p>
             </CardContent>
           </Card>
        ) : (
          <div className="grid gap-3">
            {openItems.map(item => (
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

function ActionItemCard({ item, onConfirm, onDone, isReview }: { item: ActionItem, onConfirm?: () => void, onDone: () => void, isReview?: boolean }) {
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isReview ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-base">{item.text}</span>
            {item.confidenceOwner < 0.8 && isReview && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Low Confidence</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {item.ownerName && (
              <span className="flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded text-xs">
                👤 {item.ownerName}
              </span>
            )}
            {item.dueDate && (
              <span className={`flex items-center gap-1 bg-secondary/50 px-2 py-0.5 rounded text-xs ${isReview && item.confidenceDueDate < 0.8 ? 'text-amber-600' : ''}`}>
                📅 {format(new Date(item.dueDate), "MMM d")}
              </span>
            )}
            {item.tags.map(tag => (
              <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isReview && onConfirm ? (
            <Button size="sm" onClick={onConfirm} className="flex-1 sm:flex-none">
              Confirm
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onDone} className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-600 hover:border-green-200">
              <CheckCircle className="mr-2 h-4 w-4" />
              Done
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
