import { Link } from "wouter";
import { 
  ArrowLeft, Envelope, Question, Lifebuoy, BookOpen, 
  Bell, Calendar, Brain, NotePencil, Lightning 
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoIcon from "@assets/am_logo_1767300370565.png";

export default function SupportPage() {
  const faqs = [
    {
      question: "What is ActionMinutes?",
      answer: "ActionMinutes is a personal productivity assistant that helps you organize your life. It combines notes, reminders, journal, calendar, and custom lists in one place—plus AI that extracts action items from meeting notes."
    },
    {
      question: "How does AI extraction work?",
      answer: "Paste your meeting notes into the AI Extraction tool. Our AI analyzes the text and automatically identifies action items, owners, due dates, and key decisions. You can review and edit everything before saving."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. Your notes are encrypted at rest using AES-256-GCM encryption. We use secure authentication and never share your data with third parties or use it to train AI models."
    },
    {
      question: "What's included in the Free plan?",
      answer: "Free includes unlimited notes and lists, personal reminders, daily journal, and 5 AI extractions per month. It's everything you need to get started."
    },
    {
      question: "What does Pro unlock?",
      answer: "Pro gives you unlimited AI extractions, Gmail and Outlook sync, calendar integration, and voice transcription. Perfect for power users who want the full experience."
    },
    {
      question: "How do I connect my calendar?",
      answer: "Go to Settings → Integrations and click 'Connect' next to Google Calendar or Microsoft Outlook. Follow the authorization flow and your events will sync automatically."
    },
    {
      question: "Can I cancel my subscription?",
      answer: "Yes, you can cancel anytime from Settings → Subscription → Manage Subscription. You'll keep access until the end of your billing period."
    }
  ];

  const tips = [
    {
      icon: Lightning,
      text: "Use Quick Add in your Inbox to capture thoughts instantly",
      color: "text-orange-400"
    },
    {
      icon: Bell,
      text: "Organize reminders by time: Today, Tomorrow, Next Week, Someday",
      color: "text-amber-400"
    },
    {
      icon: Brain,
      text: "Paste messy meeting notes—AI finds the action items for you",
      color: "text-fuchsia-400"
    },
    {
      icon: BookOpen,
      text: "Start each day with the AI-generated journal prompt",
      color: "text-emerald-400"
    },
    {
      icon: Calendar,
      text: "Connect your calendar to see events alongside tasks",
      color: "text-blue-400"
    },
    {
      icon: NotePencil,
      text: "Use tags and links to connect related notes together",
      color: "text-pink-400"
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="page-support">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
      </div>

      <header className="relative z-10 border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoIcon} alt="ActionMinutes" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-semibold">
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

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-support-title">Support</h1>
          <p className="text-muted-foreground">Get help with ActionMinutes</p>
        </div>

        <Card className="bg-card border-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent border-b border-border">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Envelope className="h-5 w-5 text-primary" weight="duotone" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="text-foreground p-6 space-y-4">
            <p>
              Have a question, found a bug, or need help with your account? We're here to help.
            </p>
            <div className="p-4 bg-muted rounded-xl border border-border">
              <p className="text-sm text-muted-foreground mb-2">Email us at:</p>
              <a href="mailto:support@actionminutes.com" className="text-primary hover:text-primary font-medium" data-testid="link-support-email">
                support@actionminutes.com
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              We typically respond within 24 hours during business days.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted border-b border-border">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Question className="h-5 w-5 text-amber-400" weight="duotone" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="space-y-2">
                <h3 className="font-semibold text-foreground">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted border-b border-border">
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Lifebuoy className="h-5 w-5 text-fuchsia-400" weight="duotone" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <tip.icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${tip.color}`} weight="duotone" />
                  <span className="text-sm text-foreground">{tip.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="text-center space-y-4 pt-4">
          <p className="text-muted-foreground text-sm">
            Want to learn more about using ActionMinutes?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/guide">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                Read the Guide
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" className="rounded-xl border-border text-foreground hover:bg-accent">
                About ActionMinutes
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-border py-8">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
