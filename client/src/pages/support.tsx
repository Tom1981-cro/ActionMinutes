import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, Envelope, ChatCircle, Lifebuoy, Question } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6" data-testid="page-support">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" weight="duotone" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white" data-testid="text-support-title">Support</h1>
            <p className="text-white/60 text-sm">Get help with ActionMinutes</p>
          </div>
        </div>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-b border-white/10">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Envelope className="h-5 w-5 text-violet-400" weight="duotone" />
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              Have a question, found a bug, or need help with your account? We're here to help.
            </p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-white/60 mb-2">Email us at:</p>
              <a href="mailto:support@actionminutes.com" className="text-violet-400 hover:text-violet-300 font-medium" data-testid="link-support-email">
                support@actionminutes.com
              </a>
            </div>
            <p className="text-sm text-white/60">
              We typically respond within 24 hours during business days.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Question className="h-5 w-5 text-amber-400" weight="duotone" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-white">How does AI extraction work?</h3>
              <p className="text-sm text-white/70">
                ActionMinutes uses advanced AI to analyze your meeting notes and automatically extract action items, 
                decisions, and key points. Simply paste or type your notes, and we'll do the rest.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Is my data secure?</h3>
              <p className="text-sm text-white/70">
                Yes. We use industry-standard encryption for all data in transit and at rest. 
                Your meeting notes are never shared with third parties or used to train AI models.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white">How do I upgrade my subscription?</h3>
              <p className="text-sm text-white/70">
                Go to Settings → Subscription and click "Upgrade to Pro" to access unlimited features.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-white">Can I cancel my subscription?</h3>
              <p className="text-sm text-white/70">
                Yes, you can cancel anytime from Settings → Subscription → Manage Subscription. 
                You'll retain access until the end of your billing period.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Lifebuoy className="h-5 w-5 text-fuchsia-400" weight="duotone" />
              Quick Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Use the "Capture" page to quickly input meeting notes and extract action items.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Check your Inbox regularly to see assigned action items across all meetings.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Enable Gmail or Outlook integration to send follow-up emails directly.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-400">•</span>
                <span>Use Personal mode for private reminders and journal entries.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center pt-4">
          <Link href="/">
            <Button variant="outline" className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-2" weight="duotone" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
