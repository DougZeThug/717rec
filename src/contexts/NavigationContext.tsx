
import React, { createContext, useContext, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { routeLog } from '@/utils/logger';

interface NavigationContextType {
  navigateWithTransition: (
    to: string, 
    options?: { 
      state?: any;
      replace?: boolean;
    }
  ) => void;
  isNavigating: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const { isAdminAccessGranted } = useAdminAccess();
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateWithTransition = useCallback((
    to: string, 
    options?: { 
      state?: any;
      replace?: boolean;
    }
  ) => {
    routeLog(`Navigating to ${to}`);
    setIsNavigating(true);
    
    // Handle protected routes (like admin) specially
    const isProtectedRoute = to === '/admin';
    
    // Small delay to ensure state updates before navigation
    setTimeout(() => {
      // Use direct navigation
      navigate(to, { 
        state: { ...options?.state, isAppNavigating: true },
        replace: options?.replace || isProtectedRoute // Use replace for protected routes to avoid back button issues
      });
      
      // Reset navigation state after a short delay to ensure animations complete
      setTimeout(() => {
        setIsNavigating(false);
      }, 300);
    }, 0);
    
  }, [navigate, isAdminAccessGranted, user]);

  return (
    <NavigationContext.Provider value={{ navigateWithTransition, isNavigating }}>
      {children}
    </NavigationContext.Provider>
  );
};
