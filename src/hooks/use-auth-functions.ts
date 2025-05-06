
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useThemeConsistency } from "./use-theme-consistency";

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
  const signIn = async (email: string, password: string) => {
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

      return data;
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
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
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
      
      return data;
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
      throw error;
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
    signOut,
    authError,
    clearAuthError
  };
};
