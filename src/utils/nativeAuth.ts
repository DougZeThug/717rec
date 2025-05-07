
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '@/integrations/supabase/client';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const loginWithGoogleNative = async () => {
  if (!isNativePlatform()) {
    return { success: false, error: "This method is only available on native mobile platforms" };
  }

  try {
    // Use the Capgo SocialLogin plugin to sign in with Google
    // Need to provide an empty options object to satisfy TypeScript
    const response = await SocialLogin.login({
      provider: 'google',
      options: {} // Empty options object to satisfy the type requirement
    });

    // Access the id token from the correct location in the response object
    // The structure appears to be different than we expected
    const idToken = response.result.token?.idToken;
    
    if (!idToken) {
      throw new Error("Failed to retrieve ID token from Google login response");
    }
    
    // Use the ID token to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) {
      console.error("Error signing in with Google Native:", error);
      return { success: false, error };
    }

    return { success: true, user: data.user };
  } catch (err: any) {
    console.error("Exception during native Google login:", err);
    return { success: false, error: err.message || "An error occurred during native Google login" };
  }
};
