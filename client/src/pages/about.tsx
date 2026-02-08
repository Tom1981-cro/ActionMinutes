import { Link } from "wouter";
import { ArrowLeft, Heart, Lightning, Shield, Target, Users } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "@/lib/motion-shim";
import logoIcon from "@assets/am_logo_1767300370565.png";

const floatUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: delay * 0.1,
      ease: "easeOut" as const
    }
  })
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="page-about">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
      </div>

      <header className="relative z-10 border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-semibold font-logo">
                <span className="text-foreground">Action</span>
                <span className="text-primary">Minutes</span>
              </span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl">
                <ArrowLeft className="h-4 w-4 mr-2" weight="duotone" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-16 space-y-16">
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold">
            About ActionMinutes
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A personal productivity assistant built to help you organize your life—one thought at a time.
          </p>
        </motion.div>

        <motion.div
          variants={floatUpVariants}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          <Card className="bg-card border-border rounded-2xl overflow-hidden">
            <CardContent className="p-8 md:p-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary">
                  <Heart className="h-6 w-6 text-primary-foreground" weight="fill" />
                </div>
                <h2 className="text-2xl font-bold">Our Philosophy</h2>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We believe productivity isn't about doing more—it's about doing what matters. 
                  ActionMinutes was created for people who want a single, calm space to capture thoughts, 
                  organize tasks, reflect on their day, and stay on top of what's important.
                </p>
                <p>
                  Unlike team-focused tools that add complexity, ActionMinutes is designed for <strong className="text-foreground">you</strong>. 
                  Your notes, your reminders, your journal, your calendar—all in one place, working together seamlessly.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            variants={floatUpVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <Card className="h-full bg-card border-border rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="p-2.5 w-fit rounded-xl bg-accent">
                  <Lightning className="h-5 w-5 text-primary" weight="duotone" />
                </div>
                <h3 className="text-lg font-bold">AI That Helps, Not Hypes</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Our AI extracts action items from messy meeting notes, suggests journal prompts, 
                  and helps you process voice recordings—practical tools that save real time.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={floatUpVariants}
            initial="hidden"
            animate="visible"
            custom={3}
          >
            <Card className="h-full bg-card border-border rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="p-2.5 w-fit rounded-xl bg-emerald-500/20">
                  <Shield className="h-5 w-5 text-emerald-400" weight="duotone" />
                </div>
                <h3 className="text-lg font-bold">Privacy First</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Your notes are encrypted. Your data stays yours. We don't sell information 
                  or use your content to train AI models. Simple as that.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={floatUpVariants}
            initial="hidden"
            animate="visible"
            custom={4}
          >
            <Card className="h-full bg-card border-border rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="p-2.5 w-fit rounded-xl bg-amber-500/20">
                  <Target className="h-5 w-5 text-amber-400" weight="duotone" />
                </div>
                <h3 className="text-lg font-bold">Focus on What Matters</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  No complicated workflows or team hierarchies. Just clean, intuitive tools 
                  that help you capture, organize, and complete what's on your mind.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            variants={floatUpVariants}
            initial="hidden"
            animate="visible"
            custom={5}
          >
            <Card className="h-full bg-card border-border rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="p-2.5 w-fit rounded-xl bg-blue-500/20">
                  <Users className="h-5 w-5 text-blue-400" weight="duotone" />
                </div>
                <h3 className="text-lg font-bold">Built by Relay Labs</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We're a small team passionate about building tools that respect your time and attention. 
                  ActionMinutes is our vision of what personal productivity should be.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          className="text-center space-y-6"
          variants={floatUpVariants}
          initial="hidden"
          animate="visible"
          custom={6}
        >
          <h2 className="text-2xl font-bold">Ready to get organized?</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/login"
              className="group relative inline-flex items-center gap-2 text-primary-foreground px-8 py-3 rounded-xl font-semibold transition-all"
            >
              <span className="absolute inset-0 bg-primary rounded-xl" />
              <span className="absolute inset-0 bg-primary rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative">Start for Free</span>
            </Link>
            <Link href="/guide">
              <Button variant="outline" className="rounded-xl border-border text-foreground hover:bg-accent">
                Read the Guide
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            ActionMinutes by{" "}
            <a 
              href="https://relay-labs.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary"
            >
              Relay Labs
            </a>
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
