import { Link, useLocation } from "wouter";
import { 
  Inbox, Calendar, PlusCircle, FileText, Settings, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Logo, LogoWordmark } from "@/components/logo";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();

  const navItems = [
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/capture", label: "Capture", icon: PlusCircle, primary: true },
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  if (!user.isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar p-4 h-screen sticky top-0">
        <div className="flex items-center gap-2 px-2 mb-4 mt-4">
          <Logo variant="squircle" size={32} />
          <LogoWordmark size="base" />
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
                  "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-card text-primary shadow-sm font-semibold translate-x-1"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-bold text-foreground" data-testid="text-user-name">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">{user.email}</p>
          </div>
          <Button 
            variant="ghost" 
            data-testid="button-signout"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-full px-4"
            onClick={() => {
              toast({ title: "Logged out (Mock)", description: "Refresh to reset state if needed." });
              window.location.reload();
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile Header - Minimal top bar */}
      <header className="md:hidden flex items-center justify-between border-b px-4 py-3 bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Logo variant="squircle" size={28} />
          <LogoWordmark size="sm" />
        </div>
        <WorkspaceSwitcher />
      </header>

      {/* Main Content - with bottom padding for mobile tab bar */}
      <main className="flex-1 overflow-auto bg-background pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg"
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
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.primary ? (
                  <div className="flex flex-col items-center -mt-4">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all bg-primary text-primary-foreground",
                      isActive && "scale-105"
                    )}>
                      <Icon className="h-6 w-6" />
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
                    <Icon className={cn("h-5 w-5 mb-1", isActive && "text-primary")} />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
                {isActive && !item.primary && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
