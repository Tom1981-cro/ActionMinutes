import React, { useState, useEffect, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary, PageErrorFallback } from "@/components/error-boundary";

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
import AgendaPage from "@/pages/agenda";
import GuidePage from "@/pages/guide";
import AboutPage from "@/pages/about";
import TasksPage from "@/pages/tasks";
import NotesPage from "@/pages/notes";
import ListPage from "@/pages/list";
import NotFound from "@/pages/not-found";
import ActionDetailPage from "@/pages/action-detail";
import ActionedPage from "@/pages/actioned";
import DeletedPage from "@/pages/deleted";

const CalendarPage = React.lazy(() => import("@/pages/calendar"));
const TranscriptsPage = React.lazy(() => import("@/pages/transcripts"));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !hasRedirected) {
      setHasRedirected(true);
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, hasRedirected, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
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
      <Route path="/about" component={AboutPage} />
      <Route path="/guide" component={GuidePage} />
      <Route path="/store-screens" component={StoreScreensPage} />
      <Route path="/marketing" component={MarketingPage} />
      <Route path="/help/testing" component={TestingGuidePage} />
      
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
          <Layout>
            <ErrorBoundary key="calendar" fallback={<PageErrorFallback message="Couldn't load calendar" />}>
              <Suspense fallback={<PageLoader />}>
                <CalendarPage />
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/transcripts">
        <ProtectedRoute>
          <Layout>
            <ErrorBoundary key="transcripts" fallback={<PageErrorFallback message="Couldn't load transcripts" />}>
              <Suspense fallback={<PageLoader />}>
                <TranscriptsPage />
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/tasks">
        <ProtectedRoute>
          <Layout><TasksPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/notes">
        <ProtectedRoute>
          <Layout><NotesPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/lists/:id">
        <ProtectedRoute>
          <Layout><ListPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/action/:type/:id">
        <ProtectedRoute>
          <Layout><ActionDetailPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/actioned">
        <ProtectedRoute>
          <Layout><ActionedPage /></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/deleted">
        <ProtectedRoute>
          <Layout><DeletedPage /></Layout>
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
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
