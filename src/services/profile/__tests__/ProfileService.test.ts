import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
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
    // Supabase should not be called
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns { available: true } when username matches currentUsername', async () => {
    const result = await checkUsernameAvailability({
      username: 'alice',
      currentUsername: 'alice',
    });
    expect(result).toEqual({ available: true });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns { available: false } when username is already taken', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { username: 'taken_name' }, error: null }),
        }),
      }),
    });

    const result = await checkUsernameAvailability({ username: 'taken_name' });
    expect(result).toEqual({ available: false });
  });

  it('returns { available: true } when username is not taken', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const result = await checkUsernameAvailability({ username: 'fresh_name' });
    expect(result).toEqual({ available: true });
  });

  it('returns { available: null } on Supabase error (non-critical fallback)', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: null,
              error: {
                message: 'connection error',
                code: '08000',
                details: null,
                hint: null,
                name: 'PostgrestError',
              },
            }),
        }),
      }),
    });

    const result = await checkUsernameAvailability({ username: 'some_user' });
    // Returns null (unknown) instead of throwing — best-effort hint
    expect(result).toEqual({ available: null });
  });

  it('queries the profiles table', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    await checkUsernameAvailability({ username: 'valid_user' });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('is case-sensitive — different case is treated as different username', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    // 'Alice' vs 'alice' — currentUsername check is strict equality
    const result = await checkUsernameAvailability({
      username: 'Alice',
      currentUsername: 'alice',
    });
    // Not the same username — should query DB
    expect(mockFrom).toHaveBeenCalled();
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

    await expect(
      updateProfile('user-1', { username: 'newname' })
    ).rejects.toThrow(DatabaseError);
  });

  it('updates the profiles table', async () => {
    mockFrom.mockReturnValue({
      upsert: () => Promise.resolve({ error: null }),
    });

    await updateProfile('user-1', { username: 'testuser' });
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('sets full_name to null when fullName is not provided', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await updateProfile('user-1', { username: 'testuser' });
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.full_name).toBeNull();
  });

  it('sets full_name when fullName is provided', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: () => Promise.resolve({ error: null }),
    });
    mockFrom.mockReturnValue({ update: mockUpdate });

    await updateProfile('user-1', { username: 'testuser', fullName: 'Jane Doe' });
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.full_name).toBe('Jane Doe');
  });
});
