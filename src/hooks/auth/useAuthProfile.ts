import { User } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';
import { NavigateFunction } from 'react-router';

import { supabase } from '@/integrations/supabase/client';
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
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      if (error) {
        errorLog('Error fetching profile:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      errorLog('Unexpected error fetching profile:', error);
      return null;
    }
  }, []);

  // Check if user needs profile setup (missing username)
  const checkProfileSetup = useCallback(
    (profileData: UserProfile | null) => {
      if (profileData && !profileData.username) {
        navigate('/setup-profile');
      }
    },
    [navigate]
  );

  // Refresh current user's profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
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
