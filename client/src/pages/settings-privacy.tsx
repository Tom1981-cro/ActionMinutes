import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-800">Privacy Policy</h2>
          <p className="text-gray-500 text-sm">Last updated: January 2, 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <CardTitle className="text-lg text-slate-900">1. Commitment to Privacy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-gray-700 p-6 space-y-4">
            <p>
              At ActionMinutes, we recognize that the confidentiality and security of your meeting data are paramount. This Privacy Policy describes how we collect, use, process, and protect your information when you use our services. We adhere to industry-standard data protection practices to ensure your information remains private and secure.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <CardTitle className="text-lg text-slate-900">2. Information Collection and Scope</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-gray-700 p-6 space-y-4">
            <p>We collect information necessary to provide and improve our services, including:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Identification:</strong> Legal name, verified email address, and authentication credentials provided via Clerk.</li>
              <li><strong>Professional Content:</strong> Raw meeting notes, uploaded documents, and manually entered text intended for processing.</li>
              <li><strong>Processed Metadata:</strong> Extracted action items, key decisions, risks, and generated follow-up drafts.</li>
              <li><strong>Personal Journaling:</strong> Highly sensitive personal entries stored with enhanced privacy controls (if Personal Mode is activated).</li>
              <li><strong>Transient Visual Data:</strong> Images uploaded for Optical Character Recognition (OCR) are processed in volatile memory and purged immediately after extraction, unless explicit persistent storage is enabled by the user.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <CardTitle className="text-lg text-slate-900">3. Artificial Intelligence and Data Processing</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-gray-700 p-6 space-y-4">
            <p>
              ActionMinutes utilizes advanced Large Language Models (LLMs) provided by partners like OpenAI and Google Gemini to provide intelligent extraction services.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Data Sanitization:</strong> We strive to minimize the transfer of PII (Personally Identifiable Information) to AI sub-processors where possible.</li>
              <li><strong>No Model Training:</strong> Your meeting content is used solely for real-time extraction and is not utilized by our partners to train or improve their underlying models.</li>
              <li><strong>User Control:</strong> You maintain absolute control over AI processing and can disable these features at any time within your account settings.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <CardTitle className="text-lg text-slate-900">4. Data Security and Governance</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-gray-700 p-6 space-y-4">
            <p>
              We implement a multi-layered security architecture:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Encryption:</strong> All data is encrypted using AES-256 at rest and TLS 1.3 in transit.</li>
              <li><strong>Access Controls:</strong> Strict internal access policies ensure that no ActionMinutes personnel can view your meeting content without explicit technical necessity and user authorization.</li>
              <li><strong>Workspace Isolation:</strong> Team data is logically isolated. Members of one workspace cannot access data from another unless specifically invited.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 rounded-xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-gray-100">
            <CardTitle className="text-lg text-slate-900">5. Your Data Rights</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm text-gray-700 p-6 space-y-4">
            <p>
              Under applicable data protection laws (including GDPR and CCPA), you have the following rights:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Portability:</strong> You may export your meeting history and action items at any time.</li>
              <li><strong>Erasure:</strong> You may request the permanent deletion of your account and all associated data.</li>
              <li><strong>Rectification:</strong> You have full control to correct or update any information stored in our systems.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
