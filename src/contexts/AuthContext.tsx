
import React, { createContext, useContext, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { AuthContextType } from "@/types/auth";
import { useAuth as useAuthHook } from "@/hooks/useAuth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthHook();

  const value: AuthContextType = useMemo(() => ({
    session: auth.session,
    user: auth.user,
    profile: auth.profile,
    isLoading: auth.isLoading,
    authInitialized: auth.authInitialized,
    signIn: auth.signIn,
    signUp: auth.signUp,
    signInWithGoogle: auth.signInWithGoogle,
    signInWithGoogleNative: auth.signInWithGoogleNative,
    signOut: auth.signOut,
    refreshProfile: auth.refreshProfile,
    authError: auth.authError,
    clearAuthError: auth.clearAuthError,
  }), [
    auth.session,
    auth.user,
    auth.profile,
    auth.isLoading,
    auth.authInitialized,
    auth.signIn,
    auth.signUp,
    auth.signInWithGoogle,
    auth.signInWithGoogleNative,
    auth.signOut,
    auth.refreshProfile,
    auth.authError,
    auth.clearAuthError,
  ]);

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
    if (authInitialized && !isLoading && !user) {
      navigate("/auth", { state: { returnTo: window.location.pathname } });
    }
  }, [user, isLoading, authInitialized, navigate]);
  
  return { user, isLoading, authInitialized };
};
