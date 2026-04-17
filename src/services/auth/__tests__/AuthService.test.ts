import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithIdToken: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: mockAuth },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

// Import after mocks
import {
  getAuthSession,
  onAuthStateChange,
  signInWithEmail,
  signInWithIdToken,
  signInWithOAuth,
  signOutUser,
  signUpWithEmail,
} from '../AuthService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const authError = (msg = 'auth failed') => ({ message: msg, status: 401, name: 'AuthError' });

// ─── signInWithEmail ──────────────────────────────────────────────────────────

describe('signInWithEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns auth data on success', async () => {
    const data = { user: { id: 'u-1' }, session: { access_token: 'tok' } };
    mockAuth.signInWithPassword.mockResolvedValue({ data, error: null });
    const result = await signInWithEmail('a@b.com', 'pass');
    expect(result).toBe(data);
  });

  it('throws DatabaseError on auth error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ data: null, error: authError() });
    await expect(signInWithEmail('a@b.com', 'wrong')).rejects.toThrow(DatabaseError);
  });
});

// ─── signUpWithEmail ──────────────────────────────────────────────────────────

describe('signUpWithEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns auth data on success', async () => {
    const data = { user: { id: 'u-2' }, session: null };
    mockAuth.signUp.mockResolvedValue({ data, error: null });
    const result = await signUpWithEmail('a@b.com', 'pass');
    expect(result).toBe(data);
  });

  it('throws DatabaseError on error', async () => {
    mockAuth.signUp.mockResolvedValue({ data: null, error: authError() });
    await expect(signUpWithEmail('a@b.com', 'pass')).rejects.toThrow(DatabaseError);
  });
});

// ─── signOutUser ──────────────────────────────────────────────────────────────

describe('signOutUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(signOutUser()).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockAuth.signOut.mockResolvedValue({ error: authError() });
    await expect(signOutUser()).rejects.toThrow(DatabaseError);
  });
});

// ─── signInWithOAuth ──────────────────────────────────────────────────────────

describe('signInWithOAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ error: null });
    await expect(signInWithOAuth('https://app.com/callback')).resolves.toBeUndefined();
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://app.com/callback' },
    });
  });

  it('throws DatabaseError on error', async () => {
    mockAuth.signInWithOAuth.mockResolvedValue({ error: authError() });
    await expect(signInWithOAuth('https://app.com/callback')).rejects.toThrow(DatabaseError);
  });
});

// ─── getAuthSession ───────────────────────────────────────────────────────────

describe('getAuthSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the session result from supabase.auth.getSession', async () => {
    const sessionResult = { data: { session: { access_token: 'tok' } }, error: null };
    mockAuth.getSession.mockResolvedValue(sessionResult);
    const result = await getAuthSession();
    expect(result).toBe(sessionResult);
  });
});

// ─── onAuthStateChange ────────────────────────────────────────────────────────

describe('onAuthStateChange', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls supabase.auth.onAuthStateChange with the callback', () => {
    const sub = { data: { subscription: { unsubscribe: vi.fn() } } };
    mockAuth.onAuthStateChange.mockReturnValue(sub);
    const cb = vi.fn();
    const result = onAuthStateChange(cb);
    expect(mockAuth.onAuthStateChange).toHaveBeenCalledWith(cb);
    expect(result).toBe(sub);
  });
});

// ─── signInWithIdToken ────────────────────────────────────────────────────────

describe('signInWithIdToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns auth data on success', async () => {
    const data = { user: { id: 'u-3' }, session: { access_token: 'tok' } };
    mockAuth.signInWithIdToken.mockResolvedValue({ data, error: null });
    const result = await signInWithIdToken('google', 'id-token');
    expect(result).toBe(data);
  });

  it('throws DatabaseError on error', async () => {
    mockAuth.signInWithIdToken.mockResolvedValue({ data: null, error: authError() });
    await expect(signInWithIdToken('google', 'bad-token')).rejects.toThrow(DatabaseError);
  });
});
