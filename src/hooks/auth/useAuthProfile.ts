import { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigateFunction } from 'react-router';

import { fetchAuthProfile } from '@/services/profile/ProfileService';
import { UserProfile } from '@/types/user';
import { sanitizeReturnTo } from '@/utils/auth/sanitizeReturnTo';
import { errorLog } from '@/utils/logger';

// Routes the user must be allowed to finish before anything else. A recovery
// link signs the user in, so a member who never picked a username would
// otherwise be redirected to profile setup and never reach the form that sets
// their new password. See UX audit X-04.
const PROFILE_SETUP_EXEMPT_PATHS = ['/reset-password'];

/** Wait this long before the single automatic retry of a failed profile read. */
const PROFILE_RETRY_DELAY_MS = 800;

const PROFILE_SETUP_PATH = '/setup-profile';

/**
 * The `?next=` to carry into profile setup, or '' when there is nothing worth
 * carrying.
 *
 * Google sign-in bakes the destination into its OAuth redirect as
 * `/setup-profile?next=...` so it survives the round trip, and this check fires
 * straight afterwards. Navigating to a bare `/setup-profile` threw that away,
 * and setup reads its destination only from its own URL — so every new member
 * arriving from a deep link finished setup on the home page instead.
 *
 * A next already on the URL wins; otherwise the page the member is standing on
 * is the destination. Sanitized before it is written, so an off-site
 * destination is never even stored in the link.
 */
const profileSetupNextQuery = (): string => {
  if (typeof window === 'undefined') return '';

  const { pathname, search, hash } = window.location;
  const candidate =
    new URLSearchParams(search).get('next') ??
    (pathname !== PROFILE_SETUP_PATH ? `${pathname}${search}${hash}` : null);
  if (!candidate) return '';

  // sanitizeReturnTo falls back to '/', which is where setup would send them
  // anyway — so treat it as nothing to carry.
  const safeNext = sanitizeReturnTo(candidate);
  return safeNext === '/' ? '' : `?next=${encodeURIComponent(safeNext)}`;
};

/**
 * A `setProfile` updater that keeps the held profile only while it belongs to
 * `userId`, and drops it otherwise.
 *
 * The profile is what the app answers "is this person an admin?" from, so one
 * left behind by whoever was signed in before is not merely out of date — it
 * answers the question about the wrong person. The profile used to be cleared
 * only on sign-out, so signing in as somebody else, or failing to read their
 * profile, left the previous one in place.
 *
 * Written as an updater rather than a plain comparison so the decision is made
 * against whatever is actually held at the moment React applies it, which the
 * callers cannot see from inside an async fetch.
 */
export const keepProfileOnlyFor =
  (userId: string | null) =>
  (held: UserProfile | null): UserProfile | null =>
    held && userId && held.id === userId ? held : null;

/**
 * Hook for managing user profile state and operations
 */
export const useAuthProfile = (user: User | null, navigate: NavigateFunction) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);
  // Separates "the profile read failed" from "this user has no profile row".
  // fetchAuthProfile returns null only for PGRST116 (no row yet) and throws for
  // every real error, so without this flag a dropped request is
  // indistinguishable from a non-admin profile — see useAdminAccess.
  const [profileLoadFailed, setProfileLoadFailed] = useState<boolean>(false);

  // Track current user ID via ref to detect cross-tab user changes during async operations
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user]);

  // Fetch user profile from database, retrying once before giving up so a
  // single dropped request cannot read as "not an admin".
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      return await fetchAuthProfile(userId);
    } catch (firstError) {
      errorLog('Profile fetch failed, retrying once:', firstError);
      await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAY_MS));
      // A second failure throws to the caller, which records profileLoadFailed.
      return await fetchAuthProfile(userId);
    }
  }, []);

  // Check if user needs profile setup (missing username)
  const checkProfileSetup = useCallback(
    (profileData: UserProfile | null) => {
      if (profileData?.username) return;
      if (
        typeof window !== 'undefined' &&
        PROFILE_SETUP_EXEMPT_PATHS.includes(window.location.pathname)
      ) {
        return;
      }
      navigate(`/setup-profile${profileSetupNextQuery()}`);
    },
    [navigate]
  );

  // Refresh current user's profile. Doubles as the "Try again" action behind a
  // failed access check, so it owns the loading and failure flags.
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const fetchUserId = user.id;
    setIsProfileLoading(true);
    try {
      const profileData = await fetchProfile(fetchUserId);
      if (currentUserIdRef.current !== fetchUserId) return; // Abort if user changed during fetch
      setProfile(profileData);
      setProfileLoadFailed(false);
    } catch (error) {
      errorLog('Failed to refresh profile:', error);
      if (currentUserIdRef.current !== fetchUserId) return;
      // Never leave somebody else's profile behind on a failed read: this is
      // the "Try again" action behind a failed access check, so holding the
      // previous user's profile here would keep answering for them.
      setProfile(keepProfileOnlyFor(fetchUserId));
      setProfileLoadFailed(true);
    } finally {
      if (currentUserIdRef.current === fetchUserId) setIsProfileLoading(false);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    setProfile,
    isProfileLoading,
    setIsProfileLoading,
    profileLoadFailed,
    setProfileLoadFailed,
    fetchProfile,
    checkProfileSetup,
    refreshProfile,
  };
};
