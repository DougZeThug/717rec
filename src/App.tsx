import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';

import { LoadingState } from '@/components/ui/loading-state';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { useFirstPartyPageview } from '@/hooks/useFirstPartyPageview';
import { useLazyRef } from '@/hooks/useLazyRef';
import { initAnalytics, trackPageView } from '@/utils/analytics';
import { errorLog, routeLog } from '@/utils/logger';
import { preloadCoreRoutes } from '@/utils/routePrefetch';
import { metrics } from '@/utils/sentry';

import { RouteAnnouncer } from './components/a11y/RouteAnnouncer';
import { RouteFocusManager } from './components/a11y/RouteFocusManager';
import { ScrollToTop } from './components/a11y/ScrollToTop';
import ProtectedAdminRoute from './components/auth/ProtectedAdminRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import Footer from './components/layout/Footer';
import Navbar from './components/layout/Navbar';
import { OfflineBanner } from './components/layout/OfflineBanner';
import AppNavigation from './components/navigation/AppNavigation';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import PageTransition from './components/transitions/PageTransition';

// Initialize Analytics on app load (Sentry already initialized in main.tsx)
initAnalytics();

// Lazy load all page components
const Index = lazy(() => import('./pages/Index'));
const Help = lazy(() => import('./pages/Help'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TeamDetails = lazy(() => import('./pages/TeamDetails'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Stats = lazy(() => import('./pages/Stats'));
const Playoffs = lazy(() => import('./pages/Playoffs'));
const History = lazy(() => import('./pages/History'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProfileSetup = lazy(() => import('./pages/ProfileSetup'));
const MessageBoard = lazy(() => import('./pages/MessageBoard'));
const MyTeam = lazy(() => import('./pages/MyTeam'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Contact = lazy(() => import('./pages/Contact'));
const Compare = lazy(() => import('./pages/Compare'));
const Insights = lazy(() => import('./pages/Insights'));
const PlayoffBracketE2EProof = lazy(() => import('./components/playoffs/PlayoffBracketE2EProof'));
const LiveScoring = lazy(() => import('./pages/LiveScoring'));
const OAuthConsent = lazy(() => import('./pages/OAuthConsent'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
  queryCache: new QueryCache({
    onError: () => metrics.count('query_error', 1, { type: 'query' }),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      metrics.count('mutation_error', 1, { type: 'mutation' });
      const keyLabel = mutation.options.mutationKey
        ? `: ${JSON.stringify(mutation.options.mutationKey)}`
        : '';
      errorLog(`Mutation failed${keyLabel}`, error);
    },
  }),
});

/** Renders the authenticated application shell, route content, and route-level side effects. */
const AppContent = () => {
  const location = useLocation();
  const navigationStartRef = useLazyRef(() => performance.now());
  const mainRef = useRef<HTMLElement>(null);

  // First-party pageview beacon (fires per route change, PWA-safe)
  useFirstPartyPageview();

  // Alias to a local to avoid the 'location.*' mutable-global heuristic.
  const pathname = location.pathname;

  // Log every route change, track page views, and emit Sentry metrics
  useEffect(() => {
    routeLog(`Navigating to: ${pathname}`);
    trackPageView(pathname);

    // Sentry metrics
    metrics.count('page_view', 1, { route: pathname });
    const loadTime = performance.now() - navigationStartRef.current;
    metrics.distribution('page_load_time', loadTime, { route: pathname });
    navigationStartRef.current = performance.now();
  }, [pathname, navigationStartRef]);

  // Preload core routes after initial render
  useEffect(() => {
    preloadCoreRoutes();
  }, []);

  return (
    <NavigationProvider>
      <RouteAnnouncer />
      <ScrollToTop />
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />
        {/* Under the header and in normal flow, never sticky: the header is
            already `sticky top-0 z-50`, so a second sticky bar slides beneath
            it. See the same note on the admin phone menu. */}
        <OfflineBanner />
        <PageTransition>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-grow focus:outline-none"
          >
            {/* Above the Suspense, not inside a route.
                A page whose code fails to download rejects the lazy import, and
                React re-throws that from the Suspense boundary's own position —
                so the per-route boundaries below are not in its path and the
                app-level one catches it instead, taking the header with it.
                That was the dead end in UX audit X-12. A boundary here keeps
                the header and hands a failed download to ChunkLoadRecovery. */}
            <RouteErrorBoundary routeName="this page">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center min-h-[60vh] py-8">
                    <LoadingState message="Loading page..." size="lg" />
                  </div>
                }
              >
                <Routes location={location}>
                  <Route
                    path="/"
                    element={
                      <RouteErrorBoundary routeName="Home">
                        <Index />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/teams"
                    element={
                      <RouteErrorBoundary routeName="Teams">
                        <TeamsPage />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/teams/:teamId"
                    element={
                      <RouteErrorBoundary routeName="Team Details">
                        <TeamDetails />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/schedule"
                    element={
                      <RouteErrorBoundary routeName="Schedule">
                        <Schedule />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/stats"
                    element={
                      <RouteErrorBoundary routeName="Standings">
                        <Stats />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/playoffs"
                    element={
                      <RouteErrorBoundary routeName="Playoffs">
                        <Playoffs />
                      </RouteErrorBoundary>
                    }
                  />
                  {import.meta.env.DEV && (
                    <Route
                      path="/playoffs/e2e-bracket-proof"
                      element={
                        <RouteErrorBoundary routeName="Playoff Bracket E2E Proof">
                          <PlayoffBracketE2EProof />
                        </RouteErrorBoundary>
                      }
                    />
                  )}
                  <Route
                    path="/history"
                    element={
                      <RouteErrorBoundary routeName="History">
                        <History />
                      </RouteErrorBoundary>
                    }
                  />
                  {/* This was a page nothing linked to, duplicating a section
                    that lives inside the admin console. The guard stays so a
                    signed-out visitor still lands on /auth, not /admin.
                    `/admin/notifications` needs no redirect of its own: it is
                    now the real address of the Notifications section. */}
                  <Route
                    path="/timeslots"
                    element={
                      <ProtectedAdminRoute>
                        <Navigate to="/admin/timeslots" replace />
                      </ProtectedAdminRoute>
                    }
                  />
                  {/* Bare /admin reopens the last section; /admin/:section is the
                    shareable address of one. Both render the same page. */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedAdminRoute>
                        <RouteErrorBoundary routeName="Admin Dashboard">
                          <AdminDashboard />
                        </RouteErrorBoundary>
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/admin/:section"
                    element={
                      <ProtectedAdminRoute>
                        <RouteErrorBoundary routeName="Admin Dashboard">
                          <AdminDashboard />
                        </RouteErrorBoundary>
                      </ProtectedAdminRoute>
                    }
                  />
                  <Route
                    path="/auth"
                    element={
                      <RouteErrorBoundary routeName="Sign In">
                        <Auth />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/forgot-password"
                    element={
                      <RouteErrorBoundary routeName="Forgot Password">
                        <ForgotPassword />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/reset-password"
                    element={
                      <RouteErrorBoundary routeName="Reset Password">
                        <ResetPassword />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/setup-profile"
                    element={
                      <RouteErrorBoundary routeName="Profile Setup">
                        <ProfileSetup />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/message-board"
                    element={
                      <RouteErrorBoundary routeName="Message Board">
                        <MessageBoard />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/my-team"
                    element={
                      <RouteErrorBoundary routeName="My Team">
                        <MyTeam />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/help"
                    element={
                      <RouteErrorBoundary routeName="Help">
                        <Help />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/contact"
                    element={
                      <RouteErrorBoundary routeName="Contact">
                        <Contact />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/compare"
                    element={
                      <RouteErrorBoundary routeName="Compare">
                        <Compare />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/insights"
                    element={
                      <RouteErrorBoundary routeName="Insights">
                        <Insights />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/matches/:matchId/live"
                    element={
                      <RouteErrorBoundary routeName="Live Scoring">
                        <LiveScoring />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="/oauth/consent"
                    element={
                      <RouteErrorBoundary routeName="OAuth Consent">
                        <OAuthConsent />
                      </RouteErrorBoundary>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <RouteErrorBoundary routeName="Page Not Found">
                        <NotFound />
                      </RouteErrorBoundary>
                    }
                  />
                </Routes>
                <RouteFocusManager mainRef={mainRef} />
              </Suspense>
            </RouteErrorBoundary>
          </main>
        </PageTransition>
        <AppNavigation />
        <Footer />
      </div>
    </NavigationProvider>
  );
};

/**
 * framer-motion setup.
 *
 * `LazyMotion` keeps the bundle small by loading only DOM animation features.
 * `reducedMotion="user"` makes every framer-motion animation honour the
 * operating system's reduce-motion setting; CSS animation is handled by the
 * block at the end of `src/index.css`.
 */
const MotionProviders = ({ children }: { children: React.ReactNode }) => (
  <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);

/** Provides top-level app providers and the browser router. */
const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MotionProviders>
            <TooltipProvider>
              <Toaster />
              <BrowserRouter>
                <AuthProvider>
                  <AppContent />
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </MotionProviders>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
