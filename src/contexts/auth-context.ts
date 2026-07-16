import { createContext, useContext } from 'react';

import { AuthContextType } from '@/types/auth';

const missingAuthContext: AuthContextType | undefined = undefined;

export const AuthContext = createContext<AuthContextType | undefined>(missingAuthContext);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
