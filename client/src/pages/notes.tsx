import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Plus, MagnifyingGlass, Tag, PushPin, Trash, DotsThree, 
  PencilSimple, Link as LinkIcon, Paperclip, Microphone, 
  Smiley, SmileyMeh, SmileySad, Sparkle, Book, FileText
} from "@phosphor-icons/react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

type JournalPrompt = {
  id: string;
  text: string;
  category: string;
};

const MOOD_OPTIONS = [
  { value: 1, label: "Awful", icon: SmileySad, color: "text-red-400" },
  { value: 2, label: "Low", icon: SmileySad, color: "text-orange-400" },
  { value: 3, label: "Okay", icon: SmileyMeh, color: "text-amber-400" },
  { value: 4, label: "Good", icon: Smiley, color: "text-lime-400" },
  { value: 5, label: "Great", icon: Smiley, color: "text-emerald-400" },
];

const NOTE_COLORS = [
  { value: "default", bg: "bg-background", border: "border-border" },
  { value: "violet", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  { value: "blue", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { value: "green", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { value: "amber", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { value: "pink", bg: "bg-pink-500/10", border: "border-pink-500/30" },
];

export default function NotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isJournal, setIsJournal] = useState(false);
  const [selectedColor, setSelectedColor] = useState("default");
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['notes', activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (activeTab === 'journal') params.set('isJournal', 'true');
      if (activeTab === 'notes') params.set('isJournal', 'false');
      
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
  
  const { data: dailyPrompt } = useQuery({
    queryKey: ['daily-prompt'],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/notes/prompts/daily');
      if (!res.ok) throw new Error('Failed to load prompt');
      return res.json();
    }
  });
  
  const notes: Note[] = notesData?.notes || [];
  const tags: NoteTag[] = tagsData?.tags || [];
  const feedNotes: Note[] = feedData?.notes || [];
  const prompt: JournalPrompt | null = dailyPrompt?.prompt || null;
  
  const createNote = useMutation({
    mutationFn: async (data: Partial<Note> & { tagIds?: string[] }) => {
      const res = await authenticatedFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
    setIsJournal(false);
    setSelectedColor("default");
    setSelectedMood(null);
    setSelectedTagIds([]);
  };
  
  const openEditor = (note?: Note, asJournal = false) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setIsJournal(note.isJournal);
      setSelectedColor(note.color || "default");
      setSelectedMood(note.moodScore || null);
      setSelectedTagIds(note.tags?.map(t => t.id) || []);
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
      setIsJournal(asJournal);
      setSelectedColor("default");
      setSelectedMood(null);
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
      isJournal,
      color: selectedColor !== "default" ? selectedColor : undefined,
      moodScore: selectedMood || undefined,
      moodLabel: selectedMood ? MOOD_OPTIONS.find(m => m.value === selectedMood)?.label : undefined,
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
  
  const getMoodIcon = (score?: number) => {
    if (!score) return null;
    const mood = MOOD_OPTIONS.find(m => m.value === score);
    if (!mood) return null;
    const Icon = mood.icon;
    return <Icon className={cn("h-4 w-4", mood.color)} weight="fill" />;
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
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            colors.bg, colors.border,
            note.isPinned && "ring-1 ring-violet-500/50"
          )}
          onClick={() => setSelectedNote(note)}
        >
          <CardContent className={cn("p-4", compact && "p-3")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {note.isPinned && <PushPin className="h-3 w-3 text-violet-400 shrink-0" weight="fill" />}
                  {note.isJournal && <Book className="h-3 w-3 text-violet-400 shrink-0" />}
                  <h3 className="font-medium text-sm truncate">{note.title}</h3>
                </div>
                {!compact && note.content && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {note.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                  </span>
                  {getMoodIcon(note.moodScore)}
                  {note.tags?.slice(0, 2).map(tag => (
                    <Badge key={tag.id} variant="secondary" className="text-xs py-0">
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
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                    <DotsThree className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditor(note); }}>
                    <PencilSimple className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: note.id, isPinned: !note.isPinned }); }}>
                    <PushPin className="h-4 w-4 mr-2" /> {note.isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                    className="text-red-400"
                  >
                    <Trash className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };
  
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Notes</h1>
                <p className="text-sm text-muted-foreground">Your personal notes and journal</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => openEditor(undefined, true)} 
                  variant="outline"
                  data-testid="button-new-journal"
                >
                  <Book className="h-4 w-4 mr-2" /> Journal Entry
                </Button>
                <Button 
                  onClick={() => openEditor()} 
                  className="bg-violet-600 hover:bg-violet-700"
                  data-testid="button-new-note"
                >
                  <Plus className="h-4 w-4 mr-2" /> New Note
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search notes..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-notes"
                />
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
                  <TabsTrigger value="journal" data-testid="tab-journal">Journal</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {prompt && (
              <Card className="mb-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkle className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" weight="fill" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Today's Journal Prompt</p>
                      <p className="text-sm text-muted-foreground mb-3">{prompt.text}</p>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => {
                          setContent(prompt.text + "\n\n");
                          openEditor(undefined, true);
                        }}
                        data-testid="button-use-prompt"
                      >
                        Start Writing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {isLoading ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-1">No notes yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first note or journal entry
                  </p>
                  <Button onClick={() => openEditor()} data-testid="button-create-first-note">
                    <Plus className="h-4 w-4 mr-2" /> Create Note
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                  {notes.map(note => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-80 shrink-0">
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map(tag => (
                    <Badge 
                      key={tag.id} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-violet-500/20"
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
                    className="text-xs h-8"
                    data-testid="input-new-tag"
                  />
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => newTagName && createTag.mutate(newTagName)}
                    disabled={!newTagName}
                    data-testid="button-create-tag"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {feedNotes.map(note => (
                      <div 
                        key={note.id}
                        className="p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedNote(note)}
                      >
                        <div className="flex items-center gap-2">
                          {note.isJournal ? <Book className="h-3 w-3 text-violet-400" /> : <FileText className="h-3 w-3" />}
                          <span className="text-sm font-medium truncate">{note.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                    {feedNotes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "Edit Note" : isJournal ? "New Journal Entry" : "New Note"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input 
              placeholder="Title" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-lg font-medium"
              data-testid="input-note-title"
            />
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing..."
              className="min-h-[200px]"
            />
            
            {isJournal && (
              <div>
                <p className="text-sm font-medium mb-2">How are you feeling?</p>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map(mood => {
                    const Icon = mood.icon;
                    return (
                      <Button
                        key={mood.value}
                        variant={selectedMood === mood.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMood(mood.value)}
                        className={cn(selectedMood === mood.value && "bg-violet-600")}
                        data-testid={`button-mood-${mood.value}`}
                      >
                        <Icon className={cn("h-4 w-4 mr-1", mood.color)} weight="fill" />
                        {mood.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium mb-2">Color</p>
              <div className="flex gap-2">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setSelectedColor(color.value)}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-all",
                      color.bg, color.border,
                      selectedColor === color.value && "ring-2 ring-violet-500 ring-offset-2 ring-offset-background"
                    )}
                    data-testid={`button-color-${color.value}`}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTagIds(prev => 
                        prev.includes(tag.id) 
                          ? prev.filter(id => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                    data-testid={`badge-tag-${tag.id}`}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {tags.length === 0 && (
                  <p className="text-xs text-muted-foreground">Create tags from the sidebar</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetEditor}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={createNote.isPending || updateNote.isPending}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="button-save-note"
            >
              {createNote.isPending || updateNote.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedNote && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedNote.isPinned && <PushPin className="h-4 w-4 text-violet-400" weight="fill" />}
                    {selectedNote.isJournal && <Book className="h-4 w-4 text-violet-400" />}
                    <DialogTitle>{selectedNote.title}</DialogTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedNote(null); openEditor(selectedNote); }}>
                      <PencilSimple className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteNote.mutate(selectedNote.id)}>
                      <Trash className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(selectedNote.createdAt), "PPP 'at' p")}</span>
                  {getMoodIcon(selectedNote.moodScore)}
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{selectedNote.content}</p>
                </div>
                
                {selectedNote.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    {selectedNote.tags.map(tag => (
                      <Badge key={tag.id} variant="secondary">{tag.name}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
