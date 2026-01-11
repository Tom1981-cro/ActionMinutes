import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, Bell, BookOpen, SignOut, Sun, Moon 
} from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import logoIcon from "@assets/am_logo_1767300370565.png";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, currentWorkspaceId, theme, toggleTheme } = useStore();
  const { logout, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [theme]);

  const isPersonalMode = currentWorkspaceId === null && user.enablePersonal;

  const personalNavItems = [
    { href: "/app/reminders", label: "Reminders", icon: Bell, primary: true },
    { href: "/app/journal", label: "Journal", icon: BookOpen },
    { href: "/app/settings", label: "Settings", icon: GearSix },
  ];

  const teamNavItems = [
    { href: "/app/inbox", label: "Inbox", icon: Tray },
    { href: "/app/meetings", label: "Meetings", icon: CalendarBlank },
    { href: "/app/capture", label: "Capture", icon: PlusCircle, primary: true },
    { href: "/app/drafts", label: "Drafts", icon: FileText },
    { href: "/app/settings", label: "Settings", icon: GearSix },
  ];

  const navItems = isPersonalMode ? personalNavItems : teamNavItems;

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

        <div className="mb-6 px-2">
          <WorkspaceSwitcher />
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
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
        </nav>

        <div className={cn("mt-auto pt-4 border-t", theme === "light" ? "border-gray-200" : "border-white/10")}>
          <div className="px-4 py-2 mb-2 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-semibold shadow-glow-sm">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-bold truncate", theme === "light" ? "text-gray-900" : "text-white")} data-testid="text-user-name">{user.name}</p>
              <p className={cn("text-xs truncate", theme === "light" ? "text-gray-500" : "text-white/50")} data-testid="text-user-email">{user.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            data-testid="button-theme-toggle"
            className={cn(
              "w-full justify-start rounded-xl px-4 mb-1",
              theme === "light" ? "text-gray-600 hover:bg-gray-100 hover:text-violet-700" : "text-white/50 hover:text-violet-300 hover:bg-white/5"
            )}
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 mr-2" weight="duotone" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2" weight="duotone" />
                Dark mode
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            data-testid="button-signout"
            className={cn(
              "w-full justify-start rounded-xl px-4",
              theme === "light" ? "text-gray-600 hover:text-red-600 hover:bg-red-50" : "text-white/50 hover:text-red-400 hover:bg-red-500/10"
            )}
            onClick={async () => {
              await logout();
              window.location.href = "/";
            }}
          >
            <SignOut className="h-4 w-4 mr-2" weight="duotone" />
            Sign out
          </Button>
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
          <button
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-xl transition-colors",
              theme === "light" 
                ? "text-gray-500 hover:bg-gray-100 hover:text-violet-600" 
                : "text-white/50 hover:bg-white/5 hover:text-violet-300"
            )}
            data-testid="mobile-theme-toggle"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" weight="duotone" />
            ) : (
              <Moon className="h-5 w-5" weight="duotone" />
            )}
          </button>
          <button
            onClick={async () => {
              await logout();
              window.location.href = "/";
            }}
            className="p-1 rounded-xl hover:bg-white/5 transition-colors"
            data-testid="mobile-signout"
            title="Sign out"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-semibold">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
          </button>
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
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
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
                {item.primary ? (
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
                {isActive && !item.primary && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-500 rounded-full shadow-glow-sm" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
