import { createContext, useContext } from 'react';

/** Route state passed during navigation */
export interface RouteState {
  isAppNavigating?: boolean;
  [key: string]: unknown;
}

export interface NavigationOptions {
  state?: RouteState;
  replace?: boolean;
}

export interface NavigationContextType {
  navigateWithTransition: (to: string, options?: NavigationOptions) => void;
  isNavigating: boolean;
}

export const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};