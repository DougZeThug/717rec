import { WeakPasswordReasons } from '@supabase/supabase-js';
import { useCallback } from 'react';
import { NavigateFunction } from 'react-router';

import { toast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { AuthResponse } from '@/types/auth';
import { loginWithGoogleNative as nativeGoogleLogin } from '@/utils/nativeAuth';

import { HandleAuthErrorFn } from './utils/authErrorHandler';

/**
 * Hook for authentication methods (sign in, sign up, sign out, OAuth)
 */
export const useAuthMethods = (
  clearAuthError: () => void,
  ensureThemeConsistency: () => void,
  handleAuthError: HandleAuthErrorFn,
  navigate: NavigateFunction
) => {
  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      try {
        clearAuthError();
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        ensureThemeConsistency();

        toast({
          title: 'Welcome back!',
          description: "You've successfully logged in",
        });

        return { user: data.user, session: data.session, weakPassword: null };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Email not confirmed')) {
            handleAuthError(new Error('Please check your email to confirm your account'), 'Login');
          } else if (error.message.includes('Invalid login credentials')) {
            handleAuthError(new Error('Incorrect email or password'), 'Login');
          } else {
            handleAuthError(error, 'Login');
          }
        } else {
          handleAuthError(new Error('An unexpected error occurred'), 'Login');
        }

        return { user: null, session: null, weakPassword: null };
      }
    },
    [clearAuthError, ensureThemeConsistency, handleAuthError]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      try {
        clearAuthError();
        const { error, data } = await supabase.auth.signUp({ email, password });

        if (error) throw error;

        ensureThemeConsistency();

        toast({
          title: 'Account created',
          description: 'Please check your email to confirm your account',
        });

        const signUpData = data as unknown as {
          user: typeof data.user;
          session: typeof data.session;
          weakPassword?: WeakPasswordReasons;
        };

        return {
          user: data.user,
          session: data.session,
          weakPassword: signUpData.weakPassword || null,
        };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('User already registered')) {
            handleAuthError(
              new Error('This email is already registered. Try logging in instead'),
              'Sign up'
            );
          } else {
            handleAuthError(error, 'Sign up');
          }
        } else {
          handleAuthError(new Error('An unexpected error occurred'), 'Sign up');
        }

        return { user: null, session: null, weakPassword: null };
      }
    },
    [clearAuthError, ensureThemeConsistency, handleAuthError]
  );

  // Sign out
  const signOut = useCallback(async () => {
    try {
      clearAuthError();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      navigate('/');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, 'Logout');
      } else {
        handleAuthError(new Error('Failed to log out'), 'Logout');
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
        handleAuthError(error, 'Google login');
      } else {
        handleAuthError(new Error('Failed to initialize Google login'), 'Google login');
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
          title: 'Welcome!',
          description: "You've successfully logged in with Google",
        });

        return result;
      } else {
        const errorMessage = result.error?.message || 'Failed to login with Google';
        handleAuthError(new Error(errorMessage), 'Native Google login');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      if (error instanceof Error) {
        handleAuthError(error, 'Native Google login');
      } else {
        handleAuthError(new Error('An unexpected error occurred'), 'Native Google login');
      }

      return { success: false, error };
    }
  }, [clearAuthError, ensureThemeConsistency, handleAuthError]);

  return { signIn, signUp, signOut, signInWithGoogle, signInWithGoogleNative };
};
