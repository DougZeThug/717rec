import { beforeEach, describe, expect, it, vi } from 'vitest';

// The repo has no native app project, so only the part that runs in a browser
// is pinned here: the platform check and the "not native" guard. The token
// pick-up and the native sign-in path stay untested on purpose.
const { mockIsNativePlatform, plugin, mockSocialLogin, mockSignInWithIdToken } = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(),
  // A plain flag, not a spy: Vitest clears spy history before every test.
  plugin: { loaded: false },
  mockSocialLogin: vi.fn(),
  mockSignInWithIdToken: vi.fn(),
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
  authLog: vi.fn(),
  errorLog: vi.fn(),
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
