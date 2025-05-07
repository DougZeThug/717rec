
import React, { createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContextType } from "@/types/auth";
import { useAuthState } from "@/hooks/auth/use-auth-state";
import { useAuthActions } from "@/hooks/auth/use-auth-actions";
import { useAuthProfile } from "@/hooks/use-auth-profile";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    session, 
    user, 
    profile, 
    isLoading, 
    authInitialized 
  } = useAuthState();
  
  const { 
    signIn,
    signUp, 
    signInWithGoogle, 
    signInWithGoogleNative, 
    signOut,
    authError,
    clearAuthError 
  } = useAuthActions();
  
  const { refreshProfile: refreshUserProfile } = useAuthProfile();

  // Wrapper for refreshProfile to match the interface
  const refreshProfile = async () => {
    await refreshUserProfile(user);
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    isLoading,
    authInitialized,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGoogleNative,
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
  const location = useLocation();
  
  React.useEffect(() => {
    // Only redirect if auth is initialized (session check completed) and no user
    if (authInitialized && !isLoading && !user) {
      navigate("/auth", { state: { returnTo: window.location.pathname } });
    }
  }, [user, isLoading, authInitialized, navigate]);
  
  return { user, isLoading, authInitialized };
};
