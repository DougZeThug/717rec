import { useEffect } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/useToast';
import { authLog } from '@/utils/logger';

// Function to request admin access (can be used in future for admin request feature)
const requestAdminAccess = () => {
  toast({
    title: 'Admin Access Request',
    description: 'Please contact an administrator to grant you admin privileges.',
  });
};

export const useAdminAccess = () => {
  const { user, profile, authInitialized, isProfileLoading, profileLoadFailed, refreshProfile } =
    useAuth();

  // Derive admin access synchronously to avoid race conditions with effects/state.
  const isAdminAccessGranted = authInitialized && Boolean(user) && profile?.is_admin === true;

  // A failed profile read leaves `profile` null, which is NOT the same as a
  // profile that says is_admin: false. Callers must be able to tell them apart
  // so a dropped request never reads as "you are not an admin".
  //
  // `!profile` matters: on a reload the bootstrap and the INITIAL_SESSION
  // listener both fetch, so one can succeed while the other fails and leaves
  // the flag set. If a usable profile did load, we can answer the admin
  // question and there is nothing to report as failed.
  const accessCheckFailed = authInitialized && Boolean(user) && profileLoadFailed && !profile;

  // Log state changes for debugging (dev-only via logger)
  useEffect(() => {
    if (!authInitialized) return;

    authLog('Admin access derived:', {
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: Boolean(profile),
      isAdmin: isAdminAccessGranted,
      accessCheckFailed,
    });
  }, [authInitialized, user?.id, user?.email, profile, isAdminAccessGranted, accessCheckFailed]);

  return {
    isAdminAccessGranted,
    accessCheckFailed,
    retryAccessCheck: refreshProfile,
    requestAdminAccess,
    isLoading: !authInitialized || isProfileLoading,
  };
};
