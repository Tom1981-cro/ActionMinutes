import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, Bell, BookOpen, SignOut, Sun, Moon, 
  Lifebuoy, BookOpenText, CaretDown, Robot, User, Calendar, Waveform, NotePencil
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useRestartTutorial } from "@/components/tutorial";
import { QuickAdd } from "@/components/quick-add";
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

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, theme, toggleTheme } = useStore();
  const { logout, isAuthenticated, isLoading } = useAuth();
  const restartTutorial = useRestartTutorial();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  const inboxItem = { href: "/app/inbox", label: "Inbox", icon: Tray };
  
  const assistantItems = [
    { href: "/app/capture", label: "Capture", icon: PlusCircle, primary: true },
    { href: "/app/meetings", label: "Meetings", icon: CalendarBlank },
    { href: "/app/transcripts", label: "Transcripts", icon: Waveform },
    { href: "/app/drafts", label: "Drafts", icon: FileText },
  ];

  const personalItems = [
    { href: "/app/reminders", label: "Reminders", icon: Bell },
    { href: "/app/journal", label: "Journal", icon: BookOpen },
    { href: "/app/calendar", label: "Calendar", icon: Calendar },
    { href: "/app/notes", label: "Notes", icon: NotePencil },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!location.startsWith("/login") && location !== "/") {
      setLocation("/login");
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans bg-mesh">
      {/* Desktop Sidebar - Glassmorphism */}
      <aside className={cn(
        "hidden md:flex w-64 flex-col glass-panel border-r p-4 h-screen sticky top-0",
        theme === "light" ? "border-gray-200" : "border-white/10"
      )}>
        <div className="flex items-center gap-2 px-2 mb-4 mt-4">
          <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
          <span className="text-xl tracking-tight">
            <span className={cn("font-bold", theme === "light" ? "text-gray-900" : "text-white")}>Action</span>
            <span className={cn("font-normal", theme === "light" ? "text-violet-600" : "text-violet-300")}>Minutes</span>
          </span>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {(() => {
            const isInboxActive = location === inboxItem.href || location.startsWith(inboxItem.href);
            return (
              <Link 
                href={inboxItem.href}
                data-testid={`nav-${inboxItem.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer mb-4",
                  isInboxActive
                    ? theme === "light"
                      ? "bg-violet-100 text-violet-700 font-semibold border border-violet-300/50"
                      : "bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 shadow-glow-sm"
                    : theme === "light"
                      ? "text-gray-700 hover:bg-gray-100 hover:text-violet-700"
                      : "text-white/70 hover:bg-white/5 hover:text-violet-300"
                )}
              >
                <inboxItem.icon className={cn("h-4 w-4", isInboxActive ? (theme === "light" ? "text-violet-600" : "text-violet-400") : (theme === "light" ? "text-gray-500" : "text-white/50"))} weight="duotone" />
                {inboxItem.label}
              </Link>
            );
          })()}

          <div className="mb-4">
            <div className={cn("flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider", theme === "light" ? "text-gray-500" : "text-white/40")}>
              <Robot weight="duotone" className="h-3 w-3" />
              Assistant
            </div>
            {assistantItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer",
                    isActive
                      ? theme === "light"
                        ? "bg-violet-100 text-violet-700 font-semibold border border-violet-300/50"
                        : "bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 shadow-glow-sm"
                      : theme === "light"
                        ? "text-gray-700 hover:bg-gray-100 hover:text-violet-700"
                        : "text-white/70 hover:bg-white/5 hover:text-violet-300"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? (theme === "light" ? "text-violet-600" : "text-violet-400") : (theme === "light" ? "text-gray-500" : "text-white/50"))} weight="duotone" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-4">
            {personalItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer",
                    isActive
                      ? theme === "light"
                        ? "bg-violet-100 text-violet-700 font-semibold border border-violet-300/50"
                        : "bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 shadow-glow-sm"
                      : theme === "light"
                        ? "text-gray-700 hover:bg-gray-100 hover:text-violet-700"
                        : "text-white/70 hover:bg-white/5 hover:text-violet-300"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? (theme === "light" ? "text-violet-600" : "text-violet-400") : (theme === "light" ? "text-gray-500" : "text-white/50"))} weight="duotone" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={cn("mt-auto pt-4 border-t", theme === "light" ? "border-gray-200" : "border-white/10")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  "w-full px-4 py-2 flex items-center gap-3 rounded-xl transition-colors cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="button-user-menu"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-semibold shadow-glow-sm">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className={cn("text-sm font-bold truncate", theme === "light" ? "text-gray-900" : "text-white")} data-testid="text-user-name">{user.name}</p>
                  <p className={cn("text-xs truncate", theme === "light" ? "text-gray-500" : "text-white/50")} data-testid="text-user-email">{user.email}</p>
                </div>
                <CaretDown className={cn("h-4 w-4 flex-shrink-0", theme === "light" ? "text-gray-400" : "text-white/40")} weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className={cn(
                "w-56 rounded-xl",
                theme === "light" ? "bg-white border-gray-200" : "bg-[#1a1a1a] border-white/10"
              )}
            >
              <DropdownMenuItem 
                onClick={restartTutorial}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="menu-take-tour"
              >
                <Lifebuoy className={cn("h-4 w-4 mr-2", theme === "light" ? "text-fuchsia-500" : "text-fuchsia-400")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Take a Tour</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/guide")}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="menu-getting-started"
              >
                <BookOpenText className={cn("h-4 w-4 mr-2", theme === "light" ? "text-violet-500" : "text-violet-400")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Getting Started Guide</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "light" ? "bg-gray-200" : "bg-white/10"} />
              <DropdownMenuItem 
                onClick={toggleTheme}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="menu-theme-toggle"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2 text-amber-400" weight="duotone" />
                    <span className="text-white/80">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2 text-violet-500" weight="duotone" />
                    <span className="text-gray-700">Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/settings")}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="menu-settings"
              >
                <GearSix className={cn("h-4 w-4 mr-2", theme === "light" ? "text-gray-500" : "text-white/60")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "light" ? "bg-gray-200" : "bg-white/10"} />
              <DropdownMenuItem 
                onClick={async () => {
                  await logout();
                  window.location.href = "/";
                }}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-500/10"
                )}
                data-testid="menu-signout"
              >
                <SignOut className="h-4 w-4 mr-2" weight="duotone" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header - Glassmorphism */}
      <header className="md:hidden flex items-center justify-between border-b border-white/10 px-4 py-3 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
          <span className="text-lg tracking-tight">
            <span className={cn("font-bold", theme === "light" ? "text-gray-900" : "text-white")}>Action</span>
            <span className={cn("font-normal", theme === "light" ? "text-violet-600" : "text-violet-300")}>Minutes</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-xl hover:bg-white/5 transition-colors"
                data-testid="mobile-user-menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-semibold">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className={cn(
                "w-56 rounded-xl",
                theme === "light" ? "bg-white border-gray-200" : "bg-[#1a1a1a] border-white/10"
              )}
            >
              <div className={cn("px-3 py-2 border-b", theme === "light" ? "border-gray-100" : "border-white/10")}>
                <p className={cn("text-sm font-bold truncate", theme === "light" ? "text-gray-900" : "text-white")}>{user.name}</p>
                <p className={cn("text-xs truncate", theme === "light" ? "text-gray-500" : "text-white/50")}>{user.email}</p>
              </div>
              <DropdownMenuItem 
                onClick={restartTutorial}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="mobile-menu-take-tour"
              >
                <Lifebuoy className={cn("h-4 w-4 mr-2", theme === "light" ? "text-fuchsia-500" : "text-fuchsia-400")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Take a Tour</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/guide")}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="mobile-menu-getting-started"
              >
                <BookOpenText className={cn("h-4 w-4 mr-2", theme === "light" ? "text-violet-500" : "text-violet-400")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Getting Started Guide</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "light" ? "bg-gray-200" : "bg-white/10"} />
              <DropdownMenuItem 
                onClick={toggleTheme}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="mobile-menu-theme-toggle"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2 text-amber-400" weight="duotone" />
                    <span className="text-white/80">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2 text-violet-500" weight="duotone" />
                    <span className="text-gray-700">Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation("/app/settings")}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/5"
                )}
                data-testid="mobile-menu-settings"
              >
                <GearSix className={cn("h-4 w-4 mr-2", theme === "light" ? "text-gray-500" : "text-white/60")} weight="duotone" />
                <span className={theme === "light" ? "text-gray-700" : "text-white/80"}>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={theme === "light" ? "bg-gray-200" : "bg-white/10"} />
              <DropdownMenuItem 
                onClick={async () => {
                  await logout();
                  window.location.href = "/";
                }}
                className={cn(
                  "rounded-lg cursor-pointer",
                  theme === "light" ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-500/10"
                )}
                data-testid="mobile-menu-signout"
              >
                <SignOut className="h-4 w-4 mr-2" weight="duotone" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar - Glassmorphism */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16">
          {[inboxItem, ...assistantItems.slice(0, 1), ...personalItems.slice(0, 2)].map((item) => {
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
                  isActive ? "text-violet-400" : "text-white/40"
                )}
              >
                {isPrimary ? (
                  <div className="flex flex-col items-center -mt-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full transition-all btn-gradient",
                      isActive && "scale-105"
                    )}>
                      <Icon className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium mt-1",
                      isActive ? "text-violet-400" : "text-white/50"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon className={cn("h-5 w-5 mb-1", isActive && "text-violet-400")} weight="duotone" />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-violet-400" : "text-white/50"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
                {isActive && !isPrimary && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full shadow-glow-sm" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickAdd />
    </div>
  );
}
