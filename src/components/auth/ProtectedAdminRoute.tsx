import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  
  // Log whenever component mounts or updates
  useEffect(() => {
    authLog("ProtectedAdminRoute - Mount/Update", {
      authInitialized,
      userEmail: user?.email,
      isAdmin: isAdminAccessGranted,
      isLoading
    });
    
    // Only show admin access debug message if user exists and initial auth check is complete
    if (authInitialized && user) {
      if (isAdminAccessGranted) {
        authLog(`Admin access GRANTED for ${user.email}`);
        // Clear any previous access denied toasts
        setShowAccessDenied(false);
      } else if (!isLoading && initialCheckComplete) {
        // Only show access denied after loading is complete AND we've waited for profile
        authLog(`Admin access DENIED for ${user.email}`);
        setShowAccessDenied(true);
      }
    }
  }, [authInitialized, user, isAdminAccessGranted, isLoading, profile, initialCheckComplete]);

  // Add a delay before considering initial check complete to give time for profile loading
  useEffect(() => {
    if (authInitialized && user) {
      const timer = setTimeout(() => {
        authLog("Initial check timeout complete");
        setInitialCheckComplete(true);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
  }, [authInitialized, user]);
  
  // Show toast if access denied (after initial checks are complete)
  useEffect(() => {
    if (showAccessDenied) {
      toast({
        title: "Access Denied", 
        description: "You do not have admin privileges",
        variant: "destructive"
      });
    }
  }, [showAccessDenied]);

  // Still loading auth or admin status
  if (!authInitialized || isLoading) {
    authLog("Loading state");
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
  
  // Logged in but not an admin and initial check is done
  if (!isAdminAccessGranted && initialCheckComplete) {
    authLog("Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }
  
  // User is logged in and has admin access or we're still waiting for the final check
  authLog("Access granted or still checking, rendering admin content");
  return <>{children}</>;
};

export default ProtectedAdminRoute;
