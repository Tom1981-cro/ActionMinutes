import { Link } from "wouter";
import { motion } from "framer-motion";
import { 
  Lightning, CheckCircle, Clock, Users, ArrowRight, Sparkle,
  FileText, CalendarCheck, EnvelopeSimple
} from "@phosphor-icons/react";
import logoIcon from "@assets/am_logo_1767300370565.png";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
            <span className="text-xl tracking-tight">
              <span className="font-bold text-white">Action</span>
              <span className="font-normal text-violet-300">Minutes</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-white/70 hover:text-white transition-colors text-sm font-medium">
              Sign In
            </Link>
            <Link 
              href="/login" 
              className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25"
              data-testid="header-get-started"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 rounded-full px-4 py-1.5 mb-6">
              <Sparkle className="h-4 w-4 text-violet-400" weight="fill" />
              <span className="text-sm text-violet-300">AI-Powered Meeting Assistant</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Turn Meeting Notes into
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                Actions & Follow-ups
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
              Minutes → Actions → Follow-ups. Transform messy meeting notes into clear action items, 
              decisions, and ready-to-send emails in under 60 seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50"
                data-testid="hero-get-started"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" weight="bold" />
              </Link>
              <span className="text-white/40 text-sm">No credit card required</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to
              <span className="text-violet-400"> Stay on Track</span>
            </h2>
            <p className="text-white/60 max-w-xl mx-auto">
              From capturing notes to sending follow-ups, ActionMinutes handles it all.
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-6"
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div 
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              variants={fadeIn}
            >
              <div className="w-14 h-14 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="h-7 w-7 text-violet-400" weight="duotone" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Capture</h3>
              <p className="text-white/60">
                Type, paste, upload photos of handwritten notes, or record audio. 
                Our AI understands it all.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              variants={fadeIn}
            >
              <div className="w-14 h-14 bg-fuchsia-500/20 rounded-2xl flex items-center justify-center mb-6">
                <CalendarCheck className="h-7 w-7 text-fuchsia-400" weight="duotone" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Extraction</h3>
              <p className="text-white/60">
                Automatically extract action items, decisions, risks, and key points. 
                Review and refine with one click.
              </p>
            </motion.div>

            <motion.div 
              className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/10 transition-colors"
              variants={fadeIn}
            >
              <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                <EnvelopeSimple className="h-7 w-7 text-indigo-400" weight="duotone" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Auto Follow-ups</h3>
              <p className="text-white/60">
                Generate personalized follow-up emails for each attendee. 
                Review, edit, and send in seconds.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-violet-950/30">
        <div className="container max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Three simple steps to transform your meetings.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Capture</h3>
              <p className="text-white/60">
                Enter your meeting notes however works for you—type, paste, photo, or voice.
              </p>
            </motion.div>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Extract</h3>
              <p className="text-white/60">
                AI identifies action items, owners, due dates, decisions, and risks automatically.
              </p>
            </motion.div>

            <motion.div 
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Follow Up</h3>
              <p className="text-white/60">
                Send personalized follow-up emails and track action items until completion.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div 
            className="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-3xl p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Meetings?
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Join teams who've reclaimed hours every week with ActionMinutes.
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all shadow-xl shadow-violet-500/30"
              data-testid="cta-get-started"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" weight="bold" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="ActionMinutes" className="w-6 h-6 rounded-lg" />
              <span className="text-sm text-white/60">
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
            <div className="flex items-center gap-6 text-sm text-white/60">
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
