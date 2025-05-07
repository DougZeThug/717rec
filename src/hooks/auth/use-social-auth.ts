
import { supabase } from "@/integrations/supabase/client";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
import { toast } from "@/hooks/use-toast";
import { useAuthError } from "./use-auth-error";
import { loginWithGoogleNative as nativeGoogleLogin } from "@/utils/nativeAuth";

export const useSocialAuth = () => {
  const { ensureThemeConsistency } = useThemeConsistency();
  const { handleAuthError, clearAuthError } = useAuthError();

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      clearAuthError();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/setup-profile`,
        },
      });
      
      if (error) {
        throw error;
      }
      
      // Theme consistency will be applied after redirect completes
      return true;
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, "Google login");
      } else {
        handleAuthError(new Error("Failed to initialize Google login"), "Google login");
      }
      throw error;
    }
  };

  // Sign in with Google Native (for mobile apps)
  const signInWithGoogleNative = async () => {
    try {
      clearAuthError();
      
      const result = await nativeGoogleLogin();
      
      if (result.success && result.user) {
        // Apply theme consistency after successful login
        ensureThemeConsistency();
        
        toast({
          title: "Welcome!",
          description: "You've successfully logged in with Google",
        });
        
        return result;
      } else {
        const errorMessage = result.error?.message || "Failed to login with Google";
        handleAuthError(new Error(errorMessage), "Native Google login");
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, "Native Google login");
      } else {
        handleAuthError(new Error("An unexpected error occurred"), "Native Google login");
      }
      
      return { success: false, error };
    }
  };

  return {
    signInWithGoogle,
    signInWithGoogleNative
  };
};
