import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthMethods } from '../useAuthMethods';

const mockSignInWithEmail = vi.fn();
const mockSignUpWithEmail = vi.fn();
const mockSignOutUser = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockNativeGoogleLogin = vi.fn();
const mockToast = vi.fn();

vi.mock('@/services/auth/AuthService', () => ({
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args),
  signUpWithEmail: (...args: unknown[]) => mockSignUpWithEmail(...args),
  signOutUser: (...args: unknown[]) => mockSignOutUser(...args),
  signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
}));

vi.mock('@/utils/nativeAuth', () => ({
  loginWithGoogleNative: (...args: unknown[]) => mockNativeGoogleLogin(...args),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (args: unknown) => mockToast(args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAuthMethods', () => {
  const clearAuthError = vi.fn();
  const ensureThemeConsistency = vi.fn();
  const handleAuthError = vi.fn();
  const navigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success data for sign-in and shows toast', async () => {
    mockSignInWithEmail.mockResolvedValue({ user: { id: 'u1' }, session: { id: 's1' } });
    const { result } = renderHook(
      () => useAuthMethods(clearAuthError, ensureThemeConsistency, handleAuthError, navigate),
      { wrapper: createWrapper() }
    );

    const response = await result.current.signIn('test@example.com', 'pw');

    expect(response.user).toEqual({ id: 'u1' });
    expect(ensureThemeConsistency).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome back!' }));
  });

  it('maps sign-in failure message for invalid credentials', async () => {
    mockSignInWithEmail.mockRejectedValue(new Error('Invalid login credentials'));
    const { result } = renderHook(
      () => useAuthMethods(clearAuthError, ensureThemeConsistency, handleAuthError, navigate),
      { wrapper: createWrapper() }
    );

    const response = await result.current.signIn('bad@example.com', 'bad');

    expect(response.user).toBeNull();
    expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error), 'Login');
    expect((handleAuthError.mock.calls[0][0] as Error).message).toBe('Incorrect email or password');
  });

  it('sign-out navigates on success and surfaces failure', async () => {
    mockSignOutUser.mockImplementation(() => Promise.resolve());
    const { result, rerender } = renderHook(
      () => useAuthMethods(clearAuthError, ensureThemeConsistency, handleAuthError, navigate),
      { wrapper: createWrapper() }
    );

    await result.current.signOut();
    expect(navigate).toHaveBeenCalledWith('/');

    mockSignOutUser.mockRejectedValueOnce(new Error('network gone'));
    rerender();

    await expect(result.current.signOut()).rejects.toThrow('network gone');
    expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error), 'Logout');
  });

  it('handles oauth and native-google failure modes with surfaced errors', async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error('oauth init failed'));
    mockNativeGoogleLogin.mockResolvedValue({ success: false, error: new Error('native failed') });

    const { result } = renderHook(
      () => useAuthMethods(clearAuthError, ensureThemeConsistency, handleAuthError, navigate),
      { wrapper: createWrapper() }
    );

    await expect(result.current.signInWithGoogle()).rejects.toThrow('oauth init failed');
    const nativeResponse = await result.current.signInWithGoogleNative();

    expect(nativeResponse.success).toBe(false);
    expect((nativeResponse.error as Error).message).toBe('native failed');
    expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error), 'Google login');
    expect(handleAuthError).toHaveBeenCalledWith(expect.any(Error), 'Native Google login');
  });
});
