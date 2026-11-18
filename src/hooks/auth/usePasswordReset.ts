import { resetPassword } from '@/services/auth/AuthService';

/**
 * The "email me a reset link" call for the forgot-password page.
 *
 * A plain pass-through on purpose, not `useMutation`: the page keeps its own
 * submit state and error text, and a mutation would pause offline.
 */
export const usePasswordReset = () => ({ sendResetEmail: resetPassword });
