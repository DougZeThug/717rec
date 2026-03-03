import { User } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';
import { NavigateFunction } from 'react-router';

import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from '@/types/errors';
import { UserProfile } from '@/types/user';

/**
 * Hook for managing user profile state and operations
 */
export const useAuthProfile = (user: User | null, navigate: NavigateFunction) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(false);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, created_at, is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned — valid for new users who don't have a profile yet
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to fetch profile: ${error.message}`, { code: error.code });
    }

    return data as UserProfile;
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
