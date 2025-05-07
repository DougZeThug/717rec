import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useAdminAccess = () => {
  const [isAdminAccessGranted, setIsAdminAccessGranted] = useState(false);
  const { user, profile, authInitialized } = useAuth();
  
  // Check admin access whenever the user/profile changes
  useEffect(() => {
    if (authInitialized && user && profile) {
      // Check if the user's profile has admin privileges
      const isAdmin = profile.is_admin === true;
      setIsAdminAccessGranted(isAdmin);
      
      // Store admin status in session for persistence
      if (isAdmin) {
        sessionStorage.setItem('adminAccess', 'true');
      }
    } else if (authInitialized && !user) {
      // If no user is logged in, revoke admin access
      setIsAdminAccessGranted(false);
      sessionStorage.removeItem('adminAccess');
    }
  }, [user, profile, authInitialized]);

  // Legacy check (only used as fallback during page refresh before auth is fully initialized)
  useEffect(() => {
    // Check if admin access was previously granted in this session
    if (!authInitialized) {
      const storedAccess = sessionStorage.getItem('adminAccess');
      if (storedAccess === 'true') {
        setIsAdminAccessGranted(true);
      }
    }
  }, [authInitialized]);

  // This function is no longer needed for password verification, 
  // but keeping it for compatibility with existing code
  const checkAdminAccess = (inputCode: string) => {
    // This will always return false since we now check admin status from profile
    return false;
  };

  // Function to request admin access (can be used in future for admin request feature)
  const requestAdminAccess = () => {
    toast({
      title: "Admin Access Request",
      description: "Please contact an administrator to grant you admin privileges.",
    });
  };

  const revokeAdminAccess = () => {
    setIsAdminAccessGranted(false);
    sessionStorage.removeItem('adminAccess');
  };

  return { 
    isAdminAccessGranted, 
    checkAdminAccess,
    requestAdminAccess,
    revokeAdminAccess,
    isLoading: !authInitialized
  };
};
