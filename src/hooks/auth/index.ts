
import { WeakPasswordReasons } from "@supabase/supabase-js";
import { useEmailAuth } from "./use-email-auth";
import { useSocialAuth } from "./use-social-auth";
import { useAuthError } from "./use-auth-error";

export const useAuthFunctions = () => {
  const { authError, clearAuthError } = useAuthError();
  const { signIn, signUp, signOut } = useEmailAuth();
  const { signInWithGoogle, signInWithGoogleNative } = useSocialAuth();

  return {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGoogleNative,
    signOut,
    authError,
    clearAuthError
  };
};

export type { WeakPasswordReasons };
