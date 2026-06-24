import React, { createContext, useContext } from 'react';
import { useNavigate } from 'react-router';

import { AuthContextType } from '@/types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const useRequireAuth = () => {
  const { user, isLoading, authInitialized } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (authInitialized && !isLoading && !user) {
      navigate('/auth', { state: { returnTo: window.location.pathname } });
    }
  }, [user, isLoading, authInitialized, navigate]);

  return { user, isLoading, authInitialized };
};