
import { useState, useEffect } from 'react';
import { ADMIN_ACCESS_CODE } from '@/config/admin';

export const useAdminAccess = () => {
  const [isAdminAccessGranted, setIsAdminAccessGranted] = useState(false);

  useEffect(() => {
    // Check if admin access was previously granted
    const storedAccess = sessionStorage.getItem('adminAccess');
    if (storedAccess === 'true') {
      setIsAdminAccessGranted(true);
    }
  }, []);

  const checkAdminAccess = (inputCode: string) => {
    if (inputCode === ADMIN_ACCESS_CODE) {
      setIsAdminAccessGranted(true);
      sessionStorage.setItem('adminAccess', 'true');
      return true;
    }
    return false;
  };

  const revokeAdminAccess = () => {
    setIsAdminAccessGranted(false);
    sessionStorage.removeItem('adminAccess');
  };

  return { 
    isAdminAccessGranted, 
    checkAdminAccess, 
    revokeAdminAccess 
  };
};
