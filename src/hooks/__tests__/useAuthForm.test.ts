import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emailSchema, passwordSchema, useAuthForm } from '@/hooks/useAuthForm';

const mockUseAuth = vi.fn();
const mockToast = vi.fn();
const mockAuthLog = vi.fn();
const mockErrorLog = vi.fn();

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignInWithGoogleNative = vi.fn();
const mockClearAuthError = vi.fn();

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (args: unknown) => mockToast(args),
}));

vi.mock('@/utils/logger', () => ({
  authLog: (...args: unknown[]) => mockAuthLog(...args),
  errorLog: (...args: unknown[]) => mockErrorLog(...args),
}));

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSignIn.mockResolvedValue({ session: null });
    mockSignUp.mockResolvedValue({ session: null });
    mockSignInWithGoogle.mockResolvedValue(undefined);
    mockSignInWithGoogleNative.mockResolvedValue({ success: true, error: null });

    mockUseAuth.mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithGoogleNative: mockSignInWithGoogleNative,
      isLoading: false,
      authError: null,
      clearAuthError: mockClearAuthError,
    });
  });

  it('validates exported schemas directly', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('valid@example.com').success).toBe(true);

    expect(passwordSchema.safeParse('12345').success).toBe(false);
    expect(passwordSchema.safeParse('123456').success).toBe(true);
  });

  it('starts on login tab by default', () => {
    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    expect(result.current.activeTab).toBe('login');
  });

  it('clears field errors and auth error when tab changes', async () => {
    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    mockClearAuthError.mockClear();

    await act(async () => {
      await result.current.handleSignIn('bad-email', '123');
    });

    expect(result.current.emailError).toBe('Please enter a valid email address');
    expect(result.current.passwordError).toBe('Password must be at least 6 characters');

    act(() => {
      result.current.setActiveTab('signup');
    });

    expect(result.current.emailError).toBeNull();
    expect(result.current.passwordError).toBeNull();
    expect(mockClearAuthError).toHaveBeenCalledTimes(1);
  });

  it('short-circuits sign-in/sign-up when validation fails', async () => {
    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    await act(async () => {
      await result.current.handleSignIn('bad-email', '123');
    });
    await act(async () => {
      await result.current.handleSignUp('still-bad', '123');
    });

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('shows account-created toast when sign-up returns session', async () => {
    mockSignUp.mockResolvedValueOnce({ session: { id: 'session-1' } });
    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    await act(async () => {
      await result.current.handleSignUp('user@example.com', '123456');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Account created',
        description: 'Please check your email to verify your account.',
      })
    );
  });

  it('calls signInWithGoogle and toggles isSubmitting', async () => {
    let resolveGoogle: (() => void) | undefined;
    mockSignInWithGoogle.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveGoogle = resolve;
        })
    );

    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    let request: Promise<void> | undefined;
    await act(async () => {
      request = result.current.handleGoogleSignIn();
      await Promise.resolve();
    });

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveGoogle?.();
      await request;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('shows destructive toast when native Google sign-in returns success:false', async () => {
    mockSignInWithGoogleNative.mockResolvedValueOnce({
      success: false,
      error: { message: 'Native login failed' },
    });

    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    await act(async () => {
      await result.current.handleNativeGoogleSignIn();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Login Failed',
        description: 'Native login failed',
        variant: 'destructive',
      })
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it('shows Login Error toast on thrown native Google sign-in exception', async () => {
    mockSignInWithGoogleNative.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    await act(async () => {
      await result.current.handleNativeGoogleSignIn();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Login Error',
        description: 'An unexpected error occurred during login',
        variant: 'destructive',
      })
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it('resets isSubmitting in catch/finally paths', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('sign-in failed'));
    mockSignUp.mockRejectedValueOnce(new Error('sign-up failed'));
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('oauth failed'));

    const { result } = renderHook(() => useAuthForm({ returnTo: '/dashboard' }));

    await act(async () => {
      await result.current.handleSignIn('user@example.com', '123456');
    });
    expect(result.current.isSubmitting).toBe(false);

    await act(async () => {
      await result.current.handleSignUp('user@example.com', '123456');
    });
    expect(result.current.isSubmitting).toBe(false);

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
