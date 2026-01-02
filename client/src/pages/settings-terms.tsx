import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsTermsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-800">Terms of Service</h2>
        <p className="text-gray-500">Last updated: January 2, 2026</p>
      </div>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">1. Acceptance of Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            By accessing or using ActionMinutes, you agree to be bound by these Terms of Service. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">2. Description of Service</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            ActionMinutes is a productivity application that helps you:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Convert meeting notes into structured action items</li>
            <li>Extract decisions and key points from discussions</li>
            <li>Generate follow-up email drafts</li>
            <li>Manage personal reminders and journal entries</li>
            <li>Collaborate with team members in workspaces</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">3. User Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>As a user, you agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate account information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Use the service in compliance with applicable laws</li>
            <li>Not upload malicious content or attempt to compromise the service</li>
            <li>Respect the privacy of other workspace members</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">4. Content Ownership</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            You retain ownership of all content you upload to ActionMinutes, including meeting notes, 
            action items, and journal entries. By using our service, you grant us a limited license 
            to process your content for the purpose of providing the service.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">5. AI-Generated Content</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            ActionMinutes uses artificial intelligence to extract action items, summarize notes, 
            and generate email drafts. While we strive for accuracy, AI-generated content may 
            contain errors. You are responsible for reviewing and verifying all AI-generated 
            content before use.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">6. Service Availability</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted service. 
            We may temporarily suspend the service for maintenance or updates. We are not liable 
            for any loss resulting from service unavailability.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">7. Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            ActionMinutes is provided "as is" without warranties of any kind. We are not liable 
            for any indirect, incidental, or consequential damages arising from your use of the service.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">8. Termination</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600 space-y-3">
          <p>
            You may terminate your account at any time. We reserve the right to suspend or 
            terminate accounts that violate these terms. Upon termination, your data will be 
            deleted in accordance with our Privacy Policy.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800">9. Changes to Terms</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm text-gray-600">
          <p>
            We may update these terms from time to time. We will notify you of significant changes 
            via email or in-app notification. Continued use of the service after changes constitutes 
            acceptance of the new terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
