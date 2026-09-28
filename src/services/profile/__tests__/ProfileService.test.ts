import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  teamLog: vi.fn(),
  matchLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { checkUsernameAvailability, updateProfile } from '../ProfileService';

// ─── checkUsernameAvailability ────────────────────────────────────────────────

describe('checkUsernameAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { available: null } when username is shorter than 3 characters', async () => {
    const result = await checkUsernameAvailability({ username: 'ab' });
    expect(result).toEqual({ available: null });
    // The database should not be asked
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns { available: true } when username matches currentUsername', async () => {
    const result = await checkUsernameAvailability({
      username: 'alice',
      currentUsername: 'alice',
    });
    expect(result).toEqual({ available: true });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  // RLS lets a player read only their own profile, so reading the table found
  // nothing for a name another player owned, and the answer was "available".
  it('asks the database function, not the profiles table', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await checkUsernameAvailability({ username: 'valid_user' });

    expect(mockRpc).toHaveBeenCalledWith('is_username_taken', { _username: 'valid_user' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns { available: false } when username is already taken', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await checkUsernameAvailability({ username: 'taken_name' });
    expect(result).toEqual({ available: false });
  });

  it('returns { available: true } when username is not taken', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    const result = await checkUsernameAvailability({ username: 'fresh_name' });
    expect(result).toEqual({ available: true });
  });

  it('returns { available: null } on Supabase error (non-critical fallback)', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'connection error',
        code: '08000',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    const result = await checkUsernameAvailability({ username: 'some_user' });
    // Returns null (unknown) instead of throwing — best-effort hint
    expect(result).toEqual({ available: null });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns { available: null } when the call throws', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));

    const result = await checkUsernameAvailability({ username: 'some_user' });
    expect(result).toEqual({ available: null });
  });

  it('returns { available: null } when the answer is neither yes nor no', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await checkUsernameAvailability({ username: 'some_user' });
    expect(result).toEqual({ available: null });
  });

  it('is case-sensitive — different case is treated as different username', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    // 'Alice' vs 'alice' — currentUsername check is strict equality
    const result = await checkUsernameAvailability({
      username: 'Alice',
      currentUsername: 'alice',
    });
    // Not the same username — should ask the database, with the case kept
    expect(mockRpc).toHaveBeenCalledWith('is_username_taken', { _username: 'Alice' });
    expect(result.available).toBe(true);
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue({
      upsert: () => Promise.resolve({ error: null }),
    });

    await expect(
      updateProfile('user-1', { username: 'newname', fullName: 'Full Name' })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      upsert: () =>
        Promise.resolve({
          error: {
            message: 'update failed',
            code: '23503',
            details: null,
            hint: null,
            name: 'PostgrestError',
          },
        }),
    });

    await expect(updateProfile('user-1', { username: 'newname' })).rejects.toThrow(DatabaseError);
  });

  it('updates the profiles table', async () => {
    mockFrom.mockReturnValue({
      upsert: () => Promise.resolve({ error: null }),
    });

    await updateProfile('user-1', { username: 'testuser' });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('sets full_name to null when fullName is not provided', async () => {
    const mockUpsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await updateProfile('user-1', { username: 'testuser' });
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.full_name).toBeNull();
    expect(upsertArg.id).toBe('user-1');
  });

  it('sets full_name when fullName is provided', async () => {
    const mockUpsert = vi.fn().mockReturnValue(Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    await updateProfile('user-1', { username: 'testuser', fullName: 'Jane Doe' });
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(upsertArg.full_name).toBe('Jane Doe');
  });
});
