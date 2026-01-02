import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-800">Privacy Policy</h2>
        <p className="text-gray-500">Last updated: January 2, 2026</p>
      </div>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">1. Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            ActionMinutes collects information you provide directly, including:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information (name, email address)</li>
            <li>Meeting notes and content you upload</li>
            <li>Action items, decisions, and follow-up drafts</li>
            <li>Personal journal entries (if Personal Mode is enabled)</li>
            <li>Images uploaded for OCR processing (deleted after processing unless you opt-in to storage)</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">2. How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Process meeting notes and extract action items using AI</li>
            <li>Generate follow-up email drafts</li>
            <li>Sync your data across devices</li>
            <li>Improve our AI models (only with your consent)</li>
            <li>Send service-related notifications</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">3. Data Storage and Security</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            Your data is stored securely in our database with encryption at rest and in transit. 
            We implement industry-standard security measures to protect your information.
          </p>
          <p>
            Personal journal entries are only visible to you and are never shared with workspace members.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">4. Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>We integrate with the following third-party services:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>OpenAI:</strong> For AI-powered note extraction and summarization</li>
            <li><strong>Gmail/Outlook:</strong> For creating email drafts (when you connect your account)</li>
            <li><strong>Google/Microsoft OAuth:</strong> For secure authentication</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">5. Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Export your data in a portable format</li>
            <li>Opt-out of AI processing</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">6. Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600">
          <p>
            If you have questions about this Privacy Policy, please contact us through the feedback form in Settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
