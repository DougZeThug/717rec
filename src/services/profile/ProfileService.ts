import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
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

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    // Return null (unknown) rather than throwing — a failed availability
    // check is a best-effort UI hint, not a critical error.
    return { available: null };
  }

  return { available: !data };
};

export const updateProfile = async (userId: string, data: ProfileFormData): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({
      username: data.username,
      full_name: data.fullName || null,
    })
    .eq('id', userId);

  if (error) {
    handleDatabaseError(error, 'Failed to update profile');
  }
};
