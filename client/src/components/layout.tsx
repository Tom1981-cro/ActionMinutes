import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, Bell, BookOpen, SignOut,
  BookOpenText, CaretDown, CaretRight, Robot, User, Calendar, Waveform, NotePencil, ListBullets, Plus, PencilSimple, Check, X, DotsThree, Trash, Lightning,
  CheckCircle, Archive, MagnifyingGlass, Compass, Crosshair, Tag,
  House, Briefcase, UsersThree, Heart, GraduationCap, PaintBrush, Flower, Barbell, ChatCircle, UserCircle
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth, authenticatedFetch } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { QuickAdd } from "@/components/quick-add";
import { SearchModal } from "@/components/search-modal";
import SettingsModal, { type TabId as SettingsTabId } from "@/pages/settings";
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

const sidebarNavItems: { href: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/app/planner", label: "Planner", icon: Compass },
  { href: "/app/inbox", label: "Inbox", icon: Tray },
  { href: "/app/capture", label: "Capture", icon: PlusCircle },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/journal", label: "Journal", icon: BookOpen },
  { href: "/app/notes", label: "Notes", icon: NotePencil },
  { href: "/app/reminders", label: "Reminders", icon: Bell },
  { href: "/app/focus", label: "Focus Ring", icon: Crosshair },
  { href: "/app/verbs", label: "Action Verbs", icon: Tag },
];

const mobileTabItems: { href: string; label: string; icon: PhosphorIcon }[] = [
  { href: "/app/planner", label: "Planner", icon: Compass },
  { href: "/app/inbox", label: "Inbox", icon: Tray },
  { href: "/app/capture", label: "Capture", icon: PlusCircle },
  { href: "/app/calendar", label: "Calendar", icon: Calendar },
  { href: "/app/journal", label: "Journal", icon: BookOpen },
  { href: "/app/notes", label: "Notes", icon: NotePencil },
  { href: "/app/reminders", label: "Reminders", icon: Bell },
  { href: "/app/focus", label: "Focus", icon: Crosshair },
  { href: "/app/verbs", label: "Verbs", icon: Tag },
];

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useStore();
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabId | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setSettingsTab(detail.tab);
      setSettingsOpen(true);
    };
    window.addEventListener("open-settings", handler);
    return () => window.removeEventListener("open-settings", handler);
  }, []);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!location.startsWith("/login") && location !== "/") {
      setLocation("/login");
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const activeLabel = sidebarNavItems.find(n => 
    location === n.href || (n.href !== "/" && location.startsWith(n.href))
  )?.label || "ActionMinutes";

  return (
    <div className="min-h-screen bg-[#f9fafb] flex font-sans text-[#1A1A1A]">

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col flex-shrink-0 h-screen sticky top-0 z-20 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <Link href="/app/planner" className="flex items-center space-x-3" data-testid="nav-logo">
            <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg shadow-md" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">ActionMinutes</h1>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "w-full flex items-center px-3 py-2.5 rounded-xl transition-all",
                  isActive
                    ? "bg-violet-50 text-violet-700 font-bold shadow-sm border border-violet-100"
                    : "text-gray-600 font-semibold hover:bg-gray-50 border border-transparent"
                )}
              >
                <Icon className={cn("w-4 h-4 mr-3", isActive ? "text-violet-600" : "text-gray-400")} weight={isActive ? "fill" : "regular"} />
                <span className="text-[13px]">{item.label}</span>
              </Link>
            );
          })}

          {customLists.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Lists</p>
              {customLists.map((list) => {
                const IconComp = getListIcon(list.icon);
                const isActive = location === `/app/lists/${list.id}`;
                return (
                  <Link
                    key={list.id}
                    href={`/app/lists/${list.id}`}
                    data-testid={`nav-list-${list.id}`}
                    className={cn(
                      "w-full flex items-center px-3 py-2.5 rounded-xl transition-all",
                      isActive
                        ? "bg-violet-50 text-violet-700 font-bold shadow-sm border border-violet-100"
                        : "text-gray-600 font-semibold hover:bg-gray-50 border border-transparent"
                    )}
                  >
                    <IconComp className={cn("w-4 h-4 mr-3", isActive ? "text-violet-600" : "text-gray-400")} weight={isActive ? "fill" : "regular"} />
                    <span className="text-[13px] flex-1">{list.name}</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="w-full flex items-center px-3 py-2.5 rounded-xl text-gray-400 font-semibold hover:bg-gray-50 border border-transparent transition-all"
              data-testid="nav-create-list"
            >
              <Plus className="w-4 h-4 mr-3" />
              <span className="text-[13px]">New List</span>
            </button>
          </div>

          <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
            <Link
              href="/app/actioned"
              data-testid="nav-actioned"
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-xl transition-all text-[13px]",
                location === "/app/actioned"
                  ? "bg-violet-50 text-violet-700 font-bold"
                  : "text-gray-400 font-semibold hover:bg-gray-50 hover:text-gray-600"
              )}
            >
              <CheckCircle className="w-4 h-4 mr-3" weight={location === "/app/actioned" ? "fill" : "regular"} />
              Actioned
            </Link>
            <Link
              href="/app/deleted"
              data-testid="nav-deleted"
              className={cn(
                "w-full flex items-center px-3 py-2 rounded-xl transition-all text-[13px]",
                location === "/app/deleted"
                  ? "bg-violet-50 text-violet-700 font-bold"
                  : "text-gray-400 font-semibold hover:bg-gray-50 hover:text-gray-600"
              )}
            >
              <Trash className="w-4 h-4 mr-3" weight={location === "/app/deleted" ? "fill" : "regular"} />
              Deleted
            </Link>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-3 flex-1 text-left hover:bg-gray-100 rounded-xl p-1.5 -m-1.5 transition-colors" data-testid="button-user-menu">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-600 flex-1 truncate">{user.name || "User"}</span>
                  <CaretDown className="h-3 w-3 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900" data-testid="text-user-name">{user.name || "User"}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={() => setSearchOpen(true)} className="cursor-pointer" data-testid="menu-search">
                  <MagnifyingGlass className="h-4 w-4 mr-2 text-gray-400" />
                  Search
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuickAddOpen(true)} className="cursor-pointer" data-testid="menu-quickadd">
                  <Lightning className="h-4 w-4 mr-2 text-violet-500" weight="fill" />
                  Quick Add
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/app/guide")} className="cursor-pointer" data-testid="menu-getting-started">
                  <BookOpenText className="h-4 w-4 mr-2 text-gray-400" />
                  Getting Started
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer" data-testid="menu-settings">
                  <GearSix className="h-4 w-4 mr-2 text-gray-400" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    window.location.href = "/";
                  }}
                  className="cursor-pointer text-red-500"
                  data-testid="menu-signout"
                >
                  <SignOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">

        {/* MOBILE HEADER */}
        <header className="md:hidden bg-white px-6 pt-3 pb-3 flex justify-between items-center shadow-sm z-10 sticky top-0">
          <h1 className="text-xl font-bold text-gray-900">{activeLabel}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="p-2 bg-violet-500 text-white rounded-lg shadow-sm"
              data-testid="mobile-quickadd"
            >
              <Plus className="w-4 h-4" weight="bold" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700" data-testid="mobile-user-menu">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user.name || "User"}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <DropdownMenuItem onClick={() => setSearchOpen(true)} className="cursor-pointer">
                  <MagnifyingGlass className="h-4 w-4 mr-2 text-gray-400" />
                  Search
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/app/actioned")} className="cursor-pointer">
                  <CheckCircle className="h-4 w-4 mr-2 text-gray-400" />
                  Actioned
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/app/deleted")} className="cursor-pointer">
                  <Trash className="h-4 w-4 mr-2 text-gray-400" />
                  Deleted
                </DropdownMenuItem>
                {customLists.map((list) => {
                  const IconComp = getListIcon(list.icon);
                  return (
                    <DropdownMenuItem key={list.id} onClick={() => setLocation(`/app/lists/${list.id}`)} className="cursor-pointer">
                      <IconComp className="h-4 w-4 mr-2 text-gray-400" />
                      {list.name}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="cursor-pointer">
                  <GearSix className="h-4 w-4 mr-2 text-gray-400" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    window.location.href = "/";
                  }}
                  className="cursor-pointer text-red-500"
                >
                  <SignOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="animate-in fade-in duration-300 h-full">
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 pb-[env(safe-area-inset-bottom,0px)] pt-2 z-50"
      >
        <div className="flex overflow-x-auto hide-scrollbar space-x-1 px-2 pb-2">
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`tab-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[68px] p-2 rounded-2xl transition-all flex-shrink-0",
                  isActive
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-gray-400 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("w-5 h-5 mb-1", isActive ? "text-white" : "text-gray-400")} weight={isActive ? "fill" : "regular"} />
                <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <QuickAdd isOpen={quickAddOpen} onOpenChange={setQuickAddOpen} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      {settingsOpen && <SettingsModal open={settingsOpen} onOpenChange={(v) => { setSettingsOpen(v); if (!v) setSettingsTab(undefined); }} initialTab={settingsTab} />}

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
                        "flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-transparent bg-[#F5F5F0] hover:bg-[#E5E5E0] text-[#6B7280] hover:text-[#1A1A1A]"
                      )}
                      data-testid={`icon-${opt.id}`}
                    >
                      <opt.icon className="h-5 w-5" weight={isSelected ? "fill" : "regular"} />
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
