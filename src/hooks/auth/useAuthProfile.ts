import { User } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigateFunction } from 'react-router';

import { fetchAuthProfile } from '@/services/profile/ProfileService';
import { UserProfile } from '@/types/user';
import { errorLog } from '@/utils/logger';

/**
 * Hook for managing user profile state and operations
 */
export const useAuthProfile = (user: User | null, navigate: NavigateFunction) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // Track current user ID via ref to detect cross-tab user changes during async operations
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = user?.id ?? null;
  }, [user]);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    return fetchAuthProfile(userId);
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

  // Refresh current user's profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const fetchUserId = user.id;
    try {
      const profileData = await fetchProfile(fetchUserId);
      if (currentUserIdRef.current !== fetchUserId) return; // Abort if user changed during fetch
      setProfile(profileData);
    } catch (error) {
      errorLog('Failed to refresh profile:', error);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    setProfile,
    isProfileLoading,
    setIsProfileLoading,
    fetchProfile,
    checkProfileSetup,
    refreshProfile,
  };
};
