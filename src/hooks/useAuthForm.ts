import { useEffect, useState } from 'react';
import { z } from 'zod';

import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { authLog, errorLog } from '@/utils/logger';

export const emailSchema = z.string().email('Please enter a valid email address');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

interface UseAuthFormProps {
  returnTo: string;
}

export const useAuthForm = ({ returnTo: _returnTo }: UseAuthFormProps) => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGoogleNative,
    isLoading: _isLoading,
    authError,
    clearAuthError,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('login');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Clear form errors when switching tabs
  useEffect(() => {
    setEmailError(null);
    setPasswordError(null);
    clearAuthError();
  }, [activeTab, clearAuthError]);

  const validateForm = (email: string, password: string) => {
    let isValid = true;

    // Validate email
    try {
      emailSchema.parse(email);
      setEmailError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.issues[0].message);
        isValid = false;
      }
    }

    // Validate password
    try {
      passwordSchema.parse(password);
      setPasswordError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.issues[0].message);
        isValid = false;
      }
    }

    return isValid;
  };

  const handleSignIn = async (email: string, password: string) => {
    if (!validateForm(email, password)) return;

    try {
      setIsSubmitting(true);
      const response = await signIn(email, password);

      if (response.session) {
        // Navigation will happen in the Auth page based on user state
      }
    } catch (error) {
      errorLog('Sign in error:', error);
      // Error is already handled in the signIn function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    if (!validateForm(email, password)) return;

    try {
      setIsSubmitting(true);
      const response = await signUp(email, password);

      if (response.session) {
        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account.',
        });
      }
      // Navigation will happen automatically on auth state change
    } catch (error) {
      errorLog('Sign up error:', error);
      // Error is already handled in the signUp function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      // Redirect happens at the OAuth provider level
    } catch (error) {
      errorLog('Google sign in error:', error);
      // Error is already handled in the signInWithGoogle function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const { success, error } = await signInWithGoogleNative();

      if (!success) {
        authLog('Native Google login error:', error);
        toast({
          title: 'Login Failed',
          description: error?.message || 'Google login failed. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      errorLog('Exception during native Google login:', error);
      toast({
        title: 'Login Error',
        description: 'An unexpected error occurred during login',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    isSubmitting,
    emailError,
    passwordError,
    authError,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleNativeGoogleSignIn,
  };
};
