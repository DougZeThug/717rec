import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { authLog, warnLog } from '@/utils/logger';

export const useAdminAccess = () => {
  const { user, profile, authInitialized, isProfileLoading } = useAuth();

  // Derive admin access synchronously to avoid race conditions with effects/state.
  const isAdminAccessGranted =
    authInitialized && !!user && profile?.is_admin === true;

  // Log state changes for debugging (dev-only via logger)
  useEffect(() => {
    if (!authInitialized) return;

    authLog('Admin access derived:', {
      userId: user?.id,
      userEmail: user?.email,
      hasProfile: !!profile,
      isAdmin: isAdminAccessGranted,
    });
  }, [authInitialized, user?.id, user?.email, profile, isAdminAccessGranted]);

  // DEPRECATED: This function is no longer needed and always returns false
  const checkAdminAccess = (inputCode: string) => {
    warnLog('checkAdminAccess is deprecated and insecure. Admin status is now checked server-side.');
    return false;
  };

  // Function to request admin access (can be used in future for admin request feature)
  const requestAdminAccess = () => {
    toast({
      title: "Admin Access Request",
      description: "Please contact an administrator to grant you admin privileges.",
    });
  };

  // SECURITY: Admin access can only be revoked by updating the database
  const revokeAdminAccess = () => {
    warnLog('Admin access cannot be revoked client-side for security. Contact an administrator.');
    toast({
      title: "Security Notice",
      description: "Admin access can only be modified by existing administrators.",
      variant: "destructive"
    });
  };

  return {
    isAdminAccessGranted,
    checkAdminAccess,
    requestAdminAccess,
    revokeAdminAccess,
    isLoading: !authInitialized || isProfileLoading
  };
};
