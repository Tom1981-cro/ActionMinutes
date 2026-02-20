import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Zap, 
  Users, 
  Calendar, 
  Mail, 
  Shield, 
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen,
  Bell
} from "lucide-react";
import logoIcon from "@assets/am_logo_1767300370565.png";

const features = [
  {
    icon: Zap,
    title: "60-Second Extraction",
    description: "AI parses your notes and extracts action items with owners and due dates instantly.",
    color: "indigo",
  },
  {
    icon: Users,
    title: "Team Workspaces",
    description: "Collaborate with role-based permissions. Admins, members, and guests with appropriate access.",
    color: "purple",
  },
  {
    icon: Mail,
    title: "Email Drafts",
    description: "Auto-generate follow-up emails. Connect Gmail or Outlook—we create drafts, you send.",
    color: "teal",
  },
  {
    icon: Calendar,
    title: "Calendar Export",
    description: "Export reminders and due dates as ICS files. Works with any calendar app.",
    color: "green",
  },
  {
    icon: BookOpen,
    title: "Personal Journal",
    description: "Private space for reflection with AI-powered prompts and signal detection.",
    color: "amber",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Kanban-style board with time buckets: Today, Tomorrow, Next Week, and beyond.",
    color: "rose",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals getting started",
    features: [
      "5 meetings per month",
      "Basic action extraction",
      "Personal journal",
      "Reminders board",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "per month",
    description: "For power users and small teams",
    features: [
      "Unlimited meetings",
      "Advanced AI extraction",
      "Gmail & Outlook integration",
      "Calendar export",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$29",
    period: "per user/month",
    description: "For growing organizations",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Role-based permissions",
      "Audit logging",
      "SSO (coming soon)",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-foreground">
      <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <nav className="bg-card/90 backdrop-blur-xl border border-border rounded-full px-6 py-3 pointer-events-auto flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 mr-4 cursor-pointer">
            <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-foreground tracking-tight font-logo">ActionMinutes</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-primary-foreground rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-primary text-sm font-semibold mb-4 border border-border">
              <Sparkles className="w-4 h-4" />
              Minutes → Actions → Follow-ups
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Turn messy notes into <br />
              <span className="text-primary font-bold">calm, clear actions.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              ActionMinutes automates post-meeting cleanup. We convert raw notes into structured action items, 
              follow-up drafts, and summaries in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="text-primary-foreground rounded-full px-8 shadow-lg">
                  Start Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Clock, label: "60 sec extraction", value: "AI-powered" },
              { icon: Shield, label: "Your data stays yours", value: "Private & secure" },
              { icon: Check, label: "No credit card", value: "Free to start" },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl p-6 border border-border text-center transition-shadow">
                <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-semibold text-foreground">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Everything you need to stay on top
              </h2>
              <p className="text-lg text-muted-foreground">
                From capture to follow-up, ActionMinutes handles the busywork so you can focus on what matters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => {
                const colorClasses: Record<string, string> = {
                  indigo: "bg-accent text-primary",
                  purple: "bg-accent text-primary",
                  teal: "bg-accent text-primary",
                  green: "bg-green-50 text-green-600",
                  amber: "bg-amber-50 text-amber-600",
                  rose: "bg-accent text-primary",
                };
                return (
                  <div 
                    key={i} 
                    className="bg-muted rounded-2xl p-8 border border-border transition-shadow"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5", colorClasses[feature.color])}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              "Finally, a tool that respects my workflow"
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              ActionMinutes doesn't try to replace your tools. It generates drafts in your email client, 
              exports to your calendar, and stays out of your way.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-xl font-bold text-primary">
                A
              </div>
              <div className="text-left">
                <div className="font-semibold">Alex Chen</div>
                <div className="text-primary-foreground/70 text-sm">Product Manager</div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 sm:px-6 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free, upgrade when you're ready. No hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <div 
                  key={i}
                  className={cn(
                    "rounded-2xl p-8 transition-shadow",
                    plan.highlighted 
                      ? "bg-primary text-primary-foreground shadow-xl scale-105" 
                      : "bg-card border border-border"
                  )}
                >
                  <div className="mb-6">
                    <h3 className={cn("text-xl font-semibold mb-2", plan.highlighted ? "text-primary-foreground" : "text-foreground")}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-4xl font-bold", plan.highlighted ? "text-primary-foreground" : "text-foreground")}>
                        {plan.price}
                      </span>
                      <span className={cn("text-sm", plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        /{plan.period}
                      </span>
                    </div>
                    <p className={cn("text-sm mt-2", plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check className={cn("w-5 h-5 flex-shrink-0", plan.highlighted ? "text-primary-foreground" : "text-primary")} />
                        <span className={cn("text-sm", plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={cn(
                      "w-full rounded-full",
                      plan.highlighted 
                        ? "bg-background text-primary hover:bg-accent" 
                        : "text-primary-foreground"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to turn chaos into calm?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who've reclaimed their post-meeting time. 
              Start free, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="text-primary-foreground rounded-full px-8 shadow-lg">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/store-screens">
                <Button size="lg" variant="outline" className="rounded-full px-8">
                  View App Screenshots
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-secondary text-secondary-foreground py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
              <span className="font-bold tracking-tight font-logo">ActionMinutes</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-muted-foreground text-sm">
              System 2 Design • Calm & Focused
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
