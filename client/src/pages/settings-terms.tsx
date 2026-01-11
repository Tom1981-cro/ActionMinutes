import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function SettingsTermsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Terms of Service</h2>
          <p className="text-white/60 text-sm">Last updated: January 8, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">1. Master Service Agreement</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              These Terms of Service ("Agreement") constitute a legally binding contract between you and Relay Labs ("Relay Labs", "Company", "we", "us", "our"), the operator of the ActionMinutes platform. By accessing our platform, you acknowledge that you have read, understood, and agree to be bound by these terms. If you are entering into this Agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these terms.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">2. Acceptable Use Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>You agree to use ActionMinutes only for lawful professional purposes. Prohibited activities include, but are not limited to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Reverse engineering or attempting to extract the source code of the service.</li>
              <li>Using the service to store or transmit infringing, libelous, or otherwise unlawful material.</li>
              <li>Attempting to gain unauthorized access to any part of the service or its related systems.</li>
              <li>Interfering with or disrupting the integrity or performance of the service.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">3. Intellectual Property and Content Rights</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              <strong className="text-white">Your Content:</strong> You retain all ownership rights to the meeting notes, transcriptions, and entries you provide. You grant ActionMinutes a non-exclusive, world-wide, royalty-free license to host, copy, and display your content solely as necessary to provide the service to you.
            </p>
            <p>
              <strong className="text-white">Our Platform:</strong> ActionMinutes and its original content (excluding user content), features, and functionality are and will remain the exclusive property of ActionMinutes and its licensors.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">4. AI Reliability and Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              ActionMinutes utilizes Artificial Intelligence to automate meeting summaries and action item extraction. Due to the nature of machine learning, these outputs may occasionally be inaccurate or incomplete.
            </p>
            <p className="italic bg-violet-500/10 p-3 rounded-lg border-l-4 border-violet-500 text-white/90">
              User acknowledges and agrees that all AI-generated outputs must be reviewed and verified by a human user before being acted upon. ActionMinutes shall not be liable for any decisions made based on unverified AI outputs.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">5. Limitation of Liability and Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ACTIONMINUTES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES.
            </p>
            <p>
              You agree to indemnify and hold harmless ActionMinutes from and against any claims, damages, or expenses arising from your use of the service or breach of this Agreement.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">6. Termination and Suspension</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              We reserve the right to suspend or terminate your access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
