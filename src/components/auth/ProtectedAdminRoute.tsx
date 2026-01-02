import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { toast } from "@/hooks/use-toast";
import { authLog } from "@/utils/logger";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, authInitialized, profile } = useAuth();
  const { isAdminAccessGranted, isLoading } = useAdminAccess();
  const location = useLocation();
  const [hasShownDeniedToast, setHasShownDeniedToast] = useState(false);
  
  // Log state changes for debugging
  useEffect(() => {
    authLog("ProtectedAdminRoute - State", {
      authInitialized,
      userEmail: user?.email,
      isAdmin: isAdminAccessGranted,
      isLoading,
      hasProfile: !!profile
    });
  }, [authInitialized, user, isAdminAccessGranted, isLoading, profile]);
  
  // Show toast once when access is denied (after all loading completes)
  useEffect(() => {
    if (!isLoading && authInitialized && user && !isAdminAccessGranted && !hasShownDeniedToast) {
      authLog(`Admin access DENIED for ${user.email}`);
      toast({
        title: "Access Denied", 
        description: "You do not have admin privileges",
        variant: "destructive"
      });
      setHasShownDeniedToast(true);
    }
  }, [isLoading, authInitialized, user, isAdminAccessGranted, hasShownDeniedToast]);

  // Still loading auth or profile
  if (!authInitialized || isLoading) {
    authLog("Loading state - waiting for auth/profile");
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
    authLog("Not logged in, redirecting to auth");
    return <Navigate to="/auth" state={{ returnTo: location.pathname }} replace />;
  }
  
  // Logged in but not an admin
  if (!isAdminAccessGranted) {
    authLog("Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }
  
  // User has admin access
  authLog("Admin access granted, rendering content");
  return <>{children}</>;
};

export default ProtectedAdminRoute;
