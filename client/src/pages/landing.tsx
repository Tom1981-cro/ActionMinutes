import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Lightning, Brain, BookOpen, Kanban, ArrowRight, Sparkle,
  TwitterLogo, Check
} from "@phosphor-icons/react";
import logoIcon from "@assets/am_logo_1767300370565.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden relative">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] translate-x-1/2" />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-4 mt-4">
          <nav className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-9 h-9 rounded-xl" />
              <span className="text-xl tracking-tight font-semibold">
                <span className="text-white">Action</span>
                <span className="text-violet-400">Minutes</span>
              </span>
            </div>
            <Link 
              href="/login" 
              className="relative group bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              data-testid="nav-launch-app"
            >
              <span className="absolute inset-0 bg-violet-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <span className="relative">Launch App</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-4 min-h-screen flex items-center">
        <div className="container max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left side - Text content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
                  <Sparkle className="h-4 w-4 text-violet-400" weight="fill" />
                  <span className="text-sm text-violet-300">AI-Powered Meeting Assistant</span>
                </div>
              </motion.div>

              <motion.h1 
                className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                Turn Talk into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400">
                  Tasks.
                </span>
              </motion.h1>

              <motion.p 
                className="text-lg md:text-xl text-white/50 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                The AI-powered meeting assistant that extracts actions, organizes your chaos, and helps you reach{" "}
                <span className="text-white font-medium">Inbox Zero</span>.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Link 
                  href="/login"
                  className="group relative inline-flex items-center gap-3 text-white px-10 py-5 rounded-2xl text-lg font-semibold transition-all"
                  data-testid="hero-start-free"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl" />
                  <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <span className="relative flex items-center gap-3">
                    Start for Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" weight="bold" />
                  </span>
                </Link>
                <p className="mt-4 text-sm text-white/40">No credit card required</p>
              </motion.div>
            </div>

            {/* Right side - Meeting Card Mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <div className="relative">
                {/* Glow effect behind card */}
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-3xl blur-3xl scale-95" />
                
                {/* Main card */}
                <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-white/40 font-mono">meeting_notes.txt</span>
                  </div>

                  {/* Fake transcript */}
                  <div className="space-y-4 font-mono text-sm">
                    <p className="text-white/40 leading-relaxed">
                      <span className="text-violet-400/60">Sarah:</span> Alright team, let's go over the updates from last week...
                    </p>
                    <p className="text-white/40 leading-relaxed">
                      <span className="text-violet-400/60">Mike:</span> The design review is pending. We need to finalize it by Friday.
                    </p>
                    
                    {/* Highlighted extraction */}
                    <div className="relative">
                      <div className="absolute -inset-2 bg-violet-500/20 rounded-lg blur-sm" />
                      <div className="relative bg-violet-500/10 border border-violet-500/40 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="h-4 w-4 text-violet-400" weight="duotone" />
                          <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">AI Detected Action</span>
                        </div>
                        <p className="text-violet-300 font-medium">
                          "Mike to finalize design review by Friday"
                        </p>
                      </div>
                    </div>

                    <p className="text-white/40 leading-relaxed">
                      <span className="text-violet-400/60">Sarah:</span> Perfect. I'll send the follow-up emails after this...
                    </p>
                  </div>

                  {/* Extraction badge */}
                  <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" weight="bold" />
                      <span className="text-xs text-white/50">3 actions extracted</span>
                    </div>
                    <div className="text-xs text-white/30 font-mono">00:42</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bento Feature Grid */}
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
              Organize Your Life
            </h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">
              Everything you need to turn chaos into clarity.
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* Card 1 - Large */}
            <motion.div 
              className="md:col-span-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 md:p-10 group hover:bg-white/[0.07] transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex flex-col h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Brain className="h-8 w-8 text-violet-400" weight="duotone" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3">AI Action Extraction</h3>
                <p className="text-white/50 text-lg leading-relaxed">
                  We detect tasks automatically. Our AI reads between the lines to find every action item, owner, and deadline hiding in your meeting notes.
                </p>
                <div className="mt-8 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-white/40">
                    <Check className="h-4 w-4 text-violet-400" weight="bold" />
                    <span>Auto-detect owners</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Check className="h-4 w-4 text-violet-400" weight="bold" />
                    <span>Parse due dates</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/40">
                    <Check className="h-4 w-4 text-violet-400" weight="bold" />
                    <span>Track decisions</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card 2 - Small */}
            <motion.div 
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 group hover:bg-white/[0.07] transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-fuchsia-500/20 to-pink-500/20 border border-fuchsia-500/20 rounded-2xl flex items-center justify-center mb-6">
                <BookOpen className="h-7 w-7 text-fuchsia-400" weight="duotone" />
              </div>
              <h3 className="text-xl font-bold mb-3">Journaling</h3>
              <p className="text-white/50 leading-relaxed">
                Reflect on your day. Personal journaling with AI-powered prompts to help you process thoughts and plan ahead.
              </p>
            </motion.div>

            {/* Card 3 - Tall */}
            <motion.div 
              className="md:col-span-1 md:row-span-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 group hover:bg-white/[0.07] transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Kanban className="h-7 w-7 text-indigo-400" weight="duotone" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Reminders</h3>
              <p className="text-white/50 leading-relaxed">
                A Kanban board that actually works. Drag, drop, and snooze tasks across Today, Tomorrow, Next Week, and beyond.
              </p>
              {/* Mini Kanban preview */}
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 mb-2">Today</div>
                  <div className="h-2 bg-violet-500/40 rounded mb-1" />
                  <div className="h-2 bg-violet-500/30 rounded" />
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 mb-2">Tomorrow</div>
                  <div className="h-2 bg-fuchsia-500/30 rounded" />
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-white/30 mb-2">Week</div>
                  <div className="h-2 bg-indigo-500/30 rounded mb-1" />
                  <div className="h-2 bg-indigo-500/20 rounded" />
                </div>
              </div>
            </motion.div>

            {/* Additional visual card */}
            <motion.div 
              className="md:col-span-2 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 border border-violet-500/20 rounded-3xl p-8 flex items-center justify-between"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to get organized?</h3>
                <p className="text-white/50">Join thousands of productive professionals.</p>
              </div>
              <Link 
                href="/login"
                className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                data-testid="bento-cta"
              >
                Get Started
                <ArrowRight className="h-4 w-4" weight="bold" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works - Vertical Timeline */}
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
            <p className="text-white/50 text-lg">
              Three simple steps to meeting clarity.
            </p>
          </motion.div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-fuchsia-500/50 to-violet-500/50 md:-translate-x-1/2" />

            {/* Step 1 */}
            <motion.div 
              className="relative flex items-center mb-16 md:mb-24"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-violet-500 rounded-full md:-translate-x-1/2 ring-4 ring-violet-500/20" />
              <div className="ml-20 md:ml-0 md:w-1/2 md:pr-16 md:text-right">
                <div className="text-violet-400 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</div>
                <h3 className="text-2xl font-bold mb-2">Capture</h3>
                <p className="text-white/50">
                  Type, paste, upload a photo of handwritten notes, or record audio. We'll take it from there.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              className="relative flex items-center mb-16 md:mb-24"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-fuchsia-500 rounded-full md:-translate-x-1/2 ring-4 ring-fuchsia-500/20" />
              <div className="ml-20 md:ml-auto md:w-1/2 md:pl-16">
                <div className="text-fuchsia-400 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</div>
                <h3 className="text-2xl font-bold mb-2">Extract</h3>
                <p className="text-white/50">
                  AI identifies action items, owners, due dates, decisions, and risks automatically.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              className="relative flex items-center"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-violet-500 rounded-full md:-translate-x-1/2 ring-4 ring-violet-500/20" />
              <div className="ml-20 md:ml-0 md:w-1/2 md:pr-16 md:text-right">
                <div className="text-violet-400 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</div>
                <h3 className="text-2xl font-bold mb-2">Execute</h3>
                <p className="text-white/50">
                  Send follow-up emails, track tasks to completion, and never drop the ball again.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 relative">
        <div className="container max-w-4xl mx-auto">
          <motion.div 
            className="relative text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-3xl blur-3xl" />
            <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-12 md:p-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Stop losing track. Start taking action.
              </h2>
              <p className="text-white/50 mb-10 max-w-xl mx-auto text-lg">
                Join teams who've reclaimed hours every week with ActionMinutes.
              </p>
              <Link 
                href="/login"
                className="group relative inline-flex items-center gap-3 text-white px-10 py-5 rounded-2xl text-lg font-semibold transition-all"
                data-testid="final-cta-start"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl" />
                <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <span className="relative flex items-center gap-3">
                  Start for Free
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" weight="bold" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5 relative">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-7 h-7 rounded-lg" />
              <span className="text-sm text-white/40">
                ActionMinutes by{" "}
                <a 
                  href="https://relay-labs.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Relay Labs
                </a>
              </span>
            </div>
            <div className="flex items-center gap-8 text-sm text-white/40">
              <a 
                href="https://twitter.com/actionminutes" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors flex items-center gap-2"
              >
                <TwitterLogo className="h-4 w-4" weight="fill" />
                Twitter
              </a>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
