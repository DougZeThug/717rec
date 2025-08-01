import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useAdminAccess = () => {
  const [isAdminAccessGranted, setIsAdminAccessGranted] = useState(false);
  const { user, profile, authInitialized } = useAuth();
  
  // Check admin access whenever the user/profile changes
  useEffect(() => {
    if (authInitialized && user && profile) {
      // SECURITY: Only check server-side admin status from profile
      const isAdmin = profile.is_admin === true;
      setIsAdminAccessGranted(isAdmin);
      
      console.log('Admin access check:', {
        userId: user.id,
        isAdmin,
        profileData: profile
      });
    } else if (authInitialized && !user) {
      // If no user is logged in, revoke admin access
      setIsAdminAccessGranted(false);
    }
  }, [user, profile, authInitialized]);

  // DEPRECATED: This function is no longer needed and always returns false
  const checkAdminAccess = (inputCode: string) => {
    console.warn('checkAdminAccess is deprecated and insecure. Admin status is now checked server-side.');
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
    console.warn('Admin access cannot be revoked client-side for security. Contact an administrator.');
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
    isLoading: !authInitialized
  };
};
