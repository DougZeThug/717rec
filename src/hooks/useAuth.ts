
import { useState, useEffect, useCallback } from "react";
import { Session, User, WeakPasswordReasons } from "@supabase/supabase-js";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
import { toast } from "@/hooks/use-toast";
import { UserProfile } from "@/types/user";
import { AuthResponse } from "@/types/auth";
import { loginWithGoogleNative as nativeGoogleLogin } from "@/utils/nativeAuth";
import { authLog, errorLog } from "@/utils/logger";

/**
 * Consolidated auth hook that manages:
 * - Session/user state
 * - Profile fetching
 * - Email auth (sign in, sign up, sign out)
 * - Social auth (Google)
 * - Error handling
 */
export const useAuth = () => {
  const navigate = useNavigate();
  const { ensureThemeConsistency } = useThemeConsistency();

  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Clear auth error
  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Handle auth errors with toast
  const handleAuthError = useCallback((error: Error, context: string) => {
    const errorMessage = error.message || `An error occurred during ${context}`;
    setAuthError(errorMessage);
    errorLog(`Error during ${context}:`, error);
    
    toast({
      title: `${context} failed`,
      description: errorMessage,
      variant: "destructive",
    });
    
    return errorMessage;
  }, []);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        errorLog("Error fetching profile:", error);
        return null;
      }
      
      return data as UserProfile;
    } catch (error) {
      errorLog("Unexpected error fetching profile:", error);
      return null;
    }
  }, []);

  // Check if user needs profile setup
  const checkProfileSetup = useCallback((profileData: UserProfile | null) => {
    if (profileData && !profileData.username) {
      navigate("/setup-profile");
    }
  }, [navigate]);

  // Refresh current user's profile
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  }, [user, fetchProfile]);

  // Initialize auth state
  useEffect(() => {
    authLog("Initializing auth state...");
    let retryCount = 0;
    const maxRetries = 2;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        authLog("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (!currentSession) {
          authLog("No session, clearing profile");
          setProfile(null);
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
          authLog(`Fetching profile for event: ${event}, user: ${currentSession.user.email}`);
          ensureThemeConsistency();
          
          // Use setTimeout to prevent Supabase auth deadlocks
          setTimeout(async () => {
            try {
              const profileData = await fetchProfile(currentSession.user.id);
              authLog("Profile loaded successfully:", { 
                username: profileData?.username, 
                full_name: profileData?.full_name, 
                is_admin: profileData?.is_admin 
              });
              setProfile(profileData);
              
              if (event === 'SIGNED_IN') {
                checkProfileSetup(profileData);
              }
            } catch (error) {
              errorLog(`Error fetching user profile for ${event}:`, error);
              if (event === 'SIGNED_IN') {
                toast({
                  title: "Profile error",
                  description: "Failed to load your profile data",
                  variant: "destructive",
                });
              }
            }
          }, 0);
        }
      }
    );

    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        authLog(`Checking for session (attempt ${retryCount + 1}/${maxRetries + 1})`);
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        authLog("Session check result:", currentSession ? "Session found" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          ensureThemeConsistency();
          
          try {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            checkProfileSetup(profileData);
          } catch (profileError) {
            errorLog("Error fetching initial profile:", profileError);
          }
        }
        
        setAuthInitialized(true);
        setIsLoading(false);
      } catch (error) {
        errorLog("Error checking session:", error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          authLog(`Retrying session check in 1s (attempt ${retryCount + 1}/${maxRetries + 1})`);
          setTimeout(initializeAuth, 1000);
        } else {
          authLog("Max retries reached, marking auth as initialized");
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      clearAuthError();
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      ensureThemeConsistency();
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in",
      });

      return { user: data.user, session: data.session, weakPassword: null };
    } catch (error) {
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
      
      return { user: null, session: null, weakPassword: null };
    }
  }, [clearAuthError, ensureThemeConsistency, handleAuthError]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    try {
      clearAuthError();
      const { error, data } = await supabase.auth.signUp({ email, password });
      
      if (error) throw error;

      ensureThemeConsistency();

      toast({
        title: "Account created",
        description: "Please check your email to confirm your account",
      });
      
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
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          handleAuthError(new Error("This email is already registered. Try logging in instead"), "Sign up");
        } else {
          handleAuthError(error, "Sign up");
        }
      } else {
        handleAuthError(new Error("An unexpected error occurred"), "Sign up");
      }
      
      return { user: null, session: null, weakPassword: null };
    }
  }, [clearAuthError, ensureThemeConsistency, handleAuthError]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      clearAuthError();
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, "Logout");
      } else {
        handleAuthError(new Error("Failed to log out"), "Logout");
      }
      throw error;
    }
  }, [clearAuthError, handleAuthError, navigate]);

  // Sign in with Google (OAuth)
  const signInWithGoogle = useCallback(async () => {
    try {
      clearAuthError();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/setup-profile`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, "Google login");
      } else {
        handleAuthError(new Error("Failed to initialize Google login"), "Google login");
      }
      throw error;
    }
  }, [clearAuthError, handleAuthError]);

  // Sign in with Google Native (mobile)
  const signInWithGoogleNative = useCallback(async () => {
    try {
      clearAuthError();
      
      const result = await nativeGoogleLogin();
      
      if (result.success && result.user) {
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
  }, [clearAuthError, ensureThemeConsistency, handleAuthError]);

  return {
    // State
    session,
    user,
    profile,
    isLoading,
    authInitialized,
    authError,
    // Actions
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithGoogleNative,
    refreshProfile,
    clearAuthError,
  };
};
