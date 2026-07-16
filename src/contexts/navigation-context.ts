import { createContext, useContext } from 'react';

export interface NavigationContextType {
  isNavigating: boolean;
}

const missingNavigationContext: NavigationContextType | undefined = undefined;

export const NavigationContext = createContext<NavigationContextType | undefined>(
  missingNavigationContext
);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
