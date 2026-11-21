import { beforeEach, describe, expect, it, vi } from 'vitest';

// The repo has no native app project. The part that runs in a browser is pinned
// here: the platform check and the "not native" guard. The native sign-in path
// is also pinned, with the Google plugin and the sign-in call mocked.
const {
  mockIsNativePlatform,
  plugin,
  mockSocialLogin,
  mockSignInWithIdToken,
  mockAuthLog,
  mockErrorLog,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(),
  // A plain flag, not a spy: Vitest clears spy history before every test.
  plugin: { loaded: false },
  mockSocialLogin: vi.fn(),
  mockSignInWithIdToken: vi.fn(),
  mockAuthLog: vi.fn(),
  mockErrorLog: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: mockIsNativePlatform },
}));

// The factory runs only when the plugin is first imported. nativeAuth imports it
// dynamically, so `plugin.loaded` shows whether the plugin was ever loaded.
vi.mock('@capgo/capacitor-social-login', () => {
  plugin.loaded = true;
  return { SocialLogin: { login: mockSocialLogin } };
});

vi.mock('@/services/auth/AuthService', () => ({
  signInWithIdToken: mockSignInWithIdToken,
}));

vi.mock('@/utils/logger', () => ({
  authLog: mockAuthLog,
  errorLog: mockErrorLog,
}));

import { isNativePlatform, loginWithGoogleNative } from '../nativeAuth';

describe('isNativePlatform', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReset();
  });

  it.each([true, false])("returns what Capacitor reports: %s (today's behaviour)", (native) => {
    mockIsNativePlatform.mockReturnValue(native);

    expect(isNativePlatform()).toBe(native);
    expect(mockIsNativePlatform).toHaveBeenCalledTimes(1);
  });
});

describe('loginWithGoogleNative on a web page', () => {
  beforeEach(() => {
    mockIsNativePlatform.mockReset();
    mockIsNativePlatform.mockReturnValue(false);
  });

  it("returns a failed result that says the method is native-only (today's behaviour)", async () => {
    const result = await loginWithGoogleNative();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('This method is only available on native mobile platforms');
    expect(result).not.toHaveProperty('user');
  });

  it("does not load the Google plugin or sign in with a token (today's behaviour)", async () => {
    await loginWithGoogleNative();

    expect(plugin.loaded).toBe(false);
    expect(mockSocialLogin).not.toHaveBeenCalled();
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });
});

describe('loginWithGoogleNative on a native phone', () => {
  const fieldsCall = () =>
    mockAuthLog.mock.calls.find(([message]) => message === 'Google login response fields:');

  beforeEach(() => {
    mockIsNativePlatform.mockReset();
    mockIsNativePlatform.mockReturnValue(true);
    mockSocialLogin.mockReset();
    mockSignInWithIdToken.mockReset();
  });

  it('signs in with the Google ID token and returns the user', async () => {
    mockSocialLogin.mockResolvedValue({
      provider: 'google',
      result: { idToken: 'secret-id-token', profile: { email: 'x@y.z' } },
    });
    mockSignInWithIdToken.mockResolvedValue({ user: { id: 'u1' } });

    const result = await loginWithGoogleNative();

    expect(result).toEqual({ success: true, user: { id: 'u1' } });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith('google', 'secret-id-token');
  });

  it('logs field names only, never the token or the email', async () => {
    mockSocialLogin.mockResolvedValue({
      provider: 'google',
      result: { idToken: 'secret-id-token', profile: { email: 'x@y.z' } },
    });
    mockSignInWithIdToken.mockResolvedValue({ user: { id: 'u1' } });

    await loginWithGoogleNative();

    expect(fieldsCall()?.[1]).toEqual({
      keys: ['provider', 'result'],
      resultKeys: ['idToken', 'profile'],
    });
    const logged = JSON.stringify(mockAuthLog.mock.calls);
    expect(logged).not.toContain('secret-id-token');
    expect(logged).not.toContain('x@y.z');
  });

  it("falls back to the server auth code when there is no ID token (today's behaviour)", async () => {
    mockSocialLogin.mockResolvedValue({
      provider: 'google',
      result: { serverAuthCode: 'server-auth-code' },
    });
    mockSignInWithIdToken.mockResolvedValue({ user: { id: 'u2' } });

    const result = await loginWithGoogleNative();

    expect(result).toEqual({ success: true, user: { id: 'u2' } });
    expect(mockSignInWithIdToken).toHaveBeenCalledWith('google', 'server-auth-code');
  });

  it('fails without signing in when the response has no token', async () => {
    mockSocialLogin.mockResolvedValue({ provider: 'google', result: {} });

    const result = await loginWithGoogleNative();

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Failed to retrieve ID token from Google login response');
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
    expect(mockErrorLog).toHaveBeenCalled();
  });

  it('logs empty field lists and fails when Google returns nothing', async () => {
    mockSocialLogin.mockResolvedValue(null);

    const result = await loginWithGoogleNative();

    expect(fieldsCall()?.[1]).toEqual({ keys: [], resultKeys: [] });
    expect(result.success).toBe(false);
    expect(mockSignInWithIdToken).not.toHaveBeenCalled();
  });
});
