import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service layer for Supabase Auth SDK operations.
 * Wraps supabase.auth.* calls so hooks don't import the client directly.
 */

export const signInWithEmail = async (email: string, password: string) => {
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) handleDatabaseError(error as never, 'Failed to sign in');
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { error, data } = await supabase.auth.signUp({ email, password });
  if (error) handleDatabaseError(error as never, 'Failed to sign up');
  return data;
};

export const signOutUser = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) handleDatabaseError(error as never, 'Failed to sign out');
};

export const signInWithOAuth = async (redirectTo: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) handleDatabaseError(error as never, 'Failed to sign in with OAuth');
};

export const getAuthSession = async () => {
  return supabase.auth.getSession();
};

export const onAuthStateChange = (
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const signInWithIdToken = async (provider: 'google', token: string) => {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token,
  });
  if (error) handleDatabaseError(error as never, 'Failed to sign in with ID token');
  return data;
};
