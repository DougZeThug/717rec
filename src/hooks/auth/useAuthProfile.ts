import { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigateFunction } from 'react-router';

import { fetchAuthProfile } from '@/services/profile/ProfileService';
import { UserProfile } from '@/types/user';
import { errorLog } from '@/utils/logger';

/** Wait this long before the single automatic retry of a failed profile read. */
const PROFILE_RETRY_DELAY_MS = 800;

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
      if (!profileData || !profileData.username) {
        navigate('/setup-profile');
      }
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
