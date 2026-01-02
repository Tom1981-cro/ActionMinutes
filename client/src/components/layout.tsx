import { Link, useLocation } from "wouter";
import { 
  Tray, CalendarBlank, PlusCircle, FileText, GearSix, SignOut, Bell, BookOpen 
} from "@phosphor-icons/react";
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
  const { user, currentWorkspaceId } = useStore();
  const { logout } = useAuth();

  const isPersonalMode = currentWorkspaceId === null && user.enablePersonal;

  const personalNavItems = [
    { href: "/inbox", label: "Inbox", icon: Tray },
    { href: "/reminders", label: "Reminders", icon: Bell, primary: true },
    { href: "/journal", label: "Journal", icon: BookOpen },
  ];

  const teamNavItems = [
    { href: "/inbox", label: "Inbox", icon: Tray },
    { href: "/meetings", label: "Meetings", icon: CalendarBlank },
    { href: "/capture", label: "Capture", icon: PlusCircle, primary: true },
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/settings", label: "Settings", icon: GearSix },
  ];

  const navItems = isPersonalMode ? personalNavItems : teamNavItems;
  const showPersonalSettingsLink = isPersonalMode || (currentWorkspaceId === null && !user.enablePersonal);

  if (!user.isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-100 bg-white p-4 h-screen sticky top-0">
        <div className="flex items-center gap-2 px-2 mb-4 mt-4">
          <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
          <span className="text-xl tracking-tight text-slate-900">
            <span className="font-bold">Action</span><span className="font-normal">Minutes</span>
          </span>
        </div>

        <div className="mb-6 px-2">
          <WorkspaceSwitcher />
        </div>

        <nav className="space-y-1 flex-1">
          <p className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isPersonalMode ? "Personal" : "Work"}
          </p>
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-indigo-50 text-indigo-600 font-semibold"
                    : "text-slate-600 hover:bg-gray-50 hover:text-indigo-600"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-indigo-500" : "text-slate-400")} weight="duotone" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-bold text-slate-900" data-testid="text-user-name">{user.name}</p>
            <p className="text-xs text-slate-500 truncate" data-testid="text-user-email">{user.email}</p>
          </div>
          {showPersonalSettingsLink && (
            <Link 
              href="/settings"
              data-testid="nav-settings-personal"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer mb-1",
                location === "/settings"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-gray-50 hover:text-indigo-600"
              )}
            >
              <GearSix className="h-4 w-4" weight="duotone" />
              Settings
            </Link>
          )}
          <Button 
            variant="ghost" 
            data-testid="button-signout"
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg px-4"
            onClick={async () => {
              await logout();
              setLocation("/");
            }}
          >
            <SignOut className="h-4 w-4 mr-2" weight="duotone" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
          <span className="text-lg tracking-tight text-slate-900">
            <span className="font-bold">Action</span><span className="font-normal">Minutes</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <WorkspaceSwitcher />
          {showPersonalSettingsLink && (
            <Link 
              href="/settings"
              data-testid="mobile-settings-personal"
              className={cn(
                "p-2 rounded-lg transition-colors",
                location === "/settings"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-400 hover:bg-gray-50 hover:text-indigo-600"
              )}
            >
              <GearSix className="h-5 w-5" weight="duotone" />
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
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
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              >
                {item.primary ? (
                  <div className="flex flex-col items-center -mt-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full shadow-lg shadow-indigo-500/30 transition-all btn-gradient",
                      isActive && "scale-105"
                    )}>
                      <Icon className="h-6 w-6 text-white" weight="duotone" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium mt-1",
                      isActive ? "text-indigo-600" : "text-slate-500"
                    )}>
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <>
                    <Icon className={cn("h-5 w-5 mb-1", isActive && "text-indigo-500")} weight="duotone" />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-indigo-600" : "text-slate-500"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
                {isActive && !item.primary && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
