import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Inbox, Calendar, PlusCircle, FileText, Settings, 
  Menu, X, CheckCircle, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, login } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const navItems = [
    { href: "/inbox", label: "Inbox", icon: Inbox },
    { href: "/meetings", label: "Meetings", icon: Calendar },
    { href: "/capture", label: "Capture", icon: PlusCircle },
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
        <div className="flex items-center gap-2 px-2 mb-8 mt-4">
          {/* System 2 Logo Style */}
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg shadow-primary/30">
            A
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">ActionMinutes</span>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-white text-teal-600 shadow-sm font-semibold translate-x-1"
                    : "text-muted-foreground hover:bg-stone-200/50 hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-teal-500" : "text-stone-400")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-border/50">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-bold text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button 
            variant="ghost" 
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

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between border-b p-4 bg-background sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md">
            A
          </div>
          <span className="font-bold text-lg text-foreground">ActionMinutes</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-40 bg-background border-t p-4 animate-in slide-in-from-top-5">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full text-base font-medium transition-colors cursor-pointer",
                  location === item.href
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50"
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-stone-50/50">
        <div className="container max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
