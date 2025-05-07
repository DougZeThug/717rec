
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, authInitialized } = useAuth();
  const { isAdminAccessGranted, isLoading } = useAdminAccess();
  const location = useLocation();

  // Still loading auth or admin status
  if (!authInitialized || isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }
  
  // Not logged in
  if (!user) {
    return <Navigate to="/auth" state={{ returnTo: location.pathname }} replace />;
  }
  
  // Logged in but not an admin
  if (!isAdminAccessGranted) {
    return <Navigate to="/" replace />;
  }
  
  // User is logged in and has admin access
  return <>{children}</>;
};

export default ProtectedAdminRoute;
