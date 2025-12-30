import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTransition from "./components/transitions/PageTransition";
import LoadingState from "@/components/ui/loading-state";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AppNavigation from "./components/navigation/AppNavigation";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { routeLog } from "@/utils/logger";
import { initSentry } from "@/utils/sentry";
import { initAnalytics, trackPageView } from "@/utils/analytics";

// Initialize Sentry and Analytics on app load
initSentry();
initAnalytics();

// Lazy load all page components
const Index = lazy(() => import("./pages/Index"));
const Help = lazy(() => import("./pages/Help"));
const TeamsPage = lazy(() => import("./pages/TeamsPage"));
const TeamDetails = lazy(() => import("./pages/TeamDetails"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Stats = lazy(() => import("./pages/Stats"));
const Playoffs = lazy(() => import("./pages/Playoffs"));
const History = lazy(() => import("./pages/History"));
const Timeslots = lazy(() => import("./pages/Timeslots"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const MessageBoard = lazy(() => import("./pages/MessageBoard"));
const MyTeam = lazy(() => import("./pages/MyTeam"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Contact = lazy(() => import("./pages/Contact"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  
  // Log every route change and track page views
  useEffect(() => {
    routeLog(`Navigating to: ${location.pathname}`);
    trackPageView(location.pathname);
  }, [location.pathname]);
  
  return (
    <NavigationProvider>
      <div className="flex flex-col min-h-screen overflow-x-hidden">
        <Navbar />
        <PageTransition>
          <main className="flex-grow">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh] py-8">
                <LoadingState message="Loading page..." size="lg" />
              </div>
            }>
              <Routes location={location}>
                <Route path="/" element={<Index />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/teams/:teamId" element={<TeamDetails />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/playoffs" element={<Playoffs />} />
                <Route path="/history" element={<History />} />
                <Route path="/timeslots" element={
                  <ProtectedAdminRoute>
                    <Timeslots />
                  </ProtectedAdminRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                } />
                <Route path="/auth" element={<Auth />} />
                <Route path="/setup-profile" element={<ProfileSetup />} />
                <Route path="/message-board" element={<MessageBoard />} />
                <Route path="/my-team" element={<MyTeam />} />
                <Route path="/help" element={<Help />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </PageTransition>
        <AppNavigation />
        <Footer />
      </div>
    </NavigationProvider>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
