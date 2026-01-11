import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Privacy Policy</h2>
          <p className="text-white/60 text-sm">Last updated: January 8, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">1. Commitment to Privacy</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              At ActionMinutes (a service provided by Relay Labs, "we", "us", "our"), we recognize that the confidentiality and security of your meeting data are paramount. This Privacy Policy describes how we collect, use, process, and protect your information when you use our services. We adhere to industry-standard data protection practices to ensure your information remains private and secure.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">2. Information Collection and Scope</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>We collect information necessary to provide and improve our services, including:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Account Identification:</strong> Legal name, verified email address, and authentication credentials.</li>
              <li><strong className="text-white">Professional Content:</strong> Raw meeting notes, uploaded documents, and manually entered text intended for processing.</li>
              <li><strong className="text-white">Processed Metadata:</strong> Extracted action items, key decisions, risks, and generated follow-up drafts.</li>
              <li><strong className="text-white">Personal Journaling:</strong> Highly sensitive personal entries stored with enhanced privacy controls (if Personal Mode is activated).</li>
              <li><strong className="text-white">Transient Visual Data:</strong> Images uploaded for Optical Character Recognition (OCR) are processed in volatile memory and purged immediately after extraction, unless explicit persistent storage is enabled by the user.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">3. Artificial Intelligence and Data Processing</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              ActionMinutes utilizes advanced Large Language Models (LLMs) provided by partners like OpenAI and Google Gemini to provide intelligent extraction services.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Data Sanitization:</strong> We strive to minimize the transfer of PII (Personally Identifiable Information) to AI sub-processors where possible.</li>
              <li><strong className="text-white">No Model Training:</strong> Your meeting content is used solely for real-time extraction and is not utilized by our partners to train or improve their underlying models.</li>
              <li><strong className="text-white">User Control:</strong> You maintain absolute control over AI processing and can disable these features at any time within your account settings.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">4. Data Security and Governance</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              We implement a multi-layered security architecture:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Encryption:</strong> All data is encrypted using AES-256 at rest and TLS 1.3 in transit.</li>
              <li><strong className="text-white">Access Controls:</strong> Strict internal access policies ensure that no ActionMinutes personnel can view your meeting content without explicit technical necessity and user authorization.</li>
              <li><strong className="text-white">Workspace Isolation:</strong> Team data is logically isolated. Members of one workspace cannot access data from another unless specifically invited.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 rounded-xl overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/10">
            <CardTitle className="text-lg text-white">5. Your Data Rights</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 p-6 space-y-4">
            <p>
              Under applicable data protection laws (including GDPR and CCPA), you have the following rights:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-white">Portability:</strong> You may export your meeting history and action items at any time.</li>
              <li><strong className="text-white">Erasure:</strong> You may request the permanent deletion of your account and all associated data.</li>
              <li><strong className="text-white">Rectification:</strong> You have full control to correct or update any information stored in our systems.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
