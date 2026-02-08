import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  MagnifyingGlass, X, Tray, NotePencil, Waveform, CalendarBlank,
  House, Bell, BookOpenText, GearSix, Circle, CheckCircle
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { authenticatedFetch } from "@/hooks/use-auth";

interface SearchResult {
  meetings: { id: string; title: string; date: string; summary: string | null }[];
  tasks: { id: string; text: string; bucket: string; dueDate: string | null; priority: string; isCompleted: boolean }[];
  notes: { id: string; title: string; isJournal: boolean; createdAt: string }[];
  transcripts: { id: string; title: string | null; meetingId: string | null; createdAt: string }[];
}

const NAV_ITEMS = [
  { label: "Go to Inbox", path: "/inbox", icon: Tray, shortcut: "" },
  { label: "Go to Reminders", path: "/reminders", icon: Bell, shortcut: "" },
  { label: "Go to Meetings", path: "/meetings", icon: CalendarBlank, shortcut: "" },
  { label: "Go to Notes", path: "/notes", icon: NotePencil, shortcut: "" },
  { label: "Go to Journal", path: "/journal", icon: BookOpenText, shortcut: "" },
  { label: "Go to Settings", path: "/settings", icon: GearSix, shortcut: "" },
];

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <strong key={i} className="text-primary font-semibold">{part}</strong> : part
  );
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const allItems = buildItemList(query, results);
  const totalItems = allItems.length;

  function handleNavigate(path: string) {
    onClose();
    navigate(path);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && totalItems > 0) {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item?.path) handleNavigate(item.path);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      data-testid="search-modal-overlay"
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="search-modal"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <MagnifyingGlass className="h-5 w-5 text-muted-foreground flex-shrink-0" weight="bold" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search or type a command..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
            data-testid="search-input"
          />
          {query ? (
            <button onClick={() => { setQuery(""); setResults(null); }} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-mono border border-border">
              Ctrl F
            </kbd>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto py-1">
          {loading && query.length >= 2 && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">Searching...</div>
          )}

          {!loading && query.length >= 2 && results && allItems.length === 0 && (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">No results found</div>
          )}

          {allItems.map((item, idx) => {
            if (item.type === "header") {
              return (
                <div key={item.key} className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </div>
              );
            }
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.key}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  isSelected ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/50"
                )}
                onClick={() => item.path && handleNavigate(item.path)}
                onMouseEnter={() => setSelectedIndex(idx)}
                data-testid={`search-result-${item.key}`}
              >
                {item.icon && <item.icon className={cn("h-4 w-4 flex-shrink-0", item.iconClass || "text-muted-foreground")} weight="duotone" />}
                <span className="flex-1 truncate">{item.content}</span>
                {item.badge && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type ListItem = {
  type: "header" | "item";
  key: string;
  label?: string;
  content?: React.ReactNode;
  path?: string;
  icon?: any;
  iconClass?: string;
  badge?: string;
};

function buildItemList(query: string, results: SearchResult | null): ListItem[] {
  const items: ListItem[] = [];

  if (!query || query.length < 2) {
    items.push({ type: "header", key: "nav-header", label: "Navigation" });
    NAV_ITEMS.forEach(nav => {
      items.push({
        type: "item",
        key: `nav-${nav.path}`,
        content: nav.label,
        path: nav.path,
        icon: nav.icon,
      });
    });
    return items;
  }

  if (!results) return items;

  if (results.meetings.length > 0) {
    items.push({ type: "header", key: "meetings-header", label: "Meetings" });
    results.meetings.forEach(m => {
      items.push({
        type: "item",
        key: `meeting-${m.id}`,
        content: highlightMatch(m.title, query),
        path: `/meetings/${m.id}`,
        icon: CalendarBlank,
        iconClass: "text-sky-500",
        badge: m.date ? new Date(m.date).toLocaleDateString() : undefined,
      });
    });
  }

  if (results.tasks.length > 0) {
    items.push({ type: "header", key: "tasks-header", label: "Tasks" });
    results.tasks.forEach(t => {
      items.push({
        type: "item",
        key: `task-${t.id}`,
        content: highlightMatch(t.text, query),
        path: `/reminders/${t.id}`,
        icon: t.isCompleted ? CheckCircle : Circle,
        iconClass: t.isCompleted ? "text-green-500" : "text-muted-foreground",
        badge: t.bucket?.replace('_', ' '),
      });
    });
  }

  if (results.notes.length > 0) {
    items.push({ type: "header", key: "notes-header", label: "Notes" });
    results.notes.forEach(n => {
      items.push({
        type: "item",
        key: `note-${n.id}`,
        content: highlightMatch(n.title, query),
        path: `/notes/${n.id}`,
        icon: NotePencil,
        iconClass: "text-amber-500",
        badge: n.isJournal ? "Journal" : undefined,
      });
    });
  }

  if (results.transcripts.length > 0) {
    items.push({ type: "header", key: "transcripts-header", label: "Transcripts" });
    results.transcripts.forEach(t => {
      items.push({
        type: "item",
        key: `transcript-${t.id}`,
        content: highlightMatch(t.title || "Untitled transcript", query),
        path: t.meetingId ? `/meetings/${t.meetingId}` : `/transcripts/${t.id}`,
        icon: Waveform,
        iconClass: "text-purple-500",
      });
    });
  }

  return items;
}
