import React, { useEffect, useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router';

import { ErrorDisplay } from '@/components/ui/error-display';
import { useAuth } from '@/contexts/auth-context';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { toast } from '@/hooks/useToast';
import { authLog } from '@/utils/logger';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, authInitialized, profile } = useAuth();
  const { isAdminAccessGranted, accessCheckFailed, retryAccessCheck, isLoading } = useAdminAccess();
  const location = useLocation();
  const hasShownDeniedToastRef = useRef(false);

  // Log state changes for debugging
  useEffect(() => {
    authLog('ProtectedAdminRoute - State', {
      authInitialized,
      userEmail: user?.email,
      isAdmin: isAdminAccessGranted,
      accessCheckFailed,
      isLoading,
      hasProfile: !!profile,
    });
  }, [authInitialized, user, isAdminAccessGranted, accessCheckFailed, isLoading, profile]);

  // Show toast once when access is denied (after all loading completes).
  // Never fires when the profile failed to load — that is a connection problem,
  // not a permissions one, and saying "Access Denied" there would be false.
  useEffect(() => {
    if (
      !isLoading &&
      authInitialized &&
      user &&
      !accessCheckFailed &&
      !isAdminAccessGranted &&
      !hasShownDeniedToastRef.current
    ) {
      authLog(`Admin access DENIED for ${user.email}`);
      toast({
        title: 'Access Denied',
        description: 'You do not have admin privileges',
        variant: 'destructive',
      });
      hasShownDeniedToastRef.current = true;
    }
  }, [isLoading, authInitialized, user, accessCheckFailed, isAdminAccessGranted]);

  // Still loading auth or profile
  if (!authInitialized || isLoading) {
    authLog('Loading state - waiting for auth/profile');
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    authLog('Not logged in, redirecting to auth');
    return <Navigate to="/auth" state={{ returnTo: location.pathname }} replace />;
  }

  // The profile did not load, so we cannot tell whether this user is an admin.
  // Keep them here with a way to retry instead of redirecting them away with a
  // message that wrongly says they lack the rights.
  if (accessCheckFailed) {
    authLog('Access check failed - profile did not load');
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="w-full max-w-md text-center">
          <ErrorDisplay
            variant="card"
            context="Checking your admin access"
            error="We could not load your profile. This is usually a connection problem, not a permissions problem."
            onRetry={retryAccessCheck}
          />
          <Link to="/" className="mt-4 inline-block text-sm text-muted-foreground hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  // Logged in but not an admin
  if (!isAdminAccessGranted) {
    authLog('Not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // User has admin access
  authLog('Admin access granted, rendering content');
  return children;
};

export default ProtectedAdminRoute;
