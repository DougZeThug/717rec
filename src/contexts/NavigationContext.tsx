import React, { useMemo, useState } from 'react';

import { NavigationContext } from './navigation-context';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [isNavigating] = useState(false);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({
      isNavigating,
    }),
    [isNavigating]
  );

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};
