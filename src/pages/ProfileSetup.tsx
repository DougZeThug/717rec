import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import PageLayout from '@/components/layout/PageLayout';
import ProfileForm from '@/components/profile/ProfileForm';
import ProfileLoadingState from '@/components/profile/ProfileLoadingState';
import TeamMembershipSection from '@/components/teams/TeamMembershipSection';
import PageTransition from '@/components/transitions/PageTransition';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { sanitizeReturnTo } from '@/utils/auth/sanitizeReturnTo';
import { authLog } from '@/utils/logger';

const ProfileSetup = () => {
  const { user, profile, refreshProfile, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = sanitizeReturnTo(searchParams.get('next') ?? undefined);
  const [retries, setRetries] = useState(0);
  const maxRetries = 3;

  // Handle auth state and redirects
  useEffect(() => {
    // If authentication is still initializing, wait
    if (!authInitialized) {
      authLog('Auth not initialized yet, waiting...');
      return;
    }

    // If authentication is no longer loading but we have no user
    if (!isLoading && !user) {
      if (retries < maxRetries) {
        // Try a few more times with a delay
        authLog(`No user found, retrying in 1s (${retries + 1}/${maxRetries})`);
        const timer = setTimeout(() => {
          setRetries((prev) => prev + 1);
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        // After max retries, redirect to auth
        authLog('Max retries reached, redirecting to auth');
        const returnTo =
          '/setup-profile' +
          (searchParams.get('next')
            ? `?next=${encodeURIComponent(searchParams.get('next')!)}`
            : '');
        navigate('/auth', { state: { returnTo } });
      }
    }
  }, [user, isLoading, authInitialized, navigate, retries, searchParams]);

  // If the profile is already complete and a `next` destination was requested
  // (e.g. after Google OAuth for a returning user), redirect straight there.
  useEffect(() => {
    if (!authInitialized || isLoading) return;
    if (user && profile?.username && nextPath && nextPath !== '/setup-profile') {
      authLog('Profile complete, redirecting to next:', nextPath);
      navigate(nextPath, { replace: true });
    }
  }, [authInitialized, isLoading, user, profile?.username, nextPath, navigate]);

  const handleProfileUpdated = async () => {
    await refreshProfile();
    navigate(nextPath && nextPath !== '/setup-profile' ? nextPath : '/');
  };

  // Show loading state while waiting for auth to initialize
  if (isLoading || (!authInitialized && retries < maxRetries)) {
    return (
      <PageLayout compact={true}>
        <PageTransition>
          <div className="flex justify-center items-center min-h-[calc(100dvh-200px)]">
            <ProfileLoadingState />
          </div>
        </PageTransition>
      </PageLayout>
    );
  }

  // No user after retries
  if (!user && retries >= maxRetries) {
    return null; // Will redirect in useEffect
  }

  return (
    <PageLayout compact={true}>
      <PageTransition>
        <div className="flex justify-center items-center min-h-[calc(100dvh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Set Up Your Profile</CardTitle>
              <CardDescription>Enter your name and details</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                initialUsername={profile?.username || ''}
                initialFullName={profile?.full_name || ''}
                onProfileUpdated={handleProfileUpdated}
              />

              {/* Team Membership Section */}
              {user && (
                <>
                  <Separator className="my-6" />
                  <TeamMembershipSection />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                This information will be visible to other players
              </p>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default ProfileSetup;
