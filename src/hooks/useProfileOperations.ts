import { useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

interface UsernameCheckResult {
  isAvailable: boolean | null;
  isChecking: boolean;
  checkUsername: (username: string, currentUsername?: string) => Promise<boolean>;
}

interface ProfileUpdateResult {
  updateProfile: (userId: string, data: { username: string; fullName?: string }) => Promise<void>;
}

export const useUsernameAvailability = (): UsernameCheckResult => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkUsername = async (username: string, currentUsername?: string): Promise<boolean> => {
    if (username.length < 3) {
      setIsAvailable(null);
      return false;
    }

    try {
      setIsChecking(true);

      // Skip check if it's the current username
      if (currentUsername && currentUsername === username) {
        setIsAvailable(true);
        return true;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        errorLog('Error checking username:', error);
        setIsAvailable(null);
        return false;
      }

      const available = !data;
      setIsAvailable(available);
      return available;
    } catch (error) {
      errorLog('Unexpected error checking username:', error);
      setIsAvailable(null);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isAvailable,
    isChecking,
    checkUsername,
  };
};

export const useProfileUpdate = (): ProfileUpdateResult => {
  const updateProfile = async (
    userId: string,
    data: { username: string; fullName?: string }
  ): Promise<void> => {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        full_name: data.fullName || null,
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  };

  return {
    updateProfile,
  };
};
