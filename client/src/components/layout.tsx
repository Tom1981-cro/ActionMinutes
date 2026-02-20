import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, Bell, BookOpen, SignOut,
  BookOpenText, CaretDown, CaretRight, Robot, User, Calendar, Waveform, NotePencil, ListBullets, Plus, PencilSimple, Check, X, DotsThree, Trash, Lightning,
  CheckCircle, Archive, MagnifyingGlass, Compass,
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

  const navLinks = [
    { href: "/app/inbox", label: "Inbox", icon: Tray },
    { href: "/app/capture", label: "Capture", icon: PlusCircle },
    { href: "/app/meetings", label: "Meetings", icon: CalendarBlank },
    { href: "/app/calendar", label: "Calendar", icon: Calendar },
    { href: "/app/journal", label: "Journal", icon: BookOpen },
    { href: "/app/notes", label: "Notes", icon: NotePencil },
  ];

  const mobileTabItems = [
    { href: "/app/inbox", label: "Inbox", icon: Tray },
    { href: "/app/capture", label: "Capture", icon: PlusCircle },
    { href: "/app/calendar", label: "Calendar", icon: Calendar },
    { href: "/app/journal", label: "Journal", icon: BookOpen },
    { href: "/app/notes", label: "Notes", icon: NotePencil },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!location.startsWith("/login") && location !== "/") {
      setLocation("/login");
    }
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5E5E0]">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Logo */}
          <Link href="/app/planner" className="flex items-center gap-2" data-testid="nav-logo">
            <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
            <span className="text-lg font-semibold tracking-tight hidden sm:inline">
              <span className="text-[#1A1A1A]">Action</span>
              <span className="text-violet-500">Minutes</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
            {navLinks.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-violet-50 text-violet-700"
                      : "text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F5F0]"
                  )}
                >
                  <item.icon className="h-4 w-4" weight={isActive ? "fill" : "regular"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-[#1A1A1A] text-sm font-semibold hover:bg-violet-600 transition-colors"
              data-testid="nav-addaction"
            >
              <Lightning className="h-4 w-4" weight="fill" />
              <span className="hidden sm:inline">Add</span>
            </button>

            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F5F0] transition-colors"
              data-testid="nav-search"
              title="Search (Ctrl+F)"
            >
              <MagnifyingGlass className="h-4 w-4" weight="bold" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#F5F5F0] transition-colors"
                  data-testid="button-user-menu"
                >
                  <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-[#1A1A1A] text-xs font-semibold">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <CaretDown className="h-3 w-3 text-[#9CA3AF] hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b border-[#E5E5E0]">
                  <p className="text-sm font-semibold text-[#1A1A1A]" data-testid="text-user-name">{user.name || "User"}</p>
                  <p className="text-xs text-[#9CA3AF]">{user.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => setLocation("/app/planner")}
                  className="cursor-pointer"
                  data-testid="menu-planner"
                >
                  <Compass className="h-4 w-4 mr-2 text-violet-500" />
                  Planner
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/app/reminders")}
                  className="cursor-pointer"
                  data-testid="menu-reminders"
                >
                  <Bell className="h-4 w-4 mr-2 text-[#9CA3AF]" />
                  Reminders
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/app/actioned")}
                  className="cursor-pointer"
                  data-testid="menu-actioned"
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-[#9CA3AF]" />
                  Actioned
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/app/deleted")}
                  className="cursor-pointer"
                  data-testid="menu-deleted"
                >
                  <Trash className="h-4 w-4 mr-2 text-[#9CA3AF]" />
                  Deleted
                </DropdownMenuItem>
                {customLists.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {customLists.map((list) => {
                      const IconComp = getListIcon(list.icon);
                      return (
                        <DropdownMenuItem
                          key={list.id}
                          onClick={() => setLocation(`/app/lists/${list.id}`)}
                          className="cursor-pointer"
                          data-testid={`menu-list-${list.id}`}
                        >
                          <IconComp className="h-4 w-4 mr-2 text-[#9CA3AF]" />
                          {list.name}
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCreateDialogOpen(true)}
                  className="cursor-pointer"
                  data-testid="menu-create-list"
                >
                  <Plus className="h-4 w-4 mr-2 text-violet-500" />
                  New List
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setLocation("/app/guide")}
                  className="cursor-pointer"
                  data-testid="menu-getting-started"
                >
                  <BookOpenText className="h-4 w-4 mr-2 text-[#9CA3AF]" />
                  Getting Started
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer"
                  data-testid="menu-settings"
                >
                  <GearSix className="h-4 w-4 mr-2 text-[#9CA3AF]" />
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
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className={cn(
          "mx-auto p-6 animate-in fade-in duration-300",
          location === '/app/calendar' ? "max-w-full" : "max-w-4xl"
        )}>
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E5E0]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-14">
          {mobileTabItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`tab-${item.label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors",
                  isActive ? "text-violet-500" : "text-[#9CA3AF]"
                )}
              >
                <Icon className="h-5 w-5 mb-0.5" weight={isActive ? "fill" : "regular"} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

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
