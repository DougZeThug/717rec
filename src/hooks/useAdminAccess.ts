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

  // A profile only answers for the person it belongs to. Holding one is not
  // enough: signing in as somebody else, or failing to read their profile, used
  // to leave the previous person's profile in memory, and an admin profile left
  // there granted admin to whoever came next. The auth hook now drops a foreign
  // profile, and this is the matching check at the point the decision is made.
  const profileMatchesUser = Boolean(user) && profile?.id === user?.id;

  // Derive admin access synchronously to avoid race conditions with effects/state.
  const isAdminAccessGranted = authInitialized && profileMatchesUser && profile?.is_admin === true;

  // A failed profile read leaves us without this user's profile, which is NOT
  // the same as a profile that says is_admin: false. Callers must be able to
  // tell them apart so a dropped request never reads as "you are not an admin".
  //
  // `!profileMatchesUser` matters: on a reload the bootstrap and the
  // INITIAL_SESSION listener both fetch, so one can succeed while the other
  // fails and leaves the flag set. If this user's own profile did load, we can
  // answer the admin question and there is nothing to report as failed. A
  // profile belonging to anyone else cannot answer it, so it counts as failed.
  const accessCheckFailed =
    authInitialized && Boolean(user) && profileLoadFailed && !profileMatchesUser;

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
