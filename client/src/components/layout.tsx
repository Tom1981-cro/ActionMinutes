import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, Bell, BookOpen, SignOut, Sun, Moon, 
  BookOpenText, CaretDown, Robot, User, Calendar, Waveform, NotePencil, ListBullets, Plus, PencilSimple, Check, X, DotsThree, Trash, Lightning,
  CheckCircle, Archive,
  House, Briefcase, UsersThree, Heart, GraduationCap, PaintBrush, Flower, Barbell, ChatCircle, UserCircle
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useTheme } from "@/theme/useTheme";
import { useAuth, authenticatedFetch } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { QuickAdd } from "@/components/quick-add";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoIcon from "@assets/am_logo_1767300370565.png";

interface LayoutProps {
  children: React.ReactNode;
}

type CustomList = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  position: number;
};

const LIST_ICON_OPTIONS: { id: string; label: string; icon: PhosphorIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'family', label: 'Family', icon: UsersThree },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'hobby', label: 'Hobby', icon: PaintBrush },
  { id: 'wellness', label: 'Wellness', icon: Flower },
  { id: 'workout', label: 'Workout', icon: Barbell },
  { id: 'social', label: 'Social', icon: ChatCircle },
  { id: 'personal', label: 'Personal', icon: UserCircle },
];

function getListIcon(iconId?: string): PhosphorIcon {
  const found = LIST_ICON_OPTIONS.find(o => o.id === iconId);
  return found ? found.icon : ListBullets;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useStore();
  const { theme: themeId, mode, toggleMode: toggleTheme } = useTheme();
  const { logout, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListIcon, setNewListIcon] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<CustomList | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const { data: customLists = [] } = useQuery<CustomList[]>({
    queryKey: ['custom-lists', user.id],
    queryFn: async () => {
      const res = await authenticatedFetch('/api/lists');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id,
  });

  const createList = useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon?: string }) => {
      const res = await authenticatedFetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: icon || null, position: customLists.length }),
      });
      if (!res.ok) throw new Error('Failed to create list');
      return res.json();
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setLocation(`/app/lists/${newList.id}`);
      setCreateDialogOpen(false);
      setNewListName("");
      setNewListIcon(null);
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api/lists/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete list');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setDeleteDialogOpen(false);
      setListToDelete(null);
      if (location.startsWith('/app/lists/')) {
        setLocation('/app/inbox');
      }
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await authenticatedFetch(`/api/lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update list');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lists'] });
      setEditingListId(null);
    },
  });


  const actionToDoItems = [
    { href: "/app/inbox", label: "Inbox", icon: Tray },
  ];

  const aiAssistantItems = [
    { href: "/app/capture", label: "Capture", icon: PlusCircle, primary: true },
    { href: "/app/meetings", label: "Meetings", icon: CalendarBlank },
    { href: "/app/calendar", label: "Calendar", icon: Calendar },
  ];

  const actionReflectItems = [
    { href: "/app/journal", label: "Journal", icon: BookOpen },
    { href: "/app/notes", label: "Notes", icon: NotePencil },
  ];

  const bottomItems = [
    { href: "/app/actioned", label: "Actioned", icon: CheckCircle },
    { href: "/app/deleted", label: "Deleted", icon: Trash },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!location.startsWith("/login") && location !== "/") {
      setLocation("/login");
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans bg-mesh">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border p-4 h-screen sticky top-0">
        <div className="flex items-center gap-2 px-2 mb-4 mt-4">
          <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
          <span className="text-xl tracking-tight font-logo">
            <span className="font-bold text-foreground">Action</span>
            <span className="font-normal text-primary">Minutes</span>
          </span>
        </div>
        <nav className="space-y-0.5 flex-1 overflow-y-auto">
          <button
            onClick={() => setQuickAddOpen(true)}
            className="navItem w-full group"
            data-testid="nav-addaction"
          >
            <Lightning className="nav-icon text-primary" weight="fill" />
            <span className="text-foreground">Add<span className="text-primary font-semibold">Action</span></span>
          </button>

          <div className="pt-3 pb-1 px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Action To Do</span>
          </div>

          {actionToDoItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={isActive ? "navItemActive" : "navItem"}
              >
                <item.icon className={cn("nav-icon", isActive && "text-primary")} weight="duotone" />
                {item.label}
              </Link>
            );
          })}

          {customLists.map((list) => {
            const isActive = location === `/app/lists/${list.id}`;
            return (
              <div key={list.id} className="group relative">
                {editingListId === list.id ? (
                  <div className="flex items-center gap-1 px-4 py-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-8 text-sm bg-card border-border"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateList.mutate({ id: list.id, name: editingName });
                        }
                        if (e.key === 'Escape') {
                          setEditingListId(null);
                        }
                      }}
                    />
                    <button onClick={() => updateList.mutate({ id: list.id, name: editingName })} className="p-1 text-green-500">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingListId(null)} className="p-1 text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/app/lists/${list.id}`}
                    data-testid={`nav-list-${list.id}`}
                    className={isActive ? "navItemActive" : "navItem"}
                  >
                    {(() => { const IconComp = getListIcon(list.icon); return <IconComp className={cn("nav-icon", isActive && "text-primary")} weight="duotone" />; })()}
                    {list.name}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className="ml-auto opacity-0 group-hover:opacity-100 p-1.5 rounded-full transition-opacity hover:bg-accent"
                          data-testid={`menu-list-${list.id}`}
                        >
                          <DotsThree className="h-4 w-4" weight="bold" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingListId(list.id);
                            setEditingName(list.name);
                          }}
                        >
                          <PencilSimple className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setListToDelete(list);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-500 focus:text-red-500"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Link>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setCreateDialogOpen(true)}
            className="navItem w-full opacity-60 hover:opacity-100 transition-opacity"
            data-testid="button-add-list"
          >
            <Plus className="nav-icon" weight="bold" />
            <span className="text-xs">New list</span>
          </button>

          <div className="pt-3 pb-1 px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">AI Assistant</span>
          </div>

          {aiAssistantItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={isActive ? "navItemActive" : "navItem"}
              >
                <item.icon className={cn("nav-icon", isActive && "text-primary")} weight="duotone" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-3 pb-1 px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Action Reflect</span>
          </div>

          {actionReflectItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={isActive ? "navItemActive" : "navItem"}
              >
                <item.icon className={cn("nav-icon", isActive && "text-primary")} weight="duotone" />
                {item.label}
              </Link>
            );
          })}

        </nav>

        <div className="space-y-0.5 pt-2 border-t border-border">
          {bottomItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(isActive ? "navItemActive" : "navItem", "text-muted-foreground")}
              >
                <item.icon className={cn("nav-icon", isActive && "text-primary")} weight="duotone" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="pt-2 mt-2 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="w-full px-3 py-1.5 flex items-center gap-2.5 rounded-xl transition-colors cursor-pointer hover:bg-accent"
                data-testid="button-user-menu"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-token">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left flex items-center gap-2">
                  <p className="text-xs font-bold truncate text-foreground" data-testid="text-user-name">{(user.name || "User").split(" ")[0]}</p>
                  {(() => {
                    const isPro = user.subscriptionPlan === "pro" || user.subscriptionPlan === "team";
                    return (
                      <span
                        className={cn(
                          "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none",
                          isPro
                            ? "bg-amber-400/20 text-amber-500 border border-amber-400/30"
                            : "bg-purple-500/15 text-purple-500 border border-purple-400/30"
                        )}
                        data-testid="badge-plan"
                      >
                        {isPro ? "Pro" : "Free"}
                      </span>
                    );
                  })()}
                </div>
                <CaretDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="w-56 rounded-xl"
            >
              <DropdownMenuItem 
                onClick={() => setLocation("/app/guide")}
                className="rounded-lg cursor-pointer"
                data-testid="menu-getting-started"
              >
                <BookOpenText className="h-4 w-4 mr-2 text-primary" weight="duotone" />
                <span className="text-foreground">Getting Started Guide</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={toggleTheme}
                className="rounded-lg cursor-pointer"
                data-testid="menu-theme-toggle"
              >
                {mode === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2 text-amber-400" weight="duotone" />
                    <span className="text-foreground">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2 text-primary" weight="duotone" />
                    <span className="text-foreground">Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/settings")}
                className="rounded-lg cursor-pointer"
                data-testid="menu-settings"
              >
                <GearSix className="h-4 w-4 mr-2 text-muted-foreground" weight="duotone" />
                <span className="text-foreground">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  await logout();
                  window.location.href = "/";
                }}
                className="rounded-lg cursor-pointer text-destructive"
                data-testid="menu-signout"
              >
                <SignOut className="h-4 w-4 mr-2" weight="duotone" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between border-b border-border px-4 py-3 bg-sidebar sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
          <span className="text-lg tracking-tight font-logo">
            <span className="font-bold text-foreground">Action</span>
            <span className="font-normal text-primary">Minutes</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-xl hover:bg-accent transition-colors"
                data-testid="mobile-user-menu"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 rounded-xl"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-bold truncate text-foreground">{user.name}</p>
                <p className="text-xs truncate text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/guide")}
                className="rounded-lg cursor-pointer"
                data-testid="mobile-menu-getting-started"
              >
                <BookOpenText className="h-4 w-4 mr-2 text-primary" weight="duotone" />
                <span className="text-foreground">Getting Started Guide</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={toggleTheme}
                className="rounded-lg cursor-pointer"
                data-testid="mobile-menu-theme-toggle"
              >
                {mode === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2 text-amber-400" weight="duotone" />
                    <span className="text-foreground">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2 text-primary" weight="duotone" />
                    <span className="text-foreground">Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/settings")}
                className="rounded-lg cursor-pointer"
                data-testid="mobile-menu-settings"
              >
                <GearSix className="h-4 w-4 mr-2 text-muted-foreground" weight="duotone" />
                <span className="text-foreground">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={async () => {
                  await logout();
                  window.location.href = "/";
                }}
                className="rounded-lg cursor-pointer text-destructive"
                data-testid="mobile-menu-signout"
              >
                <SignOut className="h-4 w-4 mr-2" weight="duotone" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {[actionToDoItems[0], aiAssistantItems[0], ...actionReflectItems].map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            const isPrimary = (item as any).primary;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`tab-${item.label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isPrimary ? (
                  <div className="flex flex-col items-center -mt-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full transition-all btn-gradient",
                      isActive && "scale-105"
                    )}>
                      <Icon className="h-6 w-6 text-primary-foreground" weight="duotone" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium mt-1",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} weight="duotone" />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
                {isActive && !isPrimary && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full shadow-token" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickAdd isOpen={quickAddOpen} onOpenChange={setQuickAddOpen} />

      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) { setNewListName(""); setNewListIcon(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new list</DialogTitle>
            <DialogDescription>
              Give your list a name and choose an icon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List name</Label>
              <Input
                id="list-name"
                placeholder="e.g., Shopping, Work, Projects..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    createList.mutate({ name: newListName.trim(), icon: newListIcon || undefined });
                  }
                }}
                autoFocus
                data-testid="input-new-list-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2">
                {LIST_ICON_OPTIONS.map((opt) => {
                  const isSelected = newListIcon === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewListIcon(isSelected ? null : opt.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-transparent bg-muted hover:bg-accent text-muted-foreground hover:text-foreground"
                      )}
                      data-testid={`icon-${opt.id}`}
                    >
                      <opt.icon className="h-5 w-5" weight={isSelected ? "fill" : "duotone"} />
                      <span className="text-[10px] font-medium leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setNewListName(""); setNewListIcon(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => newListName.trim() && createList.mutate({ name: newListName.trim(), icon: newListIcon || undefined })} 
              disabled={!newListName.trim()}
              className="bg-primary hover:bg-primary/90"
            >
              Create list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete list?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{listToDelete?.name}"? This will remove all items from the list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setListToDelete(null); }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => listToDelete && deleteList.mutate(listToDelete.id)}
            >
              Delete list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
