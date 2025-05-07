
import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationContextType {
  navigateWithTransition: (
    to: string, 
    options?: { 
      state?: any;
      replace?: boolean;
    }
  ) => void;
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

  const navigateWithTransition = useCallback((
    to: string, 
    options?: { 
      state?: any;
      replace?: boolean;
    }
  ) => {
    console.log(`NavigationContext: Navigating to ${to}`);
    
    // Handle protected routes (like admin) specially
    const isProtectedRoute = to === '/admin';
    
    if (isProtectedRoute) {
      console.log('NavigationContext: Handling protected route navigation');
    }
    
    // Use direct navigation
    navigate(to, { 
      state: options?.state,
      replace: options?.replace || isProtectedRoute // Use replace for protected routes to avoid back button issues
    });
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ navigateWithTransition }}>
      {children}
    </NavigationContext.Provider>
  );
};
