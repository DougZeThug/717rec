import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { routeLog } from '@/utils/logger';

/** Route state passed during navigation */
export interface RouteState {
  isAppNavigating?: boolean;
  [key: string]: unknown;
}

interface NavigationOptions {
  state?: RouteState;
  replace?: boolean;
}

interface NavigationContextType {
  navigateWithTransition: (to: string, options?: NavigationOptions) => void;
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
  const [isNavigating, setIsNavigating] = useState(false);

  const navigateWithTransition = useCallback(
    (to: string, options?: NavigationOptions) => {
      routeLog(`Navigating to ${to}`);
      setIsNavigating(true);

      // Handle protected routes (like admin) specially
      const isProtectedRoute = to === '/admin';

      // Small delay to ensure state updates before navigation
      setTimeout(() => {
        // Use direct navigation
        navigate(to, {
          state: { ...options?.state, isAppNavigating: true },
          replace: options?.replace || isProtectedRoute, // Use replace for protected routes to avoid back button issues
        });

        // Reset navigation state after a short delay to ensure animations complete
        setTimeout(() => {
          setIsNavigating(false);
        }, 300);
      }, 0);
    },
    [navigate]
  );

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      navigateWithTransition,
      isNavigating,
    }),
    [navigateWithTransition, isNavigating]
  );

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};
