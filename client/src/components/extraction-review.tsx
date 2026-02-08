import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Check, X, Pencil, Sparkle, User, Calendar, 
  WarningCircle, CheckCircle, ArrowRight, ListChecks,
  Lightbulb, Warning, Target
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "@/lib/motion-shim";
import { getAISettings } from "./ai-settings";

export interface ExtractedItem {
  id: string;
  type: "action" | "decision" | "risk";
  text: string;
  confidence: number;
  ownerName?: string;
  dueDate?: string;
  status: "pending" | "accepted" | "rejected" | "edited";
  originalText?: string;
  metadata?: Record<string, any>;
}

interface ExtractionReviewProps {
  items: ExtractedItem[];
  onItemsChange: (items: ExtractedItem[]) => void;
  onConfirm: (acceptedItems: ExtractedItem[]) => void;
  onCancel: () => void;
  rawNotes?: string;
  summary?: string;
  isLoading?: boolean;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const settings = getAISettings();
  const isLow = confidence < settings.extractionConfidenceThreshold;
  const percent = Math.round(confidence * 100);

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
      isLow 
        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    )}>
      {isLow ? (
        <WarningCircle className="h-3 w-3" weight="fill" />
      ) : (
        <CheckCircle className="h-3 w-3" weight="fill" />
      )}
      {percent}%
    </div>
  );
}

function ItemTypeIcon({ type }: { type: ExtractedItem["type"] }) {
  const icons = {
    action: ListChecks,
    decision: Lightbulb,
    risk: Warning,
  };
  const colors = {
    action: "text-primary",
    decision: "text-emerald-400",
    risk: "text-amber-400",
  };
  const Icon = icons[type];
  return <Icon className={cn("h-5 w-5", colors[type])} weight="duotone" />;
}

function ExtractedItemCard({
  item,
  onAccept,
  onReject,
  onEdit,
}: {
  item: ExtractedItem;
  onAccept: () => void;
  onReject: () => void;
  onEdit: (updates: Partial<ExtractedItem>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(item.text);
  const [editedOwner, setEditedOwner] = useState(item.ownerName || "");
  const settings = getAISettings();
  const showConfidence = settings.includeConfidenceScores;

  const handleSaveEdit = () => {
    onEdit({
      text: editedText,
      ownerName: editedOwner || undefined,
      status: "edited",
    });
    setIsEditing(false);
  };

  if (item.status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 1, height: "auto" }}
        animate={{ opacity: 0.5, height: "auto" }}
        className="relative"
      >
        <Card className="glass-panel border-red-500/20 opacity-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ItemTypeIcon type={item.type} />
              <p className="flex-1 text-muted-foreground line-through text-sm">{item.text}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={onAccept}
                className="text-muted-foreground hover:text-foreground"
              >
                Undo
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (isEditing) {
    return (
      <Card className="glass-panel border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <ItemTypeIcon type={item.type} />
            <span className="text-sm font-medium text-foreground capitalize">{item.type}</span>
          </div>
          
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="bg-muted border-border text-foreground min-h-[80px]"
            placeholder="Edit the extracted text..."
          />
          
          {item.type === "action" && (
            <div className="flex gap-3">
              <Input
                value={editedOwner}
                onChange={(e) => setEditedOwner(e.target.value)}
                className="bg-muted border-border text-foreground flex-1"
                placeholder="Assignee (optional)"
              />
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditedText(item.text);
                setEditedOwner(item.ownerName || "");
                setIsEditing(false);
              }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="bg-primary hover:bg-primary/90"
            >
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Card className={cn(
        "glass-panel transition-all",
        item.status === "accepted" && "border-emerald-500/30 bg-emerald-500/5",
        item.status === "edited" && "border-primary/30 bg-primary/5"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ItemTypeIcon type={item.type} />
            
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-foreground text-sm leading-relaxed">{item.text}</p>
              
              <div className="flex flex-wrap items-center gap-2">
                {item.ownerName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {item.ownerName}
                  </span>
                )}
                {item.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.dueDate), "MMM d")}
                  </span>
                )}
                {showConfidence && <ConfidenceBadge confidence={item.confidence} />}
                {item.status === "edited" && (
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Edited
                  </Badge>
                )}
                {item.status === "accepted" && (
                  <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-300">
                    Accepted
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Edit item"
                data-testid={`button-edit-${item.id}`}
              >
                <Pencil className="h-4 w-4" weight="duotone" />
              </Button>
              
              {item.status !== "accepted" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAccept}
                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                  aria-label="Accept item"
                  data-testid={`button-accept-${item.id}`}
                >
                  <Check className="h-4 w-4" weight="bold" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReject}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                  aria-label="Undo accept"
                  data-testid={`button-undo-${item.id}`}
                >
                  <X className="h-4 w-4" weight="bold" />
                </Button>
              )}
              
              {item.status !== "rejected" && item.status !== "accepted" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReject}
                  className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  aria-label="Reject item"
                  data-testid={`button-reject-${item.id}`}
                >
                  <X className="h-4 w-4" weight="bold" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ExtractionReviewPanel({
  items,
  onItemsChange,
  onConfirm,
  onCancel,
  rawNotes,
  summary,
  isLoading,
}: ExtractionReviewProps) {
  const updateItem = (id: string, updates: Partial<ExtractedItem>) => {
    onItemsChange(items.map((item) => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const acceptItem = (id: string) => {
    updateItem(id, { status: "accepted" });
  };

  const rejectItem = (id: string) => {
    updateItem(id, { status: "rejected" });
  };

  const acceptAll = () => {
    onItemsChange(items.map((item) => ({ ...item, status: "accepted" })));
  };

  const handleConfirm = () => {
    const acceptedItems = items.filter((item) => 
      item.status === "accepted" || item.status === "edited"
    );
    onConfirm(acceptedItems);
  };

  const actionItems = items.filter((i) => i.type === "action");
  const decisions = items.filter((i) => i.type === "decision");
  const risks = items.filter((i) => i.type === "risk");

  const acceptedCount = items.filter((i) => i.status === "accepted" || i.status === "edited").length;
  const totalCount = items.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {rawNotes && (
        <div className="lg:w-1/2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-muted-foreground/50 rounded-full" />
            <h3 className="font-medium text-foreground">Original Notes</h3>
          </div>
          <Card className="glass-panel h-[calc(100vh-300px)] overflow-hidden">
            <ScrollArea className="h-full p-4">
              <p className="text-foreground text-sm whitespace-pre-wrap leading-relaxed">
                {rawNotes}
              </p>
            </ScrollArea>
          </Card>
        </div>
      )}

      <div className={cn("space-y-4", rawNotes ? "lg:w-1/2" : "w-full")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-primary" weight="fill" />
              Extracted Items
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {acceptedCount}/{totalCount} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={acceptAll}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              data-testid="button-accept-all"
            >
              Accept All
            </Button>
          </div>
        </div>

        {summary && (
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-medium text-primary">Summary: </span>
                {summary}
              </p>
            </CardContent>
          </Card>
        )}

        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-6 pr-4">
            {actionItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Action Items ({actionItems.length})
                  </span>
                </div>
                <AnimatePresence>
                  {actionItems.map((item) => (
                    <ExtractedItemCard
                      key={item.id}
                      item={item}
                      onAccept={() => acceptItem(item.id)}
                      onReject={() => rejectItem(item.id)}
                      onEdit={(updates) => updateItem(item.id, updates)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {decisions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-foreground">
                    Decisions ({decisions.length})
                  </span>
                </div>
                <AnimatePresence>
                  {decisions.map((item) => (
                    <ExtractedItemCard
                      key={item.id}
                      item={item}
                      onAccept={() => acceptItem(item.id)}
                      onReject={() => rejectItem(item.id)}
                      onEdit={(updates) => updateItem(item.id, updates)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {risks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Warning className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-foreground">
                    Risks ({risks.length})
                  </span>
                </div>
                <AnimatePresence>
                  {risks.map((item) => (
                    <ExtractedItemCard
                      key={item.id}
                      item={item}
                      onAccept={() => acceptItem(item.id)}
                      onReject={() => rejectItem(item.id)}
                      onEdit={(updates) => updateItem(item.id, updates)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 rounded-xl"
            data-testid="button-cancel-extraction"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={acceptedCount === 0}
            className="flex-1 rounded-xl btn-gradient"
            data-testid="button-add-to-inbox"
          >
            <ArrowRight className="h-4 w-4 mr-2" weight="bold" />
            Add {acceptedCount} to Inbox
          </Button>
        </div>
      </div>
    </div>
  );
}
