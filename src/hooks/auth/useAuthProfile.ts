import { User } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';
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
    try {
      const profileData = await fetchProfile(user.id);
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
