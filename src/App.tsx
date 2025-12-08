import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTransition from "./components/transitions/PageTransition";
import LoadingState from "@/components/ui/loading-state";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AppNavigation from "./components/navigation/AppNavigation";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";
import { routeLog } from "@/utils/logger";

// Lazy load all page components
const Index = lazy(() => import("./pages/Index"));
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
  
  // Log every route change to help debug navigation issues
  routeLog(`Navigating to: ${location.pathname}`);
  
  return (
    <NavigationProvider>
      <div className="flex flex-col min-h-screen">
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
