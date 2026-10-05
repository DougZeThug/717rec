import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import PageLayout from '@/components/layout/PageLayout';
import ProfileLoadingState from '@/components/profile/ProfileLoadingState';
import ProfileSetupCard from '@/components/profile/ProfileSetupCard';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { useAuth } from '@/contexts/auth-context';
import { sanitizeReturnTo } from '@/utils/auth/sanitizeReturnTo';
import { authLog } from '@/utils/logger';

const ProfileSetup = () => {
  const { user, profile, refreshProfile, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawNext = searchParams.get('next');
  // `sanitizeReturnTo` falls back to '/', so on its own it cannot tell "nobody
  // asked to go anywhere" from "they asked for the home page". Only a
  // destination that was really asked for is sanitized; without one this is
  // null, and the page stays put and shows the form — which is what the Edit
  // Profile link in the user menu needs.
  const nextPath = rawNext ? sanitizeReturnTo(rawNext) : null;
  const [retries, setRetries] = useState(0);
  const maxRetries = 3;

  // Handle auth state and redirects
  useEffect(() => {
    // If authentication is still initializing, wait
    if (!authInitialized) {
      authLog('Auth not initialized yet, waiting...');
      return undefined;
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
        const next = searchParams.get('next');
        const returnTo = `/setup-profile${next ? `?next=${encodeURIComponent(next)}` : ''}`;
        navigate('/auth', { state: { returnTo } });
      }
    }

    return undefined;
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

  // Show loading state until auth is ready, and through the retry window when
  // there is no user. The retry counter only moves once auth is ready, so a gate
  // on `!authInitialized && retries < maxRetries` never held: the form showed
  // for the whole window before the redirect.
  if (isLoading || !authInitialized || (!user && retries < maxRetries)) {
    return (
      <PageLayout compact>
        {/* The form's own h1 is not on screen yet. A page with no h1 leaves a
            screen-reader user with nothing to say where they are. */}
        <h1 className="sr-only">Set Up Your Profile</h1>
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
    <PageLayout compact>
      <SeoHead
        title="Set Up Your Profile | 717REC"
        description="Pick your player name and join your team in the 717REC cornhole league."
        path="/setup-profile"
      />
      <PageTransition>
        <div className="flex justify-center items-center min-h-[calc(100dvh-200px)]">
          <ProfileSetupCard
            initialUsername={profile?.username || ''}
            initialFullName={profile?.full_name || ''}
            onProfileUpdated={handleProfileUpdated}
            showTeamMembership={Boolean(user)}
          />
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default ProfileSetup;
