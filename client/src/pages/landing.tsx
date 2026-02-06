import { Link } from "wouter";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  Brain, BookOpen, ArrowRight, Sparkle, Bell, Calendar, NotePencil, ListBullets,
  Check, CheckCircle, Tray, Lightning
} from "@phosphor-icons/react";
import logoIcon from "@assets/am_logo_1767300370565.png";
import { useGeoData } from "@/components/stripe-pricing-table";

function TypewriterText({ text, onComplete }: { text: string; onComplete?: () => void }) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setTimeout(() => {
          setShowCursor(false);
          onComplete?.();
        }, 500);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [text, onComplete]);

  return (
    <span>
      {displayText}
      {showCursor && <span className="animate-pulse">|</span>}
    </span>
  );
}

function HeroMockup() {
  const [typingComplete, setTypingComplete] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    if (typingComplete) {
      const timer = setTimeout(() => setShowBadge(true), 300);
      return () => clearTimeout(timer);
    }
  }, [typingComplete]);

  useEffect(() => {
    const resetTimer = setInterval(() => {
      setTypingComplete(false);
      setShowBadge(false);
      setRestart(r => r + 1);
    }, 8000);
    return () => clearInterval(resetTimer);
  }, []);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay: 0.4 }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 rounded-3xl blur-3xl scale-95" />
        
        <div className="relative bg-accent backdrop-blur-xl border border-border rounded-3xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-muted-foreground font-mono">quick_note.txt</span>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <p className="text-muted-foreground leading-relaxed">
              <span className="text-primary/60">You:</span> Need to call the dentist, finish the report...
            </p>
            
            <div className="relative">
              <div className="absolute -inset-2 bg-accent rounded-lg blur-sm" />
              <div className="relative bg-accent border border-primary/40 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" weight="duotone" />
                  <span className="text-xs text-primary font-semibold uppercase tracking-wider">AI Organizing...</span>
                </div>
                <p className="text-primary font-medium min-h-[1.5em]" key={restart}>
                  <TypewriterText 
                    text="Added to your Inbox" 
                    onComplete={() => setTypingComplete(true)}
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={showBadge ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-3 py-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-400" weight="fill" />
                <span className="text-xs text-emerald-300 font-semibold">Tasks Created!</span>
              </div>
            </motion.div>
            <div className="text-xs text-muted-foreground font-mono">organized</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MouseGlow() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="fixed pointer-events-none z-0 w-[500px] h-[500px] rounded-full"
      style={{
        x: springX,
        y: springY,
        translateX: "-50%",
        translateY: "-50%",
        background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
      }}
    />
  );
}

function PricingSection() {
  const { geoData } = useGeoData();
  const isEU = geoData?.isEU || false;
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  
  const prices = isEU ? {
    starter: { monthly: 0, yearly: 0 },
    pro: { monthly: 8, yearly: 76 }
  } : {
    starter: { monthly: 0, yearly: 0 },
    pro: { monthly: 10, yearly: 96 }
  };

  const currencySymbol = isEU ? "€" : "$";
  const currentPrice = billingInterval === 'yearly' ? prices.pro.yearly : prices.pro.monthly;
  const monthlyEquivalent = billingInterval === 'yearly' ? Math.round(prices.pro.yearly / 12 * 10) / 10 : null;

  return (
    <section className="py-24 px-4 relative" id="pricing">
      <div className="container max-w-5xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple Pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Start free, upgrade when you need more.
            {isEU && <span className="block text-sm text-primary mt-2">Prices shown in EUR</span>}
          </p>
          
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                billingInterval === 'monthly' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-accent text-muted-foreground hover:bg-accent'
              }`}
              data-testid="billing-toggle-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                billingInterval === 'yearly' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-accent text-muted-foreground hover:bg-accent'
              }`}
              data-testid="billing-toggle-yearly"
            >
              Yearly
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 items-start max-w-3xl mx-auto">
          <motion.div 
            className="bg-accent backdrop-blur-xl border border-border rounded-3xl p-8 hover:bg-accent transition-all"
            variants={floatUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={0}
          >
            <h3 className="text-xl font-bold text-foreground mb-2">Free</h3>
            <p className="text-muted-foreground text-sm mb-6">Get started with the essentials.</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">{currencySymbol}0</span>
              <span className="text-muted-foreground ml-2">/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Unlimited notes & lists</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Personal reminders</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Daily journal</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>5 AI extractions/month</span>
              </li>
            </ul>

            <Link
              href="/login"
              className="block w-full text-center bg-accent hover:bg-accent border border-border text-foreground py-3 rounded-xl font-semibold transition-all"
              data-testid="pricing-free-cta"
            >
              Start for Free
            </Link>
          </motion.div>

          <motion.div 
            className="relative bg-accent backdrop-blur-xl border-2 border-primary rounded-3xl p-8 hover:bg-accent transition-all md:scale-105 md:-my-4"
            variants={floatUpVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            custom={1}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-2 mt-2">Pro</h3>
            <p className="text-muted-foreground text-sm mb-6">For power users who want it all.</p>
            
            <div className="mb-6">
              <span className="text-4xl font-bold text-foreground">
                {currencySymbol}{currentPrice}
              </span>
              <span className="text-muted-foreground ml-2">/{billingInterval === 'yearly' ? 'year' : 'month'}</span>
              {monthlyEquivalent && (
                <p className="text-sm text-primary mt-1">
                  {currencySymbol}{monthlyEquivalent}/month
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Unlimited AI extractions</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Gmail & Outlook sync</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Calendar integration</span>
              </li>
              <li className="flex items-center gap-3 text-foreground">
                <Check className="h-5 w-5 text-primary flex-shrink-0" weight="bold" />
                <span>Voice transcription</span>
              </li>
            </ul>

            <Link
              href={`/login?plan=pro&interval=${billingInterval}`}
              className="group relative block w-full text-center text-primary-foreground py-3 rounded-xl font-semibold transition-all overflow-hidden"
              data-testid="pricing-pro-cta"
            >
              <span className="absolute inset-0 bg-primary" />
              <span className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative">Get Pro</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const floatUpVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: delay * 0.1,
      ease: "easeOut" as const
    }
  })
};

const features = [
  {
    icon: Tray,
    title: "Smart Inbox",
    description: "Your central hub for everything. Quick-add thoughts, review tasks, and reach inbox zero.",
    color: "violet"
  },
  {
    icon: Brain,
    title: "AI Extraction",
    description: "Paste meeting notes and let AI find action items, decisions, and deadlines automatically.",
    color: "fuchsia",
    highlight: true
  },
  {
    icon: Bell,
    title: "Reminders",
    description: "Organize tasks by when they matter: Today, Tomorrow, Next Week, or Someday.",
    color: "amber"
  },
  {
    icon: BookOpen,
    title: "Journal",
    description: "Capture daily thoughts with AI prompts that help you reflect and plan ahead.",
    color: "emerald"
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "Sync with Google Calendar and Outlook. See your schedule alongside your tasks.",
    color: "blue"
  },
  {
    icon: NotePencil,
    title: "Notes",
    description: "Encrypted notes for anything. Link them together, tag them, search them.",
    color: "pink"
  },
  {
    icon: ListBullets,
    title: "Custom Lists",
    description: "Create your own lists for projects, shopping, goals—whatever you need.",
    color: "indigo"
  },
  {
    icon: Lightning,
    title: "Quick Add",
    description: "Capture thoughts instantly from anywhere with natural language input.",
    color: "orange"
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <MouseGlow />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] translate-x-1/2" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <nav className="max-w-6xl mx-auto bg-accent backdrop-blur-xl border border-border rounded-2xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-9 h-9 rounded-xl" />
              <span className="text-xl tracking-tight font-semibold">
                <span className="text-foreground">Action</span>
                <span className="text-primary">Minutes</span>
              </span>
            </div>
            <Link 
              href="/login" 
              className="relative group bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              data-testid="nav-launch-app"
            >
              <span className="absolute inset-0 bg-primary rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative">Launch App</span>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative pt-36 pb-24 px-4 min-h-screen flex items-center">
        <div className="container max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 bg-accent border border-primary/20 rounded-full px-4 py-1.5 mb-8">
                  <Sparkle className="h-4 w-4 text-primary" weight="fill" />
                  <span className="text-sm text-primary">Your Personal Productivity Assistant</span>
                </div>
              </motion.div>

              <motion.h1 
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Organize{" "}
                <span className="text-primary">
                  Everything.
                </span>
              </motion.h1>

              <motion.p 
                className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                Notes, reminders, journal, calendar—all in one place. 
                Plus AI that turns meeting chaos into{" "}
                <span className="text-foreground font-medium">actionable tasks</span>.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Link 
                  href="/login"
                  className="group relative inline-flex items-center gap-3 text-primary-foreground px-10 py-5 rounded-2xl text-lg font-semibold transition-all"
                  data-testid="hero-start-free"
                >
                  <span className="absolute inset-0 bg-primary rounded-2xl" />
                  <span className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <span className="relative flex items-center gap-3">
                    Start for Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" weight="bold" />
                  </span>
                </Link>
                <p className="mt-4 text-sm text-muted-foreground">No credit card required</p>
              </motion.div>
            </div>

            <HeroMockup />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 relative">
        <div className="container max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Personal productivity tools that work together seamlessly.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses: Record<string, string> = {
                violet: "from-violet-500/20 to-violet-600/20 border-violet-500/20 text-violet-400",
                fuchsia: "from-fuchsia-500/20 to-fuchsia-600/20 border-fuchsia-500/20 text-fuchsia-400",
                amber: "from-amber-500/20 to-amber-600/20 border-amber-500/20 text-amber-400",
                emerald: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/20 text-emerald-400",
                blue: "from-blue-500/20 to-blue-600/20 border-blue-500/20 text-blue-400",
                pink: "from-pink-500/20 to-pink-600/20 border-pink-500/20 text-pink-400",
                indigo: "from-indigo-500/20 to-indigo-600/20 border-indigo-500/20 text-indigo-400",
                orange: "from-orange-500/20 to-orange-600/20 border-orange-500/20 text-orange-400",
              };
              
              return (
                <motion.div 
                  key={feature.title}
                  className={`bg-accent backdrop-blur-sm border rounded-2xl p-6 group hover:bg-accent transition-all duration-300 ${
                    feature.highlight ? 'border-fuchsia-500/40 ring-1 ring-fuchsia-500/20' : 'border-border'
                  }`}
                  variants={floatUpVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  custom={index}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[feature.color]} border rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${colorClasses[feature.color].split(' ').pop()}`} weight="duotone" />
                  </div>
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    {feature.title}
                    {feature.highlight && (
                      <span className="text-xs bg-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded-full">AI</span>
                    )}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 relative">
        <div className="container max-w-4xl mx-auto">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              From thought to done in seconds.
            </p>
          </motion.div>

          <div className="relative">
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/30 to-primary/50 md:-translate-x-1/2" />

            <motion.div 
              className="relative flex items-center mb-16 md:mb-24"
              variants={floatUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-primary rounded-full md:-translate-x-1/2 ring-4 ring-ring/20" />
              <div className="ml-20 md:ml-0 md:w-1/2 md:pr-16 md:text-right">
                <div className="text-primary font-bold text-sm mb-2 uppercase tracking-wider">Step 1</div>
                <h3 className="text-2xl font-bold mb-2">Capture</h3>
                <p className="text-muted-foreground">
                  Quick-add thoughts, paste notes, upload photos, or record voice. Everything lands in your Inbox.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="relative flex items-center mb-16 md:mb-24"
              variants={floatUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-fuchsia-500 rounded-full md:-translate-x-1/2 ring-4 ring-fuchsia-500/20" />
              <div className="ml-20 md:ml-auto md:w-1/2 md:pl-16">
                <div className="text-fuchsia-400 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</div>
                <h3 className="text-2xl font-bold mb-2">Organize</h3>
                <p className="text-muted-foreground">
                  Review your inbox. Move items to reminders, add to lists, or let AI extract tasks from meeting notes.
                </p>
              </div>
            </motion.div>

            <motion.div 
              className="relative flex items-center"
              variants={floatUpVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={2}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-primary rounded-full md:-translate-x-1/2 ring-4 ring-ring/20" />
              <div className="ml-20 md:ml-0 md:w-1/2 md:pr-16 md:text-right">
                <div className="text-primary font-bold text-sm mb-2 uppercase tracking-wider">Step 3</div>
                <h3 className="text-2xl font-bold mb-2">Execute</h3>
                <p className="text-muted-foreground">
                  Check off tasks, reflect in your journal, and watch your productivity soar.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <PricingSection />

      <section className="py-24 px-4 relative">
        <div className="container max-w-4xl mx-auto">
          <motion.div 
            className="relative text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />
            <div className="relative bg-accent backdrop-blur-xl border border-border rounded-3xl p-12 md:p-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Your productivity, organized.
              </h2>
              <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">
                Start capturing thoughts and organizing your life today.
              </p>
              <Link 
                href="/login"
                className="group relative inline-flex items-center gap-3 text-primary-foreground px-10 py-5 rounded-2xl text-lg font-semibold transition-all"
                data-testid="final-cta-start"
              >
                <span className="absolute inset-0 bg-primary rounded-2xl" />
                <span className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <span className="relative flex items-center gap-3">
                  Get Started Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" weight="bold" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t border-border relative">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
              <span className="text-sm text-muted-foreground">
                ActionMinutes by{" "}
                <a 
                  href="https://relay-labs.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary transition-colors"
                >
                  Relay Labs
                </a>
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/support" className="hover:text-foreground transition-colors">
                Support
              </Link>
              <Link href="/guide" className="hover:text-foreground transition-colors">
                Guide
              </Link>
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
