
import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate, NavigateOptions } from 'react-router-dom';

interface NavigationContextType {
  navigateWithTransition: (
    to: string, 
    options?: { 
      state?: any;
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
    }
  ) => {
    // Use direct navigation without any animations
    console.log(`NavigationContext: Direct navigation to ${to}`);
    navigate(to, { state: options?.state });
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ navigateWithTransition }}>
      {children}
    </NavigationContext.Provider>
  );
};
