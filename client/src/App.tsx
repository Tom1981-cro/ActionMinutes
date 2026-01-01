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
import AdminFeedbackPage from "@/pages/admin-feedback";
import JournalPage from "@/pages/journal";
import RemindersPage from "@/pages/reminders";
import MobileBuildGuidePage from "@/pages/mobile-build-guide";
import NotFound from "@/pages/not-found";

import BlueprintPage from "@/pages/blueprint";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/blueprint" component={BlueprintPage} />
      
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
