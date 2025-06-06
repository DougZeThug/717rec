
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import PageTransition from "./components/transitions/PageTransition";
import Index from "./pages/Index";
import TeamsPage from "./pages/TeamsPage";
import Schedule from "./pages/Schedule";
import Stats from "./pages/Stats";
import Playoffs from "./pages/Playoffs";
import Timeslots from "./pages/Timeslots";
import TeamDetails from "./pages/TeamDetails";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import MessageBoard from "./pages/MessageBoard";
import MyTeam from "./pages/MyTeam";
import NotFound from "./pages/NotFound";
import History from "./pages/History";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import AppNavigation from "./components/navigation/AppNavigation";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";

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
  console.log(`App routing to: ${location.pathname}`);
  
  return (
    <NavigationProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <PageTransition>
          <main className="flex-grow">
            <Routes location={location}>
              <Route path="/" element={<Index />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:teamId" element={<TeamDetails />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/playoffs" element={<Playoffs />} />
              <Route path="/history" element={<History />} />
              <Route path="/timeslots" element={<Timeslots />} />
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
