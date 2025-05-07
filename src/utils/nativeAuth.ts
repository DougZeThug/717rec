
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
    // The correct method according to the Capgo plugin documentation is 'login' not 'signIn'
    const res = await SocialLogin.login({ provider: 'google' });

    // Use the ID token to sign in with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: res.idToken
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
