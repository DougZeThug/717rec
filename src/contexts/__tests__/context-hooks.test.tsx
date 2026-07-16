import { renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, useAuth } from '@/contexts/auth-context';
import { NavigationContext, useNavigation } from '@/contexts/navigation-context';
import type { AuthContextType } from '@/types/auth';

const authValue: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isProfileLoading: false,
  authInitialized: true,
  signUp: () => Promise.resolve({ user: null, session: null }),
  signIn: () => Promise.resolve({ user: null, session: null }),
  signInWithGoogle: () => Promise.resolve(),
  signInWithGoogleNative: () => Promise.resolve({ success: true, user: null }),
  signOut: () => Promise.resolve(),
  refreshProfile: () => Promise.resolve(),
  authError: null,
  clearAuthError: () => undefined,
};

describe('context hook guards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it('returns the auth context value when provided', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBe(authValue);
  });

  it('throws a helpful error when useAuth is rendered without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('returns the navigation context value when provided', () => {
    const navigationValue = { isNavigating: true };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NavigationContext.Provider value={navigationValue}>{children}</NavigationContext.Provider>
    );

    const { result } = renderHook(() => useNavigation(), { wrapper });

    expect(result.current).toBe(navigationValue);
  });

  it('throws a helpful error when useNavigation is rendered without a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useNavigation())).toThrow(
      'useNavigation must be used within a NavigationProvider'
    );
  });
});
