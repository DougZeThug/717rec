import { Session, User } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { useThemeConsistency } from '@/hooks/useThemeConsistency';
import { toast } from '@/hooks/useToast';
import { getAuthSession, onAuthStateChange } from '@/services/auth/AuthService';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { authLog, errorLog } from '@/utils/logger';

import { useAuthMethods } from './useAuthMethods';
import { keepProfileOnlyFor, useAuthProfile } from './useAuthProfile';
import { handleAuthError as handleAuthErrorUtil } from './utils/authErrorHandler';

/**
 * Consolidated auth hook that manages:
 * - Session/user state
 * - Profile fetching
 * - Email auth (sign in, sign up, sign out)
 * - Social auth (Google)
 * - Error handling
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { ensureThemeConsistency } = useThemeConsistency();

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Clear auth error
  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Handle auth errors with toast
  const handleAuthError = useCallback((error: Error, context: string) => {
    return handleAuthErrorUtil(error, context, setAuthError);
  }, []);

  // Profile hook
  const {
    profile,
    setProfile,
    isProfileLoading,
    setIsProfileLoading,
    profileLoadFailed,
    setProfileLoadFailed,
    fetchProfile,
    checkProfileSetup,
    refreshProfile,
  } = useAuthProfile(user, navigate);

  // Auth methods
  const { signIn, signUp, signOut, signInWithGoogle, signInWithGoogleNative } = useAuthMethods(
    clearAuthError,
    ensureThemeConsistency,
    handleAuthError,
    navigate
  );

  // Initialize auth state - kept inline due to complex dependencies
  useEffect(() => {
    authLog('Initializing auth state...');
    let retryCount = 0;
    const maxRetries = 2;
    let isCancelled = false; // Track if effect is cleaned up or session changed
    let currentUserId: string | null = null; // Track which user's profile we're fetching

    /**
     * Timers this effect has started and not yet run, so the cleanup below can
     * cancel them.
     *
     * Both callbacks already check `isCancelled` and do nothing once the effect
     * is torn down, so nothing was leaking state. What was left was a timer
     * still scheduled against a discarded effect — flagged by React Doctor as
     * `effect-needs-cleanup`. The deferred profile fetch starts one on every
     * auth event, so ids are dropped as they fire rather than accumulating for
     * as long as the session lasts.
     */
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const defer = (run: () => unknown, ms: number) => {
      const id = setTimeout(() => {
        pendingTimers.delete(id);
        run();
      }, ms);
      pendingTimers.add(id);
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = onAuthStateChange((event, currentSession) => {
      authLog('Auth state changed:', event);

      // Update the current user ID to track which profile fetch is valid
      const newUserId = currentSession?.user?.id ?? null;
      currentUserId = newUserId;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession) {
        authLog('No session, clearing profile');
        setProfile(null);
        setIsProfileLoading(false);
      } else if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'PASSWORD_RECOVERY'
      ) {
        authLog(`Fetching profile for event: ${event}, user: ${currentSession.user.email}`);
        ensureThemeConsistency();

        // Capture the user ID for this specific fetch operation
        const fetchUserId = currentSession.user.id;

        // Drop a profile belonging to whoever was signed in before, now rather
        // than when the new one arrives. `user` has already moved on two lines
        // above, so holding the old profile across the fetch would answer the
        // admin question about the wrong person. Keeps the profile untouched
        // when the user has not changed, which is the ordinary case for
        // TOKEN_REFRESHED and INITIAL_SESSION.
        setProfile(keepProfileOnlyFor(fetchUserId));

        // Set loading state BEFORE deferring to prevent race condition
        setIsProfileLoading(true);

        // Deferred to prevent Supabase auth deadlocks
        defer(async () => {
          // Skip if effect was cleaned up or user changed since this fetch started
          if (isCancelled || currentUserId !== fetchUserId) {
            authLog('Skipping stale profile fetch for user:', fetchUserId);
            if (!isCancelled && currentUserId === null) setIsProfileLoading(false);
            return;
          }

          try {
            const profileData = await fetchProfile(fetchUserId);

            // Double-check we're still fetching for the current user
            if (isCancelled || currentUserId !== fetchUserId) {
              authLog('Discarding stale profile data for user:', fetchUserId);
              return;
            }

            authLog('Profile loaded successfully:', {
              username: profileData?.username,
              full_name: profileData?.full_name,
              is_admin: profileData?.is_admin,
            });
            setProfile(profileData);
            setProfileLoadFailed(false);

            if (event === 'SIGNED_IN') {
              checkProfileSetup(profileData);
            }
          } catch (error) {
            // Only show error if this fetch is still relevant
            if (!isCancelled && currentUserId === fetchUserId) {
              // A failed read must leave nothing behind that answers for
              // somebody else. With the profile gone, profileLoadFailed reads
              // as "we could not check" and the retry card is shown.
              setProfile(keepProfileOnlyFor(fetchUserId));
              // Record the failure so a dropped request is not mistaken for
              // "not an admin" (see useAdminAccess / ProtectedAdminRoute).
              setProfileLoadFailed(true);
              errorLog(`Error fetching user profile for ${event}:`, error);
              if (event === 'SIGNED_IN') {
                toast({
                  title: 'Profile error',
                  description: getUIErrorMessage(error, 'Failed to load your profile data'),
                  variant: 'destructive',
                });
              }
            }
          } finally {
            // Only update loading state if this fetch is still relevant
            if (!isCancelled && currentUserId === fetchUserId) {
              setIsProfileLoading(false);
            }
          }
        }, 0);
      }

      // Supabase types this callback as Promise-returning; async work is deferred above.
      return Promise.resolve();
    });

    const initializeAuth = async () => {
      // Skip if effect has been cleaned up
      if (isCancelled) {
        authLog('initializeAuth: skipping because effect was cleaned up');
        return;
      }

      setIsLoading(true);

      try {
        authLog(`Checking for session (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await getAuthSession();

        // Skip if cleaned up or user changed during getSession
        if (isCancelled) {
          authLog('initializeAuth: skipping after getSession because effect was cleaned up');
          return;
        }

        if (sessionError) throw sessionError;

        authLog('Session check result:', currentSession ? 'Session found' : 'No session');

        // Update tracked user ID
        const fetchUserId = currentSession?.user?.id ?? null;
        currentUserId = fetchUserId;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          ensureThemeConsistency();

          setIsProfileLoading(true);
          try {
            const profileData = await fetchProfile(currentSession.user.id);

            // Only set profile if we're still fetching for the same user and not cancelled
            if (!isCancelled && currentUserId === fetchUserId) {
              authLog('initializeAuth: setting profile for user:', fetchUserId);
              setProfile(profileData);
              setProfileLoadFailed(false);
              checkProfileSetup(profileData);
            } else {
              authLog('initializeAuth: discarding stale profile data for user:', fetchUserId);
            }
          } catch (profileError) {
            // Only log error if this fetch is still relevant
            if (!isCancelled && currentUserId === fetchUserId) {
              // As in the listener above: never keep a profile that belongs to
              // anyone but this user, least of all on a failed read.
              setProfile(keepProfileOnlyFor(fetchUserId));
              // Record the failure so a dropped request is not mistaken for
              // "not an admin" (see useAdminAccess / ProtectedAdminRoute).
              setProfileLoadFailed(true);
              errorLog('Error fetching initial profile:', profileError);
            }
          } finally {
            // Only update loading state if this fetch is still relevant
            if (!isCancelled && currentUserId === fetchUserId) {
              setIsProfileLoading(false);
            }
          }
        }

        // Only update state if not cancelled
        if (!isCancelled) {
          setAuthInitialized(true);
          setIsLoading(false);
        }
      } catch (error) {
        errorLog('Error checking session:', error);

        if (retryCount < maxRetries && !isCancelled) {
          retryCount++;
          authLog(`Retrying session check in 1s (attempt ${retryCount + 1}/${maxRetries + 1})`);
          defer(() => {
            // Check cancellation before retrying
            if (!isCancelled) {
              initializeAuth();
            } else {
              authLog('initializeAuth: skipping retry because effect was cleaned up');
            }
          }, 1000);
        } else {
          authLog('Max retries reached, marking auth as initialized');
          if (!isCancelled) {
            setAuthInitialized(true);
            setIsLoading(false);
          }
        }
      }
    };

    initializeAuth();

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- auth session bootstrap, must run once on mount
  }, []);

  return {
    // State
    session,
    user,
    profile,
    isLoading,
    isProfileLoading,
    profileLoadFailed,
    authInitialized,
    authError,
    // Actions
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGoogleNative,
    refreshProfile,
    clearAuthError,
  };
};
