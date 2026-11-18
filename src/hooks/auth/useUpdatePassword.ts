import { updatePassword } from '@/services/auth/AuthService';

/**
 * The "set a new password" call for the reset-password page.
 *
 * A plain pass-through on purpose, not `useMutation`: a mutation pauses offline
 * (the change would fire late) and keeps the password in the mutation cache.
 */
export const useUpdatePassword = () => ({ setNewPassword: updatePassword });
