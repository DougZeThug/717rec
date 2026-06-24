import React, { useMemo } from 'react';

import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { AuthContextType } from '@/types/auth';

import { AuthContext } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuthHook();

  const value: AuthContextType = useMemo(
    () => ({
      session: auth.session,
      user: auth.user,
      profile: auth.profile,
      isLoading: auth.isLoading,
      isProfileLoading: auth.isProfileLoading,
      authInitialized: auth.authInitialized,
      signIn: auth.signIn,
      signUp: auth.signUp,
      signInWithGoogle: auth.signInWithGoogle,
      signInWithGoogleNative: auth.signInWithGoogleNative,
      signOut: auth.signOut,
      refreshProfile: auth.refreshProfile,
      authError: auth.authError,
      clearAuthError: auth.clearAuthError,
    }),
    [
      auth.session,
      auth.user,
      auth.profile,
      auth.isLoading,
      auth.isProfileLoading,
      auth.authInitialized,
      auth.signIn,
      auth.signUp,
      auth.signInWithGoogle,
      auth.signInWithGoogleNative,
      auth.signOut,
      auth.refreshProfile,
      auth.authError,
      auth.clearAuthError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
