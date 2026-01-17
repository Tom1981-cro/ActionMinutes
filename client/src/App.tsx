import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import { Tutorial } from "@/components/tutorial";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/landing";
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
import SupportPage from "@/pages/support";
import AdminFeedbackPage from "@/pages/admin-feedback";
import JournalPage from "@/pages/journal";
import RemindersPage from "@/pages/reminders";
import MobileBuildGuidePage from "@/pages/mobile-build-guide";
import StoreScreensPage from "@/pages/store-screens";
import MarketingPage from "@/pages/marketing";
import TestingGuidePage from "@/pages/testing-guide";
import InvitePage from "@/pages/invite";
import AgendaPage from "@/pages/agenda";
import GuidePage from "@/pages/guide";
import CalendarPage from "@/pages/calendar";
import TranscriptsPage from "@/pages/transcripts";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/privacy-policy" component={SettingsPrivacyPage} />
      <Route path="/terms" component={SettingsTermsPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/store-screens" component={StoreScreensPage} />
      <Route path="/marketing" component={MarketingPage} />
      <Route path="/help/testing" component={TestingGuidePage} />
      <Route path="/invite/:token" component={InvitePage} />
      
      {/* Onboarding (after login but before full app access) */}
      <Route path="/app/onboarding">
        <ProtectedRoute>
          <OnboardingPage />
        </ProtectedRoute>
      </Route>

      {/* Protected app routes */}
      <Route path="/app/inbox">
        <ProtectedRoute>
          <Layout><InboxPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/meetings">
        <ProtectedRoute>
          <Layout><MeetingsPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/capture">
        <ProtectedRoute>
          <Layout><CapturePage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/meeting/:id">
        <ProtectedRoute>
          <Layout><ExtractionPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/drafts">
        <ProtectedRoute>
          <Layout><DraftsPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/settings">
        <ProtectedRoute>
          <Layout><SettingsPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/journal">
        <ProtectedRoute>
          <Layout><JournalPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/reminders">
        <ProtectedRoute>
          <Layout><RemindersPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/calendar">
        <ProtectedRoute>
          <Layout><CalendarPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/transcripts">
        <ProtectedRoute>
          <Layout><TranscriptsPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/agenda">
        <ProtectedRoute>
          <Layout><AgendaPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/mobile-build-guide">
        <ProtectedRoute>
          <Layout><MobileBuildGuidePage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/guide">
        <ProtectedRoute>
          <Layout><GuidePage /></Layout>
        </ProtectedRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/admin/feedback">
        <ProtectedRoute>
          <AdminFeedbackPage />
        </ProtectedRoute>
      </Route>

      {/* Default /app route - redirect to inbox */}
      <Route path="/app">
        <Redirect to="/app/inbox" />
      </Route>

      {/* Redirect old routes to new /app/* structure */}
      <Route path="/inbox">
        <Redirect to="/app/inbox" />
      </Route>
      <Route path="/meetings">
        <Redirect to="/app/meetings" />
      </Route>
      <Route path="/capture">
        <Redirect to="/app/capture" />
      </Route>
      <Route path="/drafts">
        <Redirect to="/app/drafts" />
      </Route>
      <Route path="/settings">
        <Redirect to="/app/settings" />
      </Route>
      <Route path="/journal">
        <Redirect to="/app/journal" />
      </Route>
      <Route path="/reminders">
        <Redirect to="/app/reminders" />
      </Route>
      <Route path="/calendar">
        <Redirect to="/app/calendar" />
      </Route>
      <Route path="/onboarding">
        <Redirect to="/app/onboarding" />
      </Route>
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Tutorial />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
