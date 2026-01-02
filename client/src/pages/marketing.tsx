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
    <div className="min-h-screen bg-stone-50 text-slate-700 font-sans selection:bg-teal-100 selection:text-teal-900">
      <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <nav className="bg-white/90 backdrop-blur-xl border border-stone-200 shadow-soft rounded-full px-6 py-3 pointer-events-auto flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 mr-4 cursor-pointer">
            <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-slate-800 tracking-tight">ActionMinutes</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-slate-600 hover:text-teal-600 transition-colors">Features</a>
            <a href="#pricing" className="text-slate-600 hover:text-teal-600 transition-colors">Pricing</a>
          </div>

          <div className="hidden md:flex items-center gap-3 ml-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="btn-gradient text-white rounded-full px-5">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 text-sm font-semibold mb-4 border border-teal-100">
              <Sparkles className="w-4 h-4" />
              Minutes → Actions → Follow-ups
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-800 leading-tight">
              Turn messy notes into <br />
              <span className="text-gradient">calm, clear actions.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto">
              ActionMinutes automates post-meeting cleanup. We convert raw notes into structured action items, 
              follow-up drafts, and summaries in under 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="btn-gradient text-white rounded-full px-8 shadow-lg shadow-indigo-500/30">
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
              <div key={i} className="bg-white rounded-2xl p-6 shadow-soft border border-stone-100 text-center hover:shadow-lift transition-shadow">
                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-teal-600" />
                </div>
                <div className="font-semibold text-slate-800">{item.value}</div>
                <div className="text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="py-20 px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Everything you need to stay on top
              </h2>
              <p className="text-lg text-slate-500">
                From capture to follow-up, ActionMinutes handles the busywork so you can focus on what matters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, i) => {
                const colorClasses: Record<string, string> = {
                  indigo: "bg-indigo-50 text-indigo-600",
                  purple: "bg-purple-50 text-purple-600",
                  teal: "bg-teal-50 text-teal-600",
                  green: "bg-green-50 text-green-600",
                  amber: "bg-amber-50 text-amber-600",
                  rose: "bg-rose-50 text-rose-600",
                };
                return (
                  <div 
                    key={i} 
                    className="bg-stone-50 rounded-2xl p-8 border border-stone-100 hover:shadow-soft transition-shadow"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-5", colorClasses[feature.color])}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mb-3">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              "Finally, a tool that respects my workflow"
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-2xl mx-auto">
              ActionMinutes doesn't try to replace your tools. It generates drafts in your email client, 
              exports to your calendar, and stays out of your way.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                A
              </div>
              <div className="text-left">
                <div className="font-semibold">Alex Chen</div>
                <div className="text-indigo-200 text-sm">Product Manager</div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4 sm:px-6 bg-stone-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-slate-500">
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
                      ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 scale-105" 
                      : "bg-white border border-stone-200 shadow-soft"
                  )}
                >
                  <div className="mb-6">
                    <h3 className={cn("text-xl font-semibold mb-2", plan.highlighted ? "text-white" : "text-slate-800")}>
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-4xl font-bold", plan.highlighted ? "text-white" : "text-slate-800")}>
                        {plan.price}
                      </span>
                      <span className={cn("text-sm", plan.highlighted ? "text-indigo-200" : "text-slate-500")}>
                        /{plan.period}
                      </span>
                    </div>
                    <p className={cn("text-sm mt-2", plan.highlighted ? "text-indigo-200" : "text-slate-500")}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check className={cn("w-5 h-5 flex-shrink-0", plan.highlighted ? "text-teal-300" : "text-teal-500")} />
                        <span className={cn("text-sm", plan.highlighted ? "text-indigo-100" : "text-slate-600")}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={cn(
                      "w-full rounded-full",
                      plan.highlighted 
                        ? "bg-white text-indigo-600 hover:bg-indigo-50" 
                        : "btn-gradient text-white"
                    )}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
              Ready to turn chaos into calm?
            </h2>
            <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who've reclaimed their post-meeting time. 
              Start free, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="btn-gradient text-white rounded-full px-8 shadow-lg shadow-indigo-500/30">
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

      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
              <span className="font-bold tracking-tight">ActionMinutes</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <p className="text-slate-500 text-sm">
              System 2 Design • Calm & Focused
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
