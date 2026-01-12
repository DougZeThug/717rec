import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

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
  error?: string;
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
      errorLog('Error checking username:', error);
      return { available: null, error: error.message };
    }

    return { available: !data };
  } catch (error) {
    errorLog('Unexpected error checking username:', error);
    return { available: null, error: 'Unexpected error checking username' };
  }
};

export const updateProfile = async (
  userId: string,
  data: ProfileFormData,
): Promise<{ error?: string }> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        full_name: data.fullName || null,
      })
      .eq('id', userId);

    if (error) {
      errorLog('Error updating profile:', error);
      return { error: error.message };
    }

    return {};
  } catch (error) {
    errorLog('Unexpected error updating profile:', error);
    return { error: 'Unexpected error updating profile' };
  }
};
