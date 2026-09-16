import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserProfile } from '@/types/user';

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

type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>;

let authStateCallback: AuthStateCallback | null = null;
let unsubscribeSpy: ReturnType<typeof vi.fn>;

let profileState: UserProfile | null;
let isProfileLoadingState = false;
// Mirrors useState's setter, which the hook now calls with an updater as well
// as a plain value: keepProfileOnlyFor decides against whatever is held at the
// moment React applies it.
type ProfileUpdate = UserProfile | null | ((held: UserProfile | null) => UserProfile | null);
const setProfileSpy = vi.fn((value: ProfileUpdate) => {
  profileState = typeof value === 'function' ? value(profileState) : value;
});
const setIsProfileLoadingSpy = vi.fn((value: boolean) => {
  isProfileLoadingState = value;
});
let profileLoadFailedState = false;
const setProfileLoadFailedSpy = vi.fn((value: boolean) => {
  profileLoadFailedState = value;
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

// Only the hook is stubbed. keepProfileOnlyFor stays real, because what the
// hook does with it is exactly what these tests are checking.
vi.mock('@/hooks/auth/useAuthProfile', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/auth/useAuthProfile')>()),
  useAuthProfile: (...args: unknown[]) => mockUseAuthProfile(...args),
}));

vi.mock('@/hooks/useThemeConsistency', () => ({
  useThemeConsistency: () => ({ ensureThemeConsistency: mockEnsureThemeConsistency }),
}));

vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

const makeSession = (id: string, email = `${id}@example.com`) =>
  ({ user: { id, email } }) as Session;

const setupUseAuthProfileMock = () => {
  mockUseAuthProfile.mockImplementation(() => ({
    profile: profileState,
    setProfile: setProfileSpy,
    isProfileLoading: isProfileLoadingState,
    setIsProfileLoading: setIsProfileLoadingSpy,
    profileLoadFailed: profileLoadFailedState,
    setProfileLoadFailed: setProfileLoadFailedSpy,
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
    profileLoadFailedState = false;
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

    mockOnAuthStateChange.mockImplementation((cb: AuthStateCallback) => {
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

    await act(async () => {
      await authStateCallback?.('INITIAL_SESSION', null);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toBeNull();
    expect(setProfileSpy).toHaveBeenCalledWith(null);
    expect(setIsProfileLoadingSpy).toHaveBeenCalledWith(false);
    expect(result.current.signIn).toBe(signIn);
    expect(result.current.signUp).toBe(signUp);
    expect(result.current.signOut).toBe(signOut);
    expect(result.current.signInWithGoogle).toBe(signInWithGoogle);
    expect(result.current.signInWithGoogleNative).toBe(signInWithGoogleNative);
    expect(result.current.refreshProfile).toBe(refreshProfileSpy);

    act(() => {
      result.current.clearAuthError();
    });
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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(mockGetAuthSession).toHaveBeenCalledTimes(3);
  });

  it('handles SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED and PASSWORD_RECOVERY events', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockResolvedValue({ username: 'event-user' });

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });
    expect(authStateCallback).toBeTruthy();

    const events: AuthChangeEvent[] = [
      'SIGNED_IN',
      'INITIAL_SESSION',
      'TOKEN_REFRESHED',
      'PASSWORD_RECOVERY',
    ];

    for (const event of events) {
      await act(async () => {
        await authStateCallback?.(event, makeSession(`${event.toLowerCase()}-id`));
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }

    expect(fetchProfileSpy).toHaveBeenCalledTimes(4);
    expect(checkProfileSetupSpy).toHaveBeenCalledTimes(1);
    expect(checkProfileSetupSpy).toHaveBeenCalledWith({ username: 'event-user' });
  });

  it('shows destructive toast when SIGNED_IN profile fetch fails', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockRejectedValue(new Error('profile failed'));

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('toast-user'));
      await vi.advanceTimersByTimeAsync(0);
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

  it('discards stale profile fetch when user changes before timeout callback resolves', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockImplementation((userId: string) =>
      Promise.resolve({ username: userId } as UserProfile)
    );

    renderHook(() => useAuth());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('user-a'));
      await authStateCallback?.('SIGNED_IN', makeSession('user-b'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetchProfileSpy).toHaveBeenCalledTimes(1);
    expect(fetchProfileSpy).toHaveBeenCalledWith('user-b');
    expect(setProfileSpy).toHaveBeenCalledWith({ username: 'user-b' });
    expect(setProfileSpy).not.toHaveBeenCalledWith({ username: 'user-a' });
  });

  // The profile used to be dropped only on sign-out, so signing in as somebody
  // else left the previous person's profile in memory for as long as the new
  // fetch took — and the admin decision is made from whatever is held.
  it('drops the held profile as soon as a different user signs in', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId, is_admin: false } as unknown as UserProfile)
    );

    renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('admin-a'));
      await vi.advanceTimersByTimeAsync(0);
    });
    profileState = { id: 'admin-a', is_admin: true } as unknown as UserProfile;

    // The fetch is deliberately not advanced: this is the window before user
    // b's own profile arrives.
    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('user-b'));
    });

    expect(profileState).toBeNull();
  });

  // The stable end state that made it more than a flicker: user b's profile
  // read fails, so nothing replaces what is held. Anything left over answers
  // the admin question for the wrong person.
  it("does not keep a previous user's profile when the new user's read fails", async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockRejectedValue(new Error('profile failed'));

    renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });

    profileState = { id: 'admin-a', is_admin: true } as unknown as UserProfile;

    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('user-b'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(profileState).toBeNull();
    expect(profileLoadFailedState).toBe(true);
  });

  // Unmounting must cancel the timer the auth event scheduled, not merely leave
  // it to fire into a guard.
  //
  // The guard makes the callback harmless either way, so "fetchProfile was not
  // called" cannot tell a cancelled timer from a guarded one. The pending timer
  // count can: it drops to zero only if the cleanup really cancelled it. This
  // is also the evidence behind the reply on the pull request about React
  // Doctor's effect-needs-cleanup report, which has survived every form the
  // cleanup has been written in.
  it('cancels the timer it scheduled when the effect is torn down', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId, is_admin: false } as unknown as UserProfile)
    );

    const { unmount } = renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });

    // The deferred profile fetch is scheduled but has not run.
    await act(async () => {
      await authStateCallback?.('SIGNED_IN', makeSession('user-a'));
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  // The same rule on the bootstrap path, which runs on a cold load rather than
  // on an auth event and has its own failure branch.
  it("does not keep a previous user's profile when the bootstrap read fails", async () => {
    mockGetAuthSession.mockResolvedValue({
      data: { session: makeSession('user-b') },
      error: null,
    });
    fetchProfileSpy.mockRejectedValue(new Error('profile failed'));

    profileState = { id: 'admin-a', is_admin: true } as unknown as UserProfile;

    renderHook(() => useAuth());

    await waitFor(() => expect(profileLoadFailedState).toBe(true));
    expect(profileState).toBeNull();
  });

  // The other half of the rule: a read that fails for the user whose profile we
  // already hold must not throw that profile away. A reload fetches twice, and
  // one failing is not a reason to hide the dashboard behind the retry card.
  it('keeps the held profile when the failed read is for that same user', async () => {
    vi.useFakeTimers();
    mockGetAuthSession.mockResolvedValue({ data: { session: null }, error: null });
    fetchProfileSpy.mockRejectedValue(new Error('profile failed'));

    renderHook(() => useAuth());
    await act(async () => {
      await Promise.resolve();
    });

    const held = { id: 'user-b', is_admin: true } as unknown as UserProfile;
    profileState = held;

    await act(async () => {
      await authStateCallback?.('TOKEN_REFRESHED', makeSession('user-b'));
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(profileState).toBe(held);
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
