import type { PostgrestError } from '@supabase/supabase-js';

// The zod schema itself lives in src/components/profile/profileSchema.ts,
// next to the only form that runs it, so zod stays out of the main bundle.
import type { ProfileFormData } from '@/components/profile/profileSchema';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/types/user';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

interface UsernameAvailabilityResult {
  available: boolean | null;
}

interface IsUsernameTakenArgs {
  p_username: string;
}

/**
 * Calls is_username_taken through a narrowed signature.
 *
 * `types.ts` is generated from the live database and must not be hand-edited,
 * so it does not know this function until
 * `20260927120000_is_username_taken.sql` is applied and the types are
 * regenerated -- see the runbook in `docs/OPERATIONS.md`. Without this,
 * `npm run typecheck` fails on a call that is valid at runtime.
 *
 * REMOVE THIS once the types carry the function: delete the cast and this
 * interface and call `supabase.rpc('is_username_taken', { p_username: username })`
 * directly.
 *
 * The argument name is still checked, against the interface above. Only the
 * function name goes unchecked, and PostgREST checks that at runtime -- a
 * wrong one comes back as PGRST202, which reads below as "unknown", not "free".
 */
const callIsUsernameTaken = (args: IsUsernameTakenArgs) =>
  (
    supabase.rpc as unknown as (
      fn: 'is_username_taken',
      rpcArgs: IsUsernameTakenArgs
    ) => Promise<{ data: boolean | null; error: PostgrestError | null }>
  )('is_username_taken', args);

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
    // Asked of the database rather than read from profiles. RLS lets a player
    // read only their own row, so the read found nothing for a name another
    // player owned, and every such name came back as available.
    const { data, error } = await callIsUsernameTaken({ p_username: username });

    if (error) {
      errorLog('Failed to check username availability:', error);
      return { available: null };
    }

    return { available: typeof data === 'boolean' ? !data : null };
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
      // Returns null when no data exists yet (not an error) — caller renders an empty state.
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
