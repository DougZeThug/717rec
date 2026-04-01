import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

import { signInWithIdToken } from '@/services/auth/AuthService';
import { authLog, errorLog } from '@/utils/logger';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const loginWithGoogleNative = async () => {
  if (!isNativePlatform()) {
    return { success: false, error: 'This method is only available on native mobile platforms' };
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

    // Based on the GoogleLoginResponseOnline type, we need to access the id token differently
    // The structure is different between platforms, so we need to handle multiple possible locations
    let idToken: string | undefined;

    // Try to access idToken from different possible locations in the response
    if (response.result) {
      if ('idToken' in response.result) {
        idToken = (response.result as any).idToken;
      } else if ('serverAuthCode' in response.result) {
        // This is a typical structure for Android
        idToken = (response.result as any).serverAuthCode;
      } else if (typeof response.result === 'object' && response.result !== null) {
        // Navigate deeper if needed
        const resultObj = response.result as any;
        idToken = resultObj.idToken || resultObj.accessToken || resultObj.token;
      }
    }

    if (!idToken) {
      throw new Error('Failed to retrieve ID token from Google login response');
    }

    // Use the ID token to sign in with Supabase via AuthService
    const data = await signInWithIdToken('google', idToken);

    return { success: true, user: data.user };
  } catch (err: any) {
    errorLog('Exception during native Google login:', err);
    return { success: false, error: err.message || 'An error occurred during native Google login' };
  }
};
