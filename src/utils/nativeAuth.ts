import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

import { signInWithIdToken } from '@/services/auth/AuthService';
import { NativeGoogleLoginResult } from '@/types/auth';
import { authLog, errorLog } from '@/utils/logger';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const loginWithGoogleNative = async () => {
  if (!isNativePlatform()) {
    return {
      success: false,
      error: new Error('This method is only available on native mobile platforms'),
    };
  }

  try {
    // Use the Capgo SocialLogin plugin to sign in with Google
    // Need to provide an empty options object to satisfy TypeScript
    const response = await SocialLogin.login({
      provider: 'google',
      options: {}, // Empty options object to satisfy the type requirement
    });

    // Log the response structure to understand what we're getting
    authLog('Google login response structure:', JSON.stringify(response));

    const idToken = extractIdToken(response as NativeGoogleLoginResult);

    if (!idToken) {
      throw new Error('Failed to retrieve ID token from Google login response');
    }

    // Use the ID token to sign in with Supabase via AuthService
    const data = await signInWithIdToken('google', idToken);

    return { success: true, user: data.user };
  } catch (err: unknown) {
    errorLog('Exception during native Google login:', err);
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error };
  }
};


const extractIdToken = (result: NativeGoogleLoginResult): string | undefined => {
  const payload = result.result;
  if (!payload || typeof payload !== 'object') return undefined;

  if ('idToken' in payload && typeof payload.idToken === 'string') {
    return payload.idToken;
  }

  if ('serverAuthCode' in payload && typeof payload.serverAuthCode === 'string') {
    return payload.serverAuthCode;
  }

  const tokenValue = (payload as { accessToken?: unknown; token?: unknown }).accessToken
    ?? (payload as { accessToken?: unknown; token?: unknown }).token;

  return typeof tokenValue === 'string' ? tokenValue : undefined;
};
