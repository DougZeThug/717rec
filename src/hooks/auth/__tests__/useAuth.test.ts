import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../index';

const mockGetAuthSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUseAuthMethods = vi.fn();
const mockUseAuthProfile = vi.fn();
const mockEnsureThemeConsistency = vi.fn();
const mockToast = vi.fn();
const mockUseNavigate = vi.fn();

const signIn = vi.fn();
const signUp = vi.fn();
const signOut = vi.fn();
const signInWithGoogle = vi.fn();
const signInWithGoogleNative = vi.fn();

let authStateCallback: ((event: string, session: any) => void | Promise<void>) | null = null;
let unsubscribeSpy: ReturnType<typeof vi.fn>;

let profileState: any;
let isProfileLoadingState = false;
const setProfileSpy = vi.fn((value: any) => {
  profileState = value;
});
const setIsProfileLoadingSpy = vi.fn((value: boolean) => {
  isProfileLoadingState = value;
});
const fetchProfileSpy = vi.fn();
const checkProfileSetupSpy = vi.fn();
const refreshProfileSpy = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockUseNavigate,
}));

vi.mock('@/services/auth/AuthService', () => ({
  getAuthSession: (...args: unknown[]) => mockGetAuthSession(...args),
  onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
}));

vi.mock('@/hooks/auth/useAuthMethods', () => ({
  useAuthMethods: (...args: unknown[]) => mockUseAuthMethods(...args),
}));

vi.mock('@/hooks/auth/useAuthProfile', () => ({
  useAuthProfile: (...args: unknown[]) => mockUseAuthProfile(...args),
}));

vi.mock('@/hooks/useThemeConsistency', () => ({
  useThemeConsistency: () => ({ ensureThemeConsistency: mockEnsureThemeConsistency }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const makeSession = (id: string, email = `${id}@example.com`) => ({
  user: { id, email },
});

const setupUseAuthProfileMock = () => {
  mockUseAuthProfile.mockImplementation(() => ({
    profile: profileState,
    setProfile: setProfileSpy,
    isProfileLoading: isProfileLoadingState,
    setIsProfileLoading: setIsProfileLoadingSpy,
    fetchProfile: fetchProfileSpy,
    checkProfileSetup: checkProfileSetupSpy,
    refreshProfile: refreshProfileSpy,
  }));
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    profileState = null;
    isProfileLoadingState = false;
    authStateCallback = null;
    unsubscribeSpy = vi.fn();

    mockUseAuthMethods.mockReturnValue({
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      signInWithGoogleNative,
    });

    setupUseAuthProfileMock();

    mockOnAuthStateChange.mockImplementation((cb: any) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: unsubscribeSpy } } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles no initial session by clearing profile and ending loading', async () => {
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.authInitialized).toBe(true);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(result.current.signIn).toBe(signIn);
    expect(result.current.signUp).toBe(signUp);
    expect(result.current.signOut).toBe(signOut);
    expect(result.current.signInWithGoogle).toBe(signInWithGoogle);
    expect(result.current.signInWithGoogleNative).toBe(signInWithGoogleNative);
    expect(result.current.refreshProfile).toBe(refreshProfileSpy);
  });

  it('loads profile for initial session and calls checkProfileSetup', async () => {
    const session = makeSession('initial-user');
    const profile = { username: 'initial', full_name: 'Initial User' };
    mockGetAuthSession.mockResolvedValue({ data: { session }, error: null });
    fetchProfileSpy.mockResolvedValue(profile);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.authInitialized).toBe(true);
    });

    expect(fetchProfileSpy).toHaveBeenCalledWith('initial-user');
    expect(setProfileSpy).toHaveBeenCalledWith(profile);
    expect(checkProfileSetupSpy).toHaveBeenCalledWith(profile);
    expect(mockEnsureThemeConsistency).toHaveBeenCalled();
    expect(result.current.session).toEqual(session);
    expect(result.current.user).toEqual(session.user);
  });

  it('retries initializeAuth failures and exits after max retries', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockRejectedValue(new Error('session down'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetAuthSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });
    expect(mockGetAuthSession).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });
    expect(mockGetAuthSession).toHaveBeenCalledTimes(3);
    expect(result.current.authInitialized).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles auth events and profile fetch lifecycle', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockResolvedValue({ username: 'event-user' });

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });
    expect(authStateCallback).toBeTruthy();

    const events = ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'PASSWORD_RECOVERY'];
    for (const event of events) {
      await act(async () => {
        await authStateCallback?.(event, makeSession(`${event.toLowerCase()}-id`));
      });

      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
    }

    expect(fetchProfileSpy).toHaveBeenCalledTimes(4);
    expect(checkProfileSetupSpy).toHaveBeenCalledTimes(1);
  });

  it('shows destructive toast when SIGNED_IN profile fetch fails', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockRejectedValue(new Error('profile failed'));

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });
    expect(authStateCallback).toBeTruthy();

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('toast-user'));
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Profile error',
        variant: 'destructive',
      })
    );
  });

  it('resets profile when auth session becomes null', async () => {
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });

    renderHook(() => useAuth());

    await waitFor(() => {
      expect(authStateCallback).toBeTruthy();
    });

    await act(async () => {
      await authStateCallback?.('SIGNED_OUT', null);
    });

    expect(setProfileSpy).toHaveBeenCalledWith(null);
    expect(setIsProfileLoadingSpy).toHaveBeenCalledWith(false);
  });

  it('discards stale profile fetch when user changes before timeout resolves', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockImplementation(async (userId: string) => ({ username: userId }));

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });
    expect(authStateCallback).toBeTruthy();

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('user-a'));
      await authStateCallback?.('SIGNED_IN', makeSession('user-b'));
      await vi.runOnlyPendingTimersAsync();
    });

    expect(fetchProfileSpy).toHaveBeenCalledTimes(1);
    expect(fetchProfileSpy).toHaveBeenCalledWith('user-b');
    expect(setProfileSpy).toHaveBeenCalledWith({ username: 'user-b' });
    expect(setProfileSpy).not.toHaveBeenCalledWith({ username: 'user-a' });
  });

  it('unsubscribes on cleanup and suppresses updates after unmount', async () => {
    vi.useFakeTimers();
    const delayedSession = new Promise((resolve) => {
      setTimeout(() => resolve({ data: { session: makeSession('late-user') }, error: null }), 50);
    });
    mockGetAuthSession.mockReturnValue(delayedSession);

    const { unmount } = renderHook(() => useAuth());

    unmount();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
    expect(setProfileSpy).not.toHaveBeenCalled();
    expect(setIsProfileLoadingSpy).not.toHaveBeenCalled();
  });
});
