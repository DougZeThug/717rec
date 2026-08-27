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
  const isAdminAccessGranted = authInitialized && !!user && profile?.is_admin === true;

  // A failed profile read leaves `profile` null, which is NOT the same as a
  // profile that says is_admin: false. Callers must be able to tell them apart
  // so a dropped request never reads as "you are not an admin".
  const accessCheckFailed = authInitialized && !!user && profileLoadFailed;

  // Log state changes for debugging (dev-only via logger)
  useEffect(() => {
    if (!authInitialized) return;

    authLog('Admin access derived:', {
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
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
