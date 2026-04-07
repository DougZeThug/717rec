import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/user';
import { handleDatabaseError } from '@/utils/errorHandler';

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, 'First name must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'First name can only contain letters, numbers, and underscores'),
  fullName: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

interface UsernameAvailabilityResult {
  available: boolean | null;
}

export const checkUsernameAvailability = async ({
  username,
  currentUsername,
}: {
  username: string;
  currentUsername?: string;
}): Promise<UsernameAvailabilityResult> => {
  if (username.length < 3) {
    return { available: null };
  }

  if (currentUsername === username) {
    return { available: true };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      errorLog('Failed to check username availability:', error);
      return { available: null };
    }

    return { available: !data };
  } catch (err) {
    errorLog('Unexpected error checking username availability:', err);
    return { available: null };
  }
};

/**
 * Fetch a user's profile from the database.
 * Returns null for new users who don't have a profile yet (PGRST116).
 */
export const fetchAuthProfile = async (userId: string): Promise<UserProfile | null> => {
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
    handleDatabaseError(error, 'Failed to fetch profile');
  }

  return data as UserProfile;
};

export const updateProfile = async (userId: string, data: ProfileFormData): Promise<void> => {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    username: data.username,
    full_name: data.fullName || null,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to update profile');
  }
};
