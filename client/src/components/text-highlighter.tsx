import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  HighlighterCircle, ListChecks, Lightbulb, Warning, 
  Plus, X, Check, Trash, User, ArrowRight, Sparkle
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface HighlightedItem {
  id: string;
  text: string;
  type: "action" | "decision" | "risk";
  ownerName?: string;
  startOffset: number;
  endOffset: number;
}

interface TextHighlighterProps {
  text: string;
  highlights: HighlightedItem[];
  onHighlightsChange: (highlights: HighlightedItem[]) => void;
  onConfirm?: (items: HighlightedItem[]) => void;
  className?: string;
}

type HighlightType = "action" | "decision" | "risk";

const TYPE_CONFIG: Record<HighlightType, { label: string; icon: typeof ListChecks; color: string; bgColor: string; borderColor: string }> = {
  action: {
    label: "Action Item",
    icon: ListChecks,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    borderColor: "border-violet-500/40",
  },
  decision: {
    label: "Decision",
    icon: Lightbulb,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
  },
  risk: {
    label: "Risk",
    icon: Warning,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
  },
};

function SelectionToolbar({
  position,
  onSelect,
  onClose,
}: {
  position: { top: number; left: number };
  onSelect: (type: HighlightType) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="fixed z-50"
      style={{ top: position.top, left: position.left }}
    >
      <Card className="glass-panel border-violet-500/30 shadow-xl shadow-black/30">
        <CardContent className="p-2 flex items-center gap-1">
          <span className="text-xs text-white/50 px-2">Mark as:</span>
          {(Object.keys(TYPE_CONFIG) as HighlightType[]).map((type) => {
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => onSelect(type)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs gap-1.5 hover:bg-white/10",
                  config.color
                )}
                data-testid={`button-highlight-${type}`}
              >
                <Icon className="h-3.5 w-3.5" weight="fill" />
                {config.label}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white/40 hover:text-white ml-1"
            aria-label="Close toolbar"
            data-testid="button-close-highlight-toolbar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HighlightedItemCard({
  item,
  onRemove,
  onUpdateOwner,
}: {
  item: HighlightedItem;
  onRemove: () => void;
  onUpdateOwner: (owner: string) => void;
}) {
  const config = TYPE_CONFIG[item.type];
  const Icon = config.icon;
  const [editingOwner, setEditingOwner] = useState(false);
  const [ownerInput, setOwnerInput] = useState(item.ownerName || "");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "p-3 rounded-xl border",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} weight="fill" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white leading-relaxed">{item.text}</p>
          
          {item.type === "action" && (
            <div className="mt-2">
              {editingOwner ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={ownerInput}
                    onChange={(e) => setOwnerInput(e.target.value)}
                    placeholder="Assignee name"
                    className="h-7 text-xs bg-white/5 border-white/10 text-white"
                    data-testid={`input-owner-${item.id}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onUpdateOwner(ownerInput);
                        setEditingOwner(false);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-emerald-400"
                    onClick={() => {
                      onUpdateOwner(ownerInput);
                      setEditingOwner(false);
                    }}
                    aria-label="Save assignee"
                    data-testid={`button-save-owner-${item.id}`}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingOwner(true)}
                  className="flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
                  data-testid={`button-assign-${item.id}`}
                >
                  <User className="h-3 w-3" />
                  {item.ownerName || "Add assignee"}
                </button>
              )}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-white/30 hover:text-red-400"
          aria-label="Remove highlight"
          data-testid={`button-remove-highlight-${item.id}`}
        >
          <Trash className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export function TextHighlighter({
  text,
  highlights,
  onHighlightsChange,
  onConfirm,
  className,
}: TextHighlighterProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState<HighlightType | "all">("all");

  const getTextOffset = useCallback((container: Node, targetNode: Node, targetOffset: number): number => {
    let offset = 0;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node === targetNode) {
        return offset + targetOffset;
      }
      offset += (node.textContent?.length || 0);
    }
    return offset + targetOffset;
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !textRef.current) {
      setToolbarPosition(null);
      setPendingSelection(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      setToolbarPosition(null);
      setPendingSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!textRef.current.contains(range.startContainer) || !textRef.current.contains(range.endContainer)) {
      setToolbarPosition(null);
      setPendingSelection(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const start = getTextOffset(textRef.current, range.startContainer, range.startOffset);
    const end = getTextOffset(textRef.current, range.endContainer, range.endOffset);

    if (start < 0 || end < 0 || start >= end) {
      setToolbarPosition(null);
      setPendingSelection(null);
      return;
    }

    setToolbarPosition({
      top: rect.top - 60,
      left: Math.max(10, rect.left + rect.width / 2 - 180),
    });
    setPendingSelection({ text: selectedText, start, end });
  }, [text, getTextOffset]);

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => document.removeEventListener("mouseup", handleTextSelection);
  }, [handleTextSelection]);

  const addHighlight = (type: HighlightType) => {
    if (!pendingSelection) return;

    const overlapping = highlights.some(
      (h) =>
        (pendingSelection.start >= h.startOffset && pendingSelection.start < h.endOffset) ||
        (pendingSelection.end > h.startOffset && pendingSelection.end <= h.endOffset)
    );

    if (overlapping) {
      setToolbarPosition(null);
      setPendingSelection(null);
      window.getSelection()?.removeAllRanges();
      return;
    }

    const newItem: HighlightedItem = {
      id: `highlight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: pendingSelection.text,
      type,
      startOffset: pendingSelection.start,
      endOffset: pendingSelection.end,
    };

    onHighlightsChange([...highlights, newItem]);
    setToolbarPosition(null);
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (id: string) => {
    onHighlightsChange(highlights.filter((h) => h.id !== id));
  };

  const updateOwner = (id: string, ownerName: string) => {
    onHighlightsChange(
      highlights.map((h) => (h.id === id ? { ...h, ownerName } : h))
    );
  };

  const renderHighlightedText = () => {
    if (highlights.length === 0) {
      return <span>{text}</span>;
    }

    const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    sorted.forEach((highlight) => {
      if (highlight.startOffset > lastEnd) {
        parts.push(
          <span key={`text-${lastEnd}`}>{text.slice(lastEnd, highlight.startOffset)}</span>
        );
      }

      const config = TYPE_CONFIG[highlight.type];
      parts.push(
        <mark
          key={highlight.id}
          className={cn(
            "px-0.5 rounded cursor-pointer transition-colors",
            config.bgColor,
            "hover:opacity-80"
          )}
          title={`${config.label}: ${highlight.text}`}
          data-testid={`highlight-mark-${highlight.id}`}
        >
          {text.slice(highlight.startOffset, highlight.endOffset)}
        </mark>
      );

      lastEnd = highlight.endOffset;
    });

    if (lastEnd < text.length) {
      parts.push(<span key={`text-${lastEnd}`}>{text.slice(lastEnd)}</span>);
    }

    return parts;
  };

  const filteredHighlights = activeFilter === "all"
    ? highlights
    : highlights.filter((h) => h.type === activeFilter);

  const actionCount = highlights.filter((h) => h.type === "action").length;
  const decisionCount = highlights.filter((h) => h.type === "decision").length;
  const riskCount = highlights.filter((h) => h.type === "risk").length;

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Left: Text with highlights */}
      <div className="lg:w-3/5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 bg-white/30 rounded-full" />
          <h3 className="font-medium text-white flex items-center gap-2">
            <HighlighterCircle className="h-4 w-4 text-violet-400" weight="fill" />
            Select text to highlight
          </h3>
        </div>
        
        <p className="text-xs text-white/40">
          Select any text below and choose what type of item it represents
        </p>

        <Card className="glass-panel">
          <CardContent className="p-5">
            <div
              ref={textRef}
              className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap select-text cursor-text"
              data-testid="text-highlighter-content"
            >
              {renderHighlightedText()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Highlighted items list */}
      <div className="lg:w-2/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-violet-500 rounded-full" />
            <h3 className="font-medium text-white flex items-center gap-2">
              <Sparkle className="h-4 w-4 text-violet-400" weight="fill" />
              Highlighted Items ({highlights.length})
            </h3>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {[
            { key: "all" as const, label: "All", count: highlights.length },
            { key: "action" as const, label: "Actions", count: actionCount },
            { key: "decision" as const, label: "Decisions", count: decisionCount },
            { key: "risk" as const, label: "Risks", count: riskCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeFilter === tab.key
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-white/5 text-white/50 hover:bg-white/10 border border-transparent"
              )}
              data-testid={`button-filter-${tab.key}`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          <AnimatePresence>
            {filteredHighlights.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <HighlighterCircle className="h-10 w-10 text-white/20 mx-auto mb-3" weight="duotone" />
                <p className="text-sm text-white/40">
                  {highlights.length === 0
                    ? "Select text from the notes to get started"
                    : "No items match this filter"}
                </p>
              </motion.div>
            ) : (
              filteredHighlights.map((item) => (
                <HighlightedItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeHighlight(item.id)}
                  onUpdateOwner={(owner) => updateOwner(item.id, owner)}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Confirm button */}
        {highlights.length > 0 && onConfirm && (
          <div className="pt-3 border-t border-white/10">
            <Button
              onClick={() => onConfirm(highlights)}
              className="w-full rounded-xl btn-gradient h-11"
              data-testid="button-confirm-highlights"
            >
              <ArrowRight className="h-4 w-4 mr-2" weight="bold" />
              Add {highlights.length} items to Inbox
            </Button>
          </div>
        )}
      </div>

      {/* Selection toolbar popover */}
      <AnimatePresence>
        {toolbarPosition && pendingSelection && (
          <SelectionToolbar
            position={toolbarPosition}
            onSelect={addHighlight}
            onClose={() => {
              setToolbarPosition(null);
              setPendingSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
