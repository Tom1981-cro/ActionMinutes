import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, MagnifyingGlass, Tag, PushPin, Trash, DotsThree, 
  PencilSimple, FileText, Microphone, CheckSquare, BookOpen,
  Lightning, Star, ArrowRight, Rows, SquaresFour,
  VideoCamera, FolderSimple
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/skeleton-loader";
import { EmptyState } from "@/components/empty-state";
import { Loader2 } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content: string;
  isJournal: boolean;
  isPinned: boolean;
  visibility: string;
  color?: string;
  moodScore?: number;
  moodLabel?: string;
  meetingId?: string;
  collection?: string;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; name: string; color?: string }[];
  attachments?: { id: string; fileName: string; fileType: string }[];
};

type NoteTag = {
  id: string;
  name: string;
  color?: string;
};

type Meeting = {
  id: string;
  title: string;
  date: string;
};

const NOTE_COLORS = [
  { value: "default", label: "Default", style: {} as React.CSSProperties },
  { value: "violet", label: "Violet", style: { backgroundColor: 'color-mix(in srgb, var(--primary) 8%, var(--card))', borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)' } as React.CSSProperties },
  { value: "blue", label: "Blue", style: { backgroundColor: 'color-mix(in srgb, var(--primary) 6%, var(--card))', borderColor: 'color-mix(in srgb, var(--primary) 15%, transparent)' } as React.CSSProperties },
  { value: "green", label: "Green", style: { backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--card))', borderColor: 'color-mix(in srgb, var(--success) 20%, transparent)' } as React.CSSProperties },
  { value: "amber", label: "Amber", style: { backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--card))', borderColor: 'color-mix(in srgb, var(--warning) 20%, transparent)' } as React.CSSProperties },
  { value: "pink", label: "Pink", style: { backgroundColor: 'color-mix(in srgb, var(--accent) 15%, var(--card))', borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)' } as React.CSSProperties },
];

const FILTER_PILLS = ["All", "Work", "Personal", "Meeting"];

const DEFAULT_COLLECTIONS = [
  { name: "Projects", icon: FolderSimple },
  { name: "Meeting Notes", icon: VideoCamera },
  { name: "Personal", icon: Star },
  { name: "Archives", icon: BookOpen },
];

export default function NotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("default");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>("");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [newTagName, setNewTagName] = useState("");
  
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['notes', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('isJournal', 'false');
      
      const res = await authenticatedFetch(`/api/notes?${params}`);
      if (!res.ok) throw new Error('Failed to load notes');
      return res.json();
    }
  });
  
  const { data: tagsData } = useQuery({
    queryKey: ['note-tags'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/notes/tags');
      if (!res.ok) throw new Error('Failed to load tags');
      return res.json();
    }
  });

  const { data: meetingsData } = useQuery({
    queryKey: ['meetings-list', user.id],
    queryFn: async () => {
      const res = await authenticatedFetch(`/api/meetings?userId=${user.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id
  });
  
  const notes: Note[] = notesData?.notes || [];
  const tags: NoteTag[] = tagsData?.tags || [];
  const meetings: Meeting[] = meetingsData?.meetings || meetingsData || [];

  const filteredNotes = useMemo(() => {
    if (activeFilter === "All") return notes;
    return notes.filter(note => {
      const tagNames = note.tags?.map(t => t.name.toLowerCase()) || [];
      const filter = activeFilter.toLowerCase();
      if (filter === "meeting") {
        return !!note.meetingId || tagNames.some(t => t.includes("meeting"));
      }
      return tagNames.some(t => t.includes(filter)) || 
             note.collection?.toLowerCase() === filter;
    });
  }, [notes, activeFilter]);

  const collections = useMemo(() => {
    const collMap = new Map<string, number>();
    for (const c of DEFAULT_COLLECTIONS) {
      collMap.set(c.name, 0);
    }
    for (const note of notes) {
      const coll = note.collection || "Personal";
      collMap.set(coll, (collMap.get(coll) || 0) + 1);
    }
    return Array.from(collMap.entries()).map(([name, count]) => ({ name, count }));
  }, [notes]);

  const meetingMap = useMemo(() => {
    const map = new Map<string, Meeting>();
    for (const m of meetings) {
      map.set(m.id, m);
    }
    return map;
  }, [meetings]);
  
  const createNote = useMutation({
    mutationFn: async (data: Partial<Note> & { tagIds?: string[] }) => {
      const res = await authenticatedFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isJournal: false })
      });
      if (!res.ok) throw new Error('Failed to create note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      resetEditor();
      toast({ title: "Note saved" });
    },
    onError: () => {
      toast({ title: "Failed to save note", variant: "destructive" });
    }
  });
  
  const updateNote = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Note> & { id: string }) => {
      const res = await authenticatedFetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to update note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      resetEditor();
      toast({ title: "Note updated" });
    },
    onError: () => {
      toast({ title: "Failed to update note", variant: "destructive" });
    }
  });
  
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(null);
      toast({ title: "Note deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
    }
  });
  
  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await authenticatedFetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned })
      });
      if (!res.ok) throw new Error('Failed to update note');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast({ title: variables.isPinned ? "Note pinned" : "Note unpinned" });
    },
    onError: () => {
      toast({ title: "Failed to update pin", variant: "destructive" });
    }
  });

  const extractActions = useMutation({
    mutationFn: async (noteId: string) => {
      const res = await authenticatedFetch(`/api/notes/${noteId}/extract-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to extract actions');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal/reminders'] });
      toast({ title: data.message || "Actions extracted" });
    },
    onError: () => {
      toast({ title: "Failed to extract actions", variant: "destructive" });
    }
  });
  
  const createTag = useMutation({
    mutationFn: async (name: string) => {
      const res = await authenticatedFetch('/api/notes/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create tag');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['note-tags'] });
      setNewTagName("");
      toast({ title: "Tag created" });
    }
  });
  
  const resetEditor = () => {
    setShowEditor(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSelectedColor("default");
    setSelectedTagIds([]);
    setSelectedMeetingId("");
    setSelectedCollection("");
  };
  
  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setSelectedColor(note.color || "default");
      setSelectedTagIds(note.tags?.map(t => t.id) || []);
      setSelectedMeetingId(note.meetingId || "");
      setSelectedCollection(note.collection || "");
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
      setSelectedColor("default");
      setSelectedTagIds([]);
      setSelectedMeetingId("");
      setSelectedCollection("");
    }
    setShowEditor(true);
  };
  
  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    
    const data: any = {
      title: title.trim(),
      content,
      color: selectedColor !== "default" ? selectedColor : undefined,
      tagIds: selectedTagIds,
      meetingId: selectedMeetingId || undefined,
      collection: selectedCollection || undefined
    };
    
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...data });
    } else {
      createNote.mutate(data);
    }
  };
  
  const getColorStyle = (color?: string): React.CSSProperties => {
    const c = NOTE_COLORS.find(n => n.value === color) || NOTE_COLORS[0];
    return c.style;
  };

  const getPlainText = (html: string) => {
    return html?.replace(/<[^>]*>/g, '').trim() || '';
  };

  const hasChecklistItems = (content: string) => {
    return content?.includes('[ ]') || content?.includes('[x]') || content?.includes('<input');
  };
  
  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-notes-title">Notes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Capture ideas, meeting minutes, and quick thoughts.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg p-0.5 bg-muted">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === 'grid' && "bg-card shadow-sm")}
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <SquaresFour className="h-4 w-4" weight="duotone" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8", viewMode === 'list' && "bg-card shadow-sm")}
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <Rows className="h-4 w-4" weight="duotone" />
            </Button>
          </div>
          <Button 
            onClick={() => openEditor()} 
            className="gap-2 btn-gradient"
            data-testid="button-new-note"
          >
            <Plus className="h-4 w-4" weight="bold" /> New Note
          </Button>
        </div>
      </div>

      {/* Search + Filter pills */}
      <div className="flex items-center gap-3 mb-5 mt-4">
        <div className="relative flex-1 max-w-xl">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes, tags, or content..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card border-border rounded-xl"
            data-testid="input-search-notes"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {FILTER_PILLS.map(pill => (
            <button
              key={pill}
              onClick={() => setActiveFilter(pill)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors",
                activeFilter === pill
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              data-testid={`filter-pill-${pill.toLowerCase()}`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: masonry grid + sidebar */}
      <div className="flex gap-5">
        {/* Content area */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="columns-2 lg:columns-3 gap-4">
              <SkeletonList count={6} type="note" className="contents" />
            </div>
          ) : filteredNotes.length === 0 && !searchQuery ? (
            <EmptyState 
              variant="notes"
              onAction={() => openEditor()}
              showTutorial={false}
            />
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? "columns-2 lg:columns-3 gap-4 [column-fill:_balance]"
                : "space-y-3"
            )}>
              {/* Create New card */}
              {viewMode === 'grid' && (
                <div 
                  className="break-inside-avoid mb-4 cursor-pointer group"
                  onClick={() => openEditor()}
                  data-testid="card-create-new-note"
                >
                  <div className="rounded-2xl border-2 border-dashed border-border hover:border-primary/40 bg-card/50 p-6 flex flex-col items-center gap-3 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="h-6 w-6 text-primary" weight="bold" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Create New</span>
                    <div className="flex items-center gap-3 mt-1">
                      <button 
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditor(); }}
                        data-testid="button-create-voice-note"
                      >
                        <Microphone className="h-4 w-4 text-muted-foreground" weight="duotone" />
                      </button>
                      <button 
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditor(); }}
                        data-testid="button-create-checklist"
                      >
                        <CheckSquare className="h-4 w-4 text-muted-foreground" weight="duotone" />
                      </button>
                      <button 
                        className="p-2 rounded-full hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); openEditor(); }}
                        data-testid="button-create-from-template"
                      >
                        <BookOpen className="h-4 w-4 text-muted-foreground" weight="duotone" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {filteredNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    viewMode={viewMode}
                    meetingMap={meetingMap}
                    getPlainText={getPlainText}
                    hasChecklistItems={hasChecklistItems}
                    getColorStyle={getColorStyle}
                    onSelect={setSelectedNote}
                    onEdit={openEditor}
                    onDelete={(id) => deleteNote.mutate(id)}
                    onTogglePin={(id, pinned) => togglePin.mutate({ id, isPinned: pinned })}
                    onExtractActions={(id) => extractActions.mutate(id)}
                    isExtracting={extractActions.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[220px] flex-shrink-0 space-y-4">
          {/* Collections */}
          <div className="glass-panel rounded-2xl p-4" data-testid="card-collections">
            <div className="flex items-center gap-1.5 mb-3">
              <FolderSimple className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Collections</span>
            </div>
            <div className="space-y-1.5">
              {collections.map(({ name, count }) => (
                <button
                  key={name}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("All");
                  }}
                  className="w-full flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-accent transition-colors group"
                  data-testid={`collection-${name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                    <span className="text-sm text-foreground">{name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </button>
              ))}
            </div>
            <button 
              className="mt-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              data-testid="button-new-collection"
            >
              + New Collection
            </button>
          </div>

          {/* Tags */}
          <div className="glass-panel rounded-2xl p-4" data-testid="card-tags">
            <div className="flex items-center gap-1.5 mb-3">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" weight="bold" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setSearchQuery(tag.name)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    "bg-muted text-foreground hover:bg-accent"
                  )}
                  data-testid={`tag-pill-${tag.id}`}
                >
                  #{tag.name}
                </button>
              ))}
              <button 
                onClick={() => {
                  const name = prompt("Enter tag name:");
                  if (name) createTag.mutate(name);
                }}
                className="px-2 py-1 rounded-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-foreground/30 transition-colors"
                data-testid="button-add-tag"
              >
                +
              </button>
            </div>
          </div>

          {/* Scratchpad */}
          <div 
            className="glass-panel rounded-2xl p-4" 
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 8%, var(--card))', borderColor: 'color-mix(in srgb, var(--warning) 20%, transparent)' }}
            data-testid="card-scratchpad"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <PencilSimple className="h-3.5 w-3.5" weight="bold" style={{ color: 'var(--warning)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--warning)' }}>Scratchpad</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Quick capture area for fleeting thoughts. Click to expand.
            </p>
          </div>
        </div>
      </div>
      
      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingNote ? "Edit Note" : "New Note"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input 
              placeholder="Title" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-medium border-0 px-0 bg-transparent text-foreground"
              data-testid="input-note-title"
            />
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing..."
              className="min-h-[200px]"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Color</p>
                <div className="flex gap-2">
                  {NOTE_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-all",
                        color.bg,
                        selectedColor === color.value ? "border-primary scale-110" : "border-transparent"
                      )}
                      data-testid={`button-color-${color.value}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Collection</p>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger className="h-8 text-xs" data-testid="select-collection">
                    <SelectValue placeholder="Choose collection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_COLLECTIONS.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium mb-1.5 text-muted-foreground">Link to Meeting</p>
              <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-meeting-link">
                  <SelectValue placeholder="Link to a meeting (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No meeting</SelectItem>
                  {meetings.slice(0, 20).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {tags.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1.5 text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer transition-all text-xs",
                        selectedTagIds.includes(tag.id) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-foreground hover:bg-accent"
                      )}
                      onClick={() => {
                        setSelectedTagIds(prev => 
                          prev.includes(tag.id) 
                            ? prev.filter(id => id !== tag.id)
                            : [...prev, tag.id]
                        );
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={resetEditor} className="border-border">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createNote.isPending || updateNote.isPending}
              className="bg-primary hover:bg-primary/90"
              data-testid="button-save-note"
            >
              {createNote.isPending || updateNote.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Note Detail Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border-border">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2 text-foreground">
                    {selectedNote.isPinned && <PushPin className="h-4 w-4 text-primary" weight="fill" />}
                    {selectedNote.title}
                  </DialogTitle>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => extractActions.mutate(selectedNote.id)}
                      disabled={extractActions.isPending}
                      data-testid="button-extract-actions-detail"
                    >
                      {extractActions.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Lightning className="h-3.5 w-3.5 text-primary" weight="duotone" />
                      )}
                      Extract Actions
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { openEditor(selectedNote); setSelectedNote(null); }}>
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNote.mutate(selectedNote.id)}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Last updated {format(new Date(selectedNote.updatedAt), "PPp")}
                  </span>
                  {selectedNote.meetingId && meetingMap.get(selectedNote.meetingId) && (
                    <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary">
                      <VideoCamera className="h-3 w-3" weight="duotone" />
                      {meetingMap.get(selectedNote.meetingId)?.title}
                    </Badge>
                  )}
                </div>
              </DialogHeader>
              
              <div className="prose prose-sm max-w-none mt-4 text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                <div dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p>No content</p>" }} />
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                  {selectedNote.tags.map(tag => (
                    <Badge key={tag.id} variant="secondary" className="text-xs bg-muted text-foreground">
                      #{tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({ 
  note, viewMode, meetingMap, getColorStyle, getPlainText, hasChecklistItems,
  onSelect, onEdit, onDelete, onTogglePin, onExtractActions, isExtracting
}: {
  note: Note;
  viewMode: 'grid' | 'list';
  meetingMap: Map<string, Meeting>;
  getColorStyle: (color?: string) => React.CSSProperties;
  getPlainText: (html: string) => string;
  hasChecklistItems: (content: string) => boolean;
  onSelect: (note: Note) => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onExtractActions: (id: string) => void;
  isExtracting: boolean;
}) {
  const colorStyle = getColorStyle(note.color);
  const plainText = getPlainText(note.content);
  const linkedMeeting = note.meetingId ? meetingMap.get(note.meetingId) : null;
  const hasChecklist = hasChecklistItems(note.content);
  const contentLength = plainText.length;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={viewMode === 'grid' ? "break-inside-avoid mb-4" : ""}
      data-testid={`note-card-${note.id}`}
    >
      <div 
        className={cn(
          "relative cursor-pointer transition-all rounded-2xl border p-4 group",
          "hover:shadow-lg hover:scale-[1.01]",
          !note.color || note.color === 'default' ? "bg-card border-border" : "",
          note.isPinned && "ring-1 ring-primary/30"
        )}
        style={note.color && note.color !== 'default' ? colorStyle : undefined}
        onClick={() => onSelect(note)}
      >
        {/* Pin indicator */}
        {note.isPinned && (
          <div className="flex justify-end mb-1">
            <Star className="h-3.5 w-3.5" weight="fill" style={{ color: 'var(--warning)' }} />
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-sm text-foreground mb-1 leading-snug" data-testid={`text-note-title-${note.id}`}>
          {note.title}
        </h3>

        {/* Timestamp */}
        <p className="text-[10px] text-muted-foreground mb-2">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </p>

        {/* Content preview */}
        {plainText && (
          <p className={cn(
            "text-xs text-muted-foreground leading-relaxed mb-3",
            contentLength > 200 ? "line-clamp-5" : contentLength > 100 ? "line-clamp-3" : "line-clamp-2"
          )}>
            {plainText.slice(0, 300)}
          </p>
        )}

        {/* Checklist preview */}
        {hasChecklist && (
          <div className="mb-3 space-y-1">
            {plainText.split('\n').filter(l => l.includes('[ ]') || l.includes('[x]')).slice(0, 3).map((line, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn(
                  "w-3 h-3 rounded border flex-shrink-0",
                  line.includes('[x]') ? "bg-primary border-primary" : "border-muted-foreground/40"
                )} />
                <span className={line.includes('[x]') ? "line-through" : ""}>
                  {line.replace(/\[[ x]\]\s?/g, '').trim()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Meeting link badge */}
        {linkedMeeting && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary border-primary/20">
              <VideoCamera className="h-3 w-3" weight="duotone" />
              {linkedMeeting.title}
            </Badge>
          </div>
        )}

        {/* Actions detected indicator */}
        {plainText.length > 50 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExtractActions(note.id);
            }}
            disabled={isExtracting}
            className="flex items-center gap-1.5 mb-2 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors group/action"
            data-testid={`button-extract-actions-${note.id}`}
          >
            {isExtracting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Lightning className="h-3 w-3" weight="duotone" />
            )}
            <span>Extract actions</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover/action:opacity-100 transition-opacity" weight="bold" />
          </button>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {note.tags.slice(0, 3).map(tag => (
              <span 
                key={tag.id} 
                className="text-[10px] text-primary font-medium"
                data-testid={`text-tag-${tag.id}`}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card">
                <DotsThree className="h-4 w-4 text-muted-foreground" weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl bg-card border-border">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }} className="cursor-pointer text-xs">
                <PencilSimple className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTogglePin(note.id, !note.isPinned); }} className="cursor-pointer text-xs">
                <PushPin className="h-3.5 w-3.5 mr-2" /> {note.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExtractActions(note.id); }} className="cursor-pointer text-xs">
                <Lightning className="h-3.5 w-3.5 mr-2" /> Extract Actions
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="text-destructive cursor-pointer text-xs"
              >
                <Trash className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
