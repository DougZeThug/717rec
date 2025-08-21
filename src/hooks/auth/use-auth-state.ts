
import { useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
import { toast } from "@/hooks/use-toast";
import { UserProfile } from "@/types/user";
import { useAuthProfile } from "@/hooks/use-auth-profile";

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  const { profile, setProfile, fetchProfile, checkProfileSetup } = useAuthProfile();
  const { ensureThemeConsistency } = useThemeConsistency();

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
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          // Ensure theme consistency after login
          ensureThemeConsistency();
          
          // We use setTimeout to prevent Supabase auth deadlocks
          setTimeout(async () => {
            console.log(`Fetching profile after ${event}`);
            try {
              const profileData = await fetchProfile(currentSession.user.id);
              console.log("Profile fetched:", profileData);
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
  }, []);

  return {
    session,
    user,
    profile,
    isLoading,
    authInitialized,
    setProfile
  };
};
