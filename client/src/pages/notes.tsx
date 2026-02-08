import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Plus, MagnifyingGlass, Tag, PushPin, Trash, DotsThree, 
  PencilSimple, FileText, NotePencil
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { SkeletonList } from "@/components/skeleton-loader";
import { EmptyState } from "@/components/empty-state";

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

const NOTE_COLORS = [
  { value: "default", bg: "bg-muted", border: "border-border" },
  { value: "violet", bg: "bg-accent", border: "border-border" },
  { value: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { value: "green", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { value: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "pink", bg: "bg-pink-500/10", border: "border-pink-500/30" },
];

export default function NotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("default");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
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
  
  const { data: feedData } = useQuery({
    queryKey: ['notes-feed'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/notes/feed?limit=10');
      if (!res.ok) throw new Error('Failed to load feed');
      return res.json();
    }
  });
  
  const notes: Note[] = notesData?.notes || [];
  const tags: NoteTag[] = tagsData?.tags || [];
  const feedNotes: Note[] = (feedData?.notes || []).filter((n: Note) => !n.isJournal);
  
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
      queryClient.invalidateQueries({ queryKey: ['notes-feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['notes-feed'] });
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
      queryClient.invalidateQueries({ queryKey: ['notes-feed'] });
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
  };
  
  const openEditor = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setSelectedColor(note.color || "default");
      setSelectedTagIds(note.tags?.map(t => t.id) || []);
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
      setSelectedColor("default");
      setSelectedTagIds([]);
    }
    setShowEditor(true);
  };
  
  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    
    const data = {
      title: title.trim(),
      content,
      color: selectedColor !== "default" ? selectedColor : undefined,
      tagIds: selectedTagIds
    };
    
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...data });
    } else {
      createNote.mutate(data);
    }
  };
  
  const getColorClasses = (color?: string) => {
    const c = NOTE_COLORS.find(n => n.value === color) || NOTE_COLORS[0];
    return { bg: c.bg, border: c.border };
  };
  
  const NoteCard = ({ note, compact = false }: { note: Note; compact?: boolean }) => {
    const colors = getColorClasses(note.color);
    
    return (
      <div
        style={{ animation: "fadeUp 0.3s ease-out forwards" }}
        data-testid={`note-card-${note.id}`}
      >
        <div 
          className={cn(
            "cursor-pointer transition-all rounded-2xl backdrop-blur-xl border p-4",
            "hover:shadow-lg hover:scale-[1.01]",
            colors.bg, colors.border,
            note.isPinned && "ring-1 ring-ring"
          )}
          onClick={() => setSelectedNote(note)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {note.isPinned && <PushPin className="h-3 w-3 text-primary shrink-0" weight="fill" />}
                <h3 className="font-medium text-sm truncate text-foreground">{note.title}</h3>
              </div>
              {!compact && note.content && (
                <p className="text-xs line-clamp-2 mb-2 text-muted-foreground">
                  {note.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </span>
                {note.tags?.slice(0, 2).map(tag => (
                  <Badge key={tag.id} variant="secondary" className="text-xs py-0 bg-accent text-primary">
                    {tag.name}
                  </Badge>
                ))}
                {(note.tags?.length || 0) > 2 && (
                  <span className="text-xs text-muted-foreground">+{note.tags!.length - 2}</span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 hover:bg-accent">
                  <DotsThree className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl bg-card border-border">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(note); }} className="cursor-pointer">
                  <PencilSimple className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: note.id, isPinned: !note.isPinned }); }} className="cursor-pointer">
                  <PushPin className="h-4 w-4 mr-2" /> {note.isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                  className="text-red-400 cursor-pointer"
                >
                  <Trash className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notes</h1>
          <p className="text-sm mt-1 text-muted-foreground">Your personal notes and ideas</p>
        </div>
        <Button 
          onClick={() => openEditor()} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          data-testid="button-new-note"
        >
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative mb-4 rounded-xl backdrop-blur-xl border bg-card border-border">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-transparent h-10 text-foreground placeholder:text-muted-foreground"
              data-testid="input-search-notes"
            />
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <SkeletonList count={4} type="note" className="contents" />
            </div>
          ) : notes.length === 0 ? (
            <EmptyState 
              variant="notes"
              onAction={() => openEditor()}
              showTutorial={false}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
                {notes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
            </div>
          )}
        </div>
        
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className="rounded-2xl backdrop-blur-xl border p-4 bg-card border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
              <Tag className="h-4 w-4" weight="duotone" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant="secondary" 
                  className="cursor-pointer transition-colors bg-accent text-primary hover:bg-accent/80"
                  onClick={() => setSearchQuery(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">No tags yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="New tag..." 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className="text-xs h-8 border-0 bg-muted"
                data-testid="input-new-tag"
              />
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => newTagName && createTag.mutate(newTagName)}
                disabled={!newTagName}
                className="bg-accent hover:bg-accent/80 text-primary"
                data-testid="button-create-tag"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="rounded-2xl backdrop-blur-xl border p-4 bg-card border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-foreground">
              <FileText className="h-4 w-4" weight="duotone" /> Recent Activity
            </h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {feedNotes.map(note => (
                  <div 
                    key={note.id}
                    className="p-2 rounded-xl cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-primary" />
                      <span className="text-sm font-medium truncate text-foreground">{note.title}</span>
                    </div>
                    <p className="text-xs ml-5 text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {feedNotes.length === 0 && (
                  <p className="text-xs text-center py-4 text-muted-foreground">No recent activity</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      
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
            
            <div>
              <p className="text-sm font-medium mb-2 text-foreground">Color</p>
              <div className="flex gap-2">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.bg,
                      selectedColor === color.value ? "border-primary scale-110" : "border-transparent"
                    )}
                    data-testid={`button-color-${color.value}`}
                  />
                ))}
              </div>
            </div>
            
            {tags.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer transition-all",
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
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { openEditor(selectedNote); setSelectedNote(null); }}>
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteNote.mutate(selectedNote.id)} className="text-red-400">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated {format(new Date(selectedNote.updatedAt), "PPp")}
                </p>
              </DialogHeader>
              
              <div className="prose prose-sm max-w-none mt-4 text-foreground prose-headings:text-foreground prose-strong:text-foreground">
                <div dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p>No content</p>" }} />
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {selectedNote.tags.map(tag => (
                    <Badge key={tag.id} variant="secondary" className="bg-accent text-primary">
                      {tag.name}
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
