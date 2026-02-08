import React, { useState, useEffect, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { ErrorBoundary, PageErrorFallback } from "@/components/error-boundary";

const AuthPage = React.lazy(() => import("@/pages/auth"));
const OnboardingPage = React.lazy(() => import("@/pages/onboarding"));
const InboxPage = React.lazy(() => import("@/pages/inbox"));
const MeetingsPage = React.lazy(() => import("@/pages/meetings"));
const CapturePage = React.lazy(() => import("@/pages/capture"));
const ExtractionPage = React.lazy(() => import("@/pages/extraction"));
const DraftsPage = React.lazy(() => import("@/pages/drafts"));
const SettingsPage = React.lazy(() => import("@/pages/settings"));
const SettingsPrivacyPage = React.lazy(() => import("@/pages/settings-privacy"));
const SettingsTermsPage = React.lazy(() => import("@/pages/settings-terms"));
const SupportPage = React.lazy(() => import("@/pages/support"));
const AdminFeedbackPage = React.lazy(() => import("@/pages/admin-feedback"));
const JournalPage = React.lazy(() => import("@/pages/journal"));
const RemindersPage = React.lazy(() => import("@/pages/reminders"));
const MobileBuildGuidePage = React.lazy(() => import("@/pages/mobile-build-guide"));
const StoreScreensPage = React.lazy(() => import("@/pages/store-screens"));
const MarketingPage = React.lazy(() => import("@/pages/marketing"));
const TestingGuidePage = React.lazy(() => import("@/pages/testing-guide"));
const AgendaPage = React.lazy(() => import("@/pages/agenda"));
const GuidePage = React.lazy(() => import("@/pages/guide"));
const AboutPage = React.lazy(() => import("@/pages/about"));
const TasksPage = React.lazy(() => import("@/pages/tasks"));
const NotesPage = React.lazy(() => import("@/pages/notes"));
const ListPage = React.lazy(() => import("@/pages/list"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const ActionDetailPage = React.lazy(() => import("@/pages/action-detail"));
const ActionedPage = React.lazy(() => import("@/pages/actioned"));
const DeletedPage = React.lazy(() => import("@/pages/deleted"));
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
  const [location, setLocation] = useLocation();
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

  return <div className="page-enter" key={location}>{children}</div>;
}

function Router() {
  return (
    <Switch>
      {/* Root redirects to app */}
      <Route path="/">
        <Redirect to="/app/inbox" />
      </Route>
      <Route path="/login">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><AuthPage /></div></Suspense>
      </Route>
      <Route path="/privacy-policy">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><SettingsPrivacyPage /></div></Suspense>
      </Route>
      <Route path="/terms">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><SettingsTermsPage /></div></Suspense>
      </Route>
      <Route path="/support">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><SupportPage /></div></Suspense>
      </Route>
      <Route path="/about">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><AboutPage /></div></Suspense>
      </Route>
      <Route path="/guide">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><GuidePage /></div></Suspense>
      </Route>
      <Route path="/store-screens">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><StoreScreensPage /></div></Suspense>
      </Route>
      <Route path="/marketing">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><MarketingPage /></div></Suspense>
      </Route>
      <Route path="/help/testing">
        <Suspense fallback={<PageLoader />}><div className="page-enter"><TestingGuidePage /></div></Suspense>
      </Route>
      
      {/* Onboarding (after login but before full app access) */}
      <Route path="/app/onboarding">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}><OnboardingPage /></Suspense>
        </ProtectedRoute>
      </Route>

      {/* Protected app routes */}
      <Route path="/app/inbox">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><InboxPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/meetings">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><MeetingsPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/capture">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><CapturePage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/meeting/:id">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><ExtractionPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/drafts">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><DraftsPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/settings">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><SettingsPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/journal">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><JournalPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/reminders">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><RemindersPage /></Suspense></Layout>
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
          <Layout><Suspense fallback={<PageLoader />}><TasksPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/notes">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><NotesPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/lists/:id">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><ListPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/action/:type/:id">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><ActionDetailPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/actioned">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><ActionedPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/deleted">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><DeletedPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/agenda">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><AgendaPage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/mobile-build-guide">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><MobileBuildGuidePage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/app/guide">
        <ProtectedRoute>
          <Layout><Suspense fallback={<PageLoader />}><GuidePage /></Suspense></Layout>
        </ProtectedRoute>
      </Route>

      {/* Admin routes */}
      <Route path="/admin/feedback">
        <ProtectedRoute>
          <Suspense fallback={<PageLoader />}><AdminFeedbackPage /></Suspense>
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

      <Route>
        <Suspense fallback={<PageLoader />}><div className="page-enter"><NotFound /></div></Suspense>
      </Route>
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
