import { checkUsernameAvailability, updateProfile } from '@/services/profile/ProfileService';

/**
 * The two profile calls the profile form makes: check a display name, and save.
 *
 * Plain pass-throughs on purpose, not `useQuery` or `useMutation`: the form owns
 * the debounce, the stale-reply guard and the save state.
 */
export const useProfileActions = () => ({
  checkUsername: checkUsernameAvailability,
  saveProfile: updateProfile,
});
