import { LockIcon } from 'lucide-react';
import React, { useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/ui/error-display';
import { useAuth } from '@/contexts/auth-context';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { authLog } from '@/utils/logger';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const { user, authInitialized, profile } = useAuth();
  const { isAdminAccessGranted, accessCheckFailed, retryAccessCheck, isLoading } = useAdminAccess();
  const location = useLocation();

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

  // Still loading auth or profile
  if (!authInitialized || isLoading) {
    authLog('Loading state - waiting for auth/profile');
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    authLog('Not logged in, redirecting to auth');
    // The whole address, not just the path: the section's query and anchor
    // survive the sign-in, so the person lands back where they were.
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/auth" state={{ returnTo }} replace />;
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

  // Logged in but not an admin. A page that stays, not a redirect with a toast
  // that is gone in five seconds: the person keeps an explanation and a way on.
  if (!isAdminAccessGranted) {
    authLog(`Admin access DENIED for ${user.email}`);
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh] supports-[height:60dvh]:min-h-[60dvh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <LockIcon className="size-10 mx-auto text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-semibold">Admins only</h1>
            <p className="text-sm text-muted-foreground">
              You are signed in as {user.email}, and this account does not have admin access. If you
              should have it, ask a league admin to turn it on.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to="/">Back to home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Contact the league</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has admin access
  authLog('Admin access granted, rendering content');
  return children;
};

export default ProtectedAdminRoute;
