
import { User } from "@supabase/supabase-js";
import { useAuthFunctions } from "@/hooks/use-auth-functions";
import { AuthResponse } from "@/types/auth";

export const useAuthActions = () => {
  const { 
    signIn: authSignIn, 
    signUp: authSignUp, 
    signInWithGoogle: authSignInWithGoogle,
    signInWithGoogleNative: authSignInWithGoogleNative,
    signOut: authSignOut, 
    authError, 
    clearAuthError 
  } = useAuthFunctions();

  // Wrapper for signIn to match the interface
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    return authSignIn(email, password);
  };
  
  // Wrapper for signUp to match the interface
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    return authSignUp(email, password);
  };
  
  // Wrapper for signInWithGoogle
  const signInWithGoogle = async (): Promise<void> => {
    await authSignInWithGoogle();
  };
  
  // Wrapper for signInWithGoogleNative
  const signInWithGoogleNative = async () => {
    return authSignInWithGoogleNative();
  };
  
  // Wrapper for signOut
  const signOut = async (): Promise<void> => {
    await authSignOut();
  };

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
