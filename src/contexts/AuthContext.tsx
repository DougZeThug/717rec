
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AuthContextType, AuthResponse } from "@/types/auth";
import { useAuthProfile } from "@/hooks/use-auth-profile";
import { useAuthFunctions } from "@/hooks/use-auth-functions";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
import { toast } from "@/hooks/use-toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  const { profile, setProfile, fetchProfile, refreshProfile: refreshUserProfile, checkProfileSetup } = useAuthProfile();
  const { signIn: authSignIn, signUp: authSignUp, signInWithGoogle: authSignInWithGoogle, signOut: authSignOut, authError, clearAuthError } = useAuthFunctions();
  const { ensureThemeConsistency } = useThemeConsistency();

  // Wrapper for refreshProfile to match the interface
  const refreshProfile = async () => {
    await refreshUserProfile(user);
  };
  
  // Wrappers for auth functions to match the interface
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    return authSignIn(email, password);
  };
  
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    return authSignUp(email, password);
  };
  
  const signInWithGoogle = async (): Promise<void> => {
    await authSignInWithGoogle();
  };
  
  const signOut = async (): Promise<void> => {
    await authSignOut();
  };

  // Initialize auth state
  useEffect(() => {
    console.log("Initializing auth state...");
    let retryCount = 0;
    const maxRetries = 2;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (!currentSession) {
          setProfile(null);
        } else if (event === 'SIGNED_IN') {
          // Ensure theme consistency after login
          ensureThemeConsistency();
          
          // We use setTimeout to prevent Supabase auth deadlocks
          setTimeout(async () => {
            console.log("Fetching profile after sign in");
            try {
              const profileData = await fetchProfile(currentSession.user.id);
              setProfile(profileData);
              checkProfileSetup(profileData);
            } catch (error) {
              console.error("Error fetching user profile:", error);
              toast({
                title: "Profile error",
                description: "Failed to load your profile data",
                variant: "destructive",
              });
            }
          }, 0);
        }
      }
    );

    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        console.log(`Checking for session (attempt ${retryCount + 1}/${maxRetries + 1})`);
        // Check for existing session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        console.log("Session check result:", currentSession ? "Session found" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Ensure theme consistency for existing session
          ensureThemeConsistency();
          
          try {
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            checkProfileSetup(profileData);
          } catch (profileError) {
            console.error("Error fetching initial profile:", profileError);
          }
        }
        
        setAuthInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying session check in 1s (attempt ${retryCount + 1}/${maxRetries + 1})`);
          setTimeout(initializeAuth, 1000); // Retry after 1 second
        } else {
          console.log("Max retries reached, marking auth as initialized");
          setAuthInitialized(true);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const value: AuthContextType = {
    session,
    user,
    profile,
    isLoading,
    authInitialized,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
    authError,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
};

export const useRequireAuth = () => {
  const { user, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Only redirect if auth is initialized (session check completed) and no user
    if (authInitialized && !isLoading && !user) {
      navigate("/auth", { state: { returnTo: window.location.pathname } });
    }
  }, [user, isLoading, authInitialized, navigate]);
  
  return { user, isLoading, authInitialized };
};
