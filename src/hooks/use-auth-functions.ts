import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useThemeConsistency } from "./use-theme-consistency";
import { AuthResponse } from "@/types/auth";
import { WeakPasswordReasons } from "@supabase/supabase-js";
import { loginWithGoogleNative as nativeGoogleLogin } from "@/utils/nativeAuth";

export const useAuthFunctions = () => {
  const navigate = useNavigate();
  const { ensureThemeConsistency } = useThemeConsistency();
  const [authError, setAuthError] = useState<string | null>(null);

  // Clear authentication error
  const clearAuthError = () => {
    setAuthError(null);
  };

  // Handle authentication errors
  const handleAuthError = (error: Error, context: string) => {
    const errorMessage = error.message || `An error occurred during ${context}`;
    setAuthError(errorMessage);
    console.error(`Error during ${context}:`, error);
    
    // Also show a toast for immediate feedback
    toast({
      title: `${context} failed`,
      description: errorMessage,
      variant: "destructive",
    });
    
    return errorMessage;
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      clearAuthError();
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      // Apply theme consistency after successful login
      ensureThemeConsistency();
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in",
      });

      return {
        user: data.user,
        session: data.session,
        weakPassword: null
      };
    } catch (error) {
      // Handle specific error codes with user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes("Email not confirmed")) {
          handleAuthError(new Error("Please check your email to confirm your account"), "Login");
        } else if (error.message.includes("Invalid login credentials")) {
          handleAuthError(new Error("Incorrect email or password"), "Login");
        } else {
          handleAuthError(error, "Login");
        }
      } else {
        handleAuthError(new Error("An unexpected error occurred"), "Login");
      }
      
      // Return null values on error
      return { user: null, session: null, weakPassword: null };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      clearAuthError();
      const { error, data } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        throw error;
      }

      // Apply theme consistency after successful signup
      ensureThemeConsistency();

      toast({
        title: "Account created",
        description: "Please check your email to confirm your account",
      });
      
      // Use type assertion to access any potential weakPassword info
      // Since the Supabase types don't include this property directly
      const signUpData = data as unknown as { 
        user: typeof data.user; 
        session: typeof data.session; 
        weakPassword?: WeakPasswordReasons 
      };
      
      return {
        user: data.user,
        session: data.session,
        weakPassword: signUpData.weakPassword || null
      };
    } catch (error) {
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          handleAuthError(new Error("This email is already registered. Try logging in instead"), "Sign up");
        } else {
          handleAuthError(error, "Sign up");
        }
      } else {
        handleAuthError(new Error("An unexpected error occurred"), "Sign up");
      }
      
      // Return null values on error
      return { user: null, session: null, weakPassword: null };
    }
  };

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

  // Sign out
  const signOut = async () => {
    try {
      clearAuthError();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, "Logout");
      } else {
        handleAuthError(new Error("Failed to log out"), "Logout");
      }
      throw error;
    }
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
