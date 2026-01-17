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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

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
  { value: "default", bg: "bg-white/5", border: "border-white/10" },
  { value: "violet", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  { value: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { value: "green", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { value: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "pink", bg: "bg-pink-500/10", border: "border-pink-500/30" },
];

export default function NotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme } = useStore();
  
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        data-testid={`note-card-${note.id}`}
      >
        <div 
          className={cn(
            "cursor-pointer transition-all rounded-2xl backdrop-blur-xl border p-4",
            "hover:shadow-lg hover:scale-[1.01]",
            colors.bg, colors.border,
            note.isPinned && "ring-1 ring-violet-500/50",
            theme === "light" ? "bg-white/80 border-gray-200/50" : ""
          )}
          onClick={() => setSelectedNote(note)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {note.isPinned && <PushPin className="h-3 w-3 text-violet-400 shrink-0" weight="fill" />}
                <h3 className={cn("font-medium text-sm truncate", theme === "light" ? "text-gray-900" : "text-white")}>{note.title}</h3>
              </div>
              {!compact && note.content && (
                <p className={cn("text-xs line-clamp-2 mb-2", theme === "light" ? "text-gray-600" : "text-white/60")}>
                  {note.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/40")}>
                  {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                </span>
                {note.tags?.slice(0, 2).map(tag => (
                  <Badge key={tag.id} variant="secondary" className={cn("text-xs py-0", theme === "light" ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-300")}>
                    {tag.name}
                  </Badge>
                ))}
                {(note.tags?.length || 0) > 2 && (
                  <span className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/40")}>+{note.tags!.length - 2}</span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className={cn("h-7 w-7 shrink-0", theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10")}>
                  <DotsThree className={cn("h-4 w-4", theme === "light" ? "text-gray-500" : "text-white/60")} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={cn("rounded-xl", theme === "light" ? "bg-white border-gray-200" : "bg-[#1a1a1a] border-white/10")}>
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
      </motion.div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gradient-light">Notes</h1>
          <p className={cn("text-sm mt-1", theme === "light" ? "text-gray-600" : "text-white/60")}>Your personal notes and ideas</p>
        </div>
        <Button 
          onClick={() => openEditor()} 
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg"
          data-testid="button-new-note"
        >
          <Plus className="h-4 w-4 mr-2" /> New Note
        </Button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className={cn(
            "relative mb-4 rounded-xl backdrop-blur-xl border",
            theme === "light" ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <MagnifyingGlass className={cn("absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4", theme === "light" ? "text-gray-400" : "text-white/40")} />
            <Input 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 border-0 bg-transparent h-12",
                theme === "light" ? "text-gray-900 placeholder:text-gray-400" : "text-white placeholder:text-white/40"
              )}
              data-testid="input-search-notes"
            />
          </div>
          
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={cn("rounded-2xl p-4 animate-pulse", theme === "light" ? "bg-gray-100" : "bg-white/5")}>
                  <div className={cn("h-4 rounded w-3/4 mb-2", theme === "light" ? "bg-gray-200" : "bg-white/10")} />
                  <div className={cn("h-3 rounded w-1/2", theme === "light" ? "bg-gray-200" : "bg-white/10")} />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className={cn(
              "rounded-2xl backdrop-blur-xl border border-dashed p-12 text-center",
              theme === "light" ? "bg-white/50 border-gray-300" : "bg-white/5 border-white/20"
            )}>
              <NotePencil className={cn("h-12 w-12 mx-auto mb-4", theme === "light" ? "text-gray-400" : "text-white/30")} weight="duotone" />
              <h3 className={cn("font-medium mb-1", theme === "light" ? "text-gray-900" : "text-white")}>No notes yet</h3>
              <p className={cn("text-sm mb-4", theme === "light" ? "text-gray-600" : "text-white/60")}>
                Create your first note to get started
              </p>
              <Button onClick={() => openEditor()} className="bg-violet-600 hover:bg-violet-700" data-testid="button-create-first-note">
                <Plus className="h-4 w-4 mr-2" /> Create Note
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {notes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <div className={cn(
            "rounded-2xl backdrop-blur-xl border p-4",
            theme === "light" ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <h3 className={cn("text-sm font-semibold flex items-center gap-2 mb-3", theme === "light" ? "text-gray-900" : "text-white")}>
              <Tag className="h-4 w-4" weight="duotone" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant="secondary" 
                  className={cn(
                    "cursor-pointer transition-colors",
                    theme === "light" 
                      ? "bg-violet-100 text-violet-700 hover:bg-violet-200" 
                      : "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                  )}
                  onClick={() => setSearchQuery(tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length === 0 && (
                <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/40")}>No tags yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input 
                placeholder="New tag..." 
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                className={cn(
                  "text-xs h-8 border-0",
                  theme === "light" ? "bg-gray-100" : "bg-white/5"
                )}
                data-testid="input-new-tag"
              />
              <Button 
                size="sm" 
                variant="secondary"
                onClick={() => newTagName && createTag.mutate(newTagName)}
                disabled={!newTagName}
                className={cn(theme === "light" ? "bg-violet-100 hover:bg-violet-200 text-violet-700" : "bg-violet-500/20 hover:bg-violet-500/30")}
                data-testid="button-create-tag"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className={cn(
            "rounded-2xl backdrop-blur-xl border p-4",
            theme === "light" ? "bg-white/80 border-gray-200" : "bg-white/5 border-white/10"
          )}>
            <h3 className={cn("text-sm font-semibold flex items-center gap-2 mb-3", theme === "light" ? "text-gray-900" : "text-white")}>
              <FileText className="h-4 w-4" weight="duotone" /> Recent Activity
            </h3>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {feedNotes.map(note => (
                  <div 
                    key={note.id}
                    className={cn(
                      "p-2 rounded-xl cursor-pointer transition-colors",
                      theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                    )}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className={cn("h-3 w-3", theme === "light" ? "text-violet-600" : "text-violet-400")} />
                      <span className={cn("text-sm font-medium truncate", theme === "light" ? "text-gray-900" : "text-white")}>{note.title}</span>
                    </div>
                    <p className={cn("text-xs ml-5", theme === "light" ? "text-gray-500" : "text-white/40")}>
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
                {feedNotes.length === 0 && (
                  <p className={cn("text-xs text-center py-4", theme === "light" ? "text-gray-500" : "text-white/40")}>No recent activity</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl",
          theme === "light" ? "bg-white border-gray-200" : "bg-[#0f0f0f] border-white/10"
        )}>
          <DialogHeader>
            <DialogTitle className={theme === "light" ? "text-gray-900" : "text-white"}>
              {editingNote ? "Edit Note" : "New Note"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input 
              placeholder="Title" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={cn(
                "text-lg font-medium border-0 px-0",
                theme === "light" ? "bg-transparent text-gray-900" : "bg-transparent text-white"
              )}
              data-testid="input-note-title"
            />
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing..."
              className="min-h-[200px]"
            />
            
            <div>
              <p className={cn("text-sm font-medium mb-2", theme === "light" ? "text-gray-700" : "text-white/80")}>Color</p>
              <div className="flex gap-2">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.bg,
                      selectedColor === color.value ? "border-violet-500 scale-110" : "border-transparent"
                    )}
                    data-testid={`button-color-${color.value}`}
                  />
                ))}
              </div>
            </div>
            
            {tags.length > 0 && (
              <div>
                <p className={cn("text-sm font-medium mb-2", theme === "light" ? "text-gray-700" : "text-white/80")}>Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedTagIds.includes(tag.id) 
                          ? "bg-violet-600 text-white" 
                          : theme === "light" 
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                            : "bg-white/10 text-white/70 hover:bg-white/20"
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
            <Button variant="outline" onClick={resetEditor} className={theme === "light" ? "" : "border-white/10"}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={createNote.isPending || updateNote.isPending}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-save-note"
            >
              {createNote.isPending || updateNote.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className={cn(
          "max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl",
          theme === "light" ? "bg-white border-gray-200" : "bg-[#0f0f0f] border-white/10"
        )}>
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className={cn("flex items-center gap-2", theme === "light" ? "text-gray-900" : "text-white")}>
                    {selectedNote.isPinned && <PushPin className="h-4 w-4 text-violet-400" weight="fill" />}
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
                <p className={cn("text-xs", theme === "light" ? "text-gray-500" : "text-white/40")}>
                  Last updated {format(new Date(selectedNote.updatedAt), "PPp")}
                </p>
              </DialogHeader>
              
              <div className={cn("prose prose-sm max-w-none mt-4", theme === "light" ? "" : "prose-invert")}>
                <div dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p>No content</p>" }} />
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                  {selectedNote.tags.map(tag => (
                    <Badge key={tag.id} variant="secondary" className={theme === "light" ? "bg-violet-100 text-violet-700" : "bg-violet-500/20 text-violet-300"}>
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
