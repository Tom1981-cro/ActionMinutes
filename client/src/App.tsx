import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";

import AuthPage from "@/pages/auth";
import OnboardingPage from "@/pages/onboarding";
import InboxPage from "@/pages/inbox";
import MeetingsPage from "@/pages/meetings";
import CapturePage from "@/pages/capture";
import ExtractionPage from "@/pages/extraction";
import DraftsPage from "@/pages/drafts";
import SettingsPage from "@/pages/settings";
import SettingsPrivacyPage from "@/pages/settings-privacy";
import SettingsTermsPage from "@/pages/settings-terms";
import AdminFeedbackPage from "@/pages/admin-feedback";
import JournalPage from "@/pages/journal";
import RemindersPage from "@/pages/reminders";
import MobileBuildGuidePage from "@/pages/mobile-build-guide";
import StoreScreensPage from "@/pages/store-screens";
import MarketingPage from "@/pages/marketing";
import TestingGuidePage from "@/pages/testing-guide";
import InvitePage from "@/pages/invite";
import AgendaPage from "@/pages/agenda";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/store-screens" component={StoreScreensPage} />
      <Route path="/marketing" component={MarketingPage} />
      
      <Route path="/inbox">
        <Layout><InboxPage /></Layout>
      </Route>
      <Route path="/meetings">
        <Layout><MeetingsPage /></Layout>
      </Route>
      <Route path="/capture">
        <Layout><CapturePage /></Layout>
      </Route>
      <Route path="/meeting/:id">
        <Layout><ExtractionPage /></Layout>
      </Route>
      <Route path="/drafts">
        <Layout><DraftsPage /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><SettingsPage /></Layout>
      </Route>
      <Route path="/privacy-policy">
        <Layout><SettingsPrivacyPage /></Layout>
      </Route>
      <Route path="/terms">
        <Layout><SettingsTermsPage /></Layout>
      </Route>
      <Route path="/journal">
        <Layout><JournalPage /></Layout>
      </Route>
      <Route path="/reminders">
        <Layout><RemindersPage /></Layout>
      </Route>
      <Route path="/admin/feedback" component={AdminFeedbackPage} />
      <Route path="/mobile-build-guide">
        <Layout><MobileBuildGuidePage /></Layout>
      </Route>
      <Route path="/help/testing" component={TestingGuidePage} />
      <Route path="/invite/:token" component={InvitePage} />
      <Route path="/agenda">
        <Layout><AgendaPage /></Layout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
