
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  authInitialized: boolean; // New flag to track if auth check is complete
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const { resolvedTheme, setTheme } = useTheme();
  
  // Ensure theme consistency after login
  const ensureThemeConsistency = () => {
    // Check if user has explicitly set a theme preference
    const storedTheme = localStorage.getItem("theme");
    
    // If no explicit theme preference is stored, ensure we default to light mode
    if (!storedTheme) {
      // Remove dark class if it was applied automatically
      document.documentElement.classList.remove("dark");
      // Set theme to light explicitly
      setTheme("light");
      console.log("No theme preference found, defaulting to light mode");
    } else {
      console.log(`Using stored theme preference: ${storedTheme}`);
      // Apply the stored theme preference
      setTheme(storedTheme);
    }
  };

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data as UserProfile;
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    const profileData = await fetchProfile(user.id);
    setProfile(profileData);
  };

  // Check if user needs to set up profile
  const checkProfileSetup = (profileData: UserProfile | null) => {
    if (profileData && !profileData.username) {
      navigate("/setup-profile");
    }
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
            const profileData = await fetchProfile(currentSession.user.id);
            setProfile(profileData);
            checkProfileSetup(profileData);
          }, 0);
        }
      }
    );

    const initializeAuth = async () => {
      setIsLoading(true);
      
      try {
        console.log(`Checking for session (attempt ${retryCount + 1}/${maxRetries + 1})`);
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log("Session check result:", currentSession ? "Session found" : "No session");
        
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Ensure theme consistency for existing session
          ensureThemeConsistency();
          
          const profileData = await fetchProfile(currentSession.user.id);
          setProfile(profileData);
          checkProfileSetup(profileData);
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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error) {
      console.error("Error during sign in:", error);
      throw error;
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      toast({
        title: "Account created",
        description: "Please set up your profile",
      });
    } catch (error) {
      console.error("Error during sign up:", error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/setup-profile`,
        },
      });
      
      if (error) {
        toast({
          title: "Google login failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
    } catch (error) {
      console.error("Error during Google sign in:", error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Logout failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      navigate("/");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    isLoading,
    authInitialized, // Expose this new flag
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshProfile,
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
