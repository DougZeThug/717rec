import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args?: unknown) => mockRpc(fn, args),
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { BlindDrawService } from '../BlindDrawService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeSettings = () => ({
  id: 'settings-1',
  signup_confirmation_message: 'You signed up!',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const makeSignup = () => ({
  id: 'signup-1',
  event_date: '2026-04-17',
  first_name: 'Alice',
  last_initial: 'S',
  created_at: '2026-04-17T10:00:00Z',
});

// ─── fetchBlindDrawSettings ───────────────────────────────────────────────────

describe('BlindDrawService.fetchBlindDrawSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        limit: () => ({ single: () => Promise.resolve({ data: makeSettings(), error: null }) }),
      }),
    });
    const result = await BlindDrawService.fetchBlindDrawSettings();
    expect(result.id).toBe('settings-1');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        limit: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(BlindDrawService.fetchBlindDrawSettings()).rejects.toThrow(DatabaseError);
  });
});

// ─── updateBlindDrawSettings ──────────────────────────────────────────────────

describe('BlindDrawService.updateBlindDrawSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(
      BlindDrawService.updateBlindDrawSettings({ id: 'settings-1', message: 'Hello' })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(
      BlindDrawService.updateBlindDrawSettings({ id: 'settings-1', message: 'Hello' })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBlindDrawSignupCount ────────────────────────────────────────────────

describe('BlindDrawService.fetchBlindDrawSignupCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the count', async () => {
    mockRpc.mockResolvedValue({ data: 7, error: null });
    expect(await BlindDrawService.fetchBlindDrawSignupCount('2026-04-17')).toBe(7);
  });

  it('returns 0 when count is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    expect(await BlindDrawService.fetchBlindDrawSignupCount('2026-04-17')).toBe(0);
  });

  it('throws DatabaseError on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(BlindDrawService.fetchBlindDrawSignupCount('2026-04-17')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── fetchBlindDrawSignups ────────────────────────────────────────────────────

describe('BlindDrawService.fetchBlindDrawSignups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all signups when no eventDate filter', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeSignup()], error: null }) }),
    });
    const result = await BlindDrawService.fetchBlindDrawSignups();
    expect(result).toHaveLength(1);
  });

  it('applies eventDate filter when provided', async () => {
    // Asserting the column and the value, not just the row count: the old
    // version of this test passed whether or not a filter was applied at all.
    const eq = vi.fn().mockResolvedValue({ data: [makeSignup()], error: null });
    mockFrom.mockReturnValue({ select: () => ({ order: () => ({ eq }) }) });

    const result = await BlindDrawService.fetchBlindDrawSignups('2026-04-17');

    expect(eq).toHaveBeenCalledWith('event_date', '2026-04-17');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(BlindDrawService.fetchBlindDrawSignups()).rejects.toThrow(DatabaseError);
  });
});

// ─── createSignup ─────────────────────────────────────────────────────────────

describe('BlindDrawService.createSignup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: null }),
    });
    await expect(
      BlindDrawService.createSignup({
        eventDate: '2026-04-17',
        firstName: 'Alice',
        lastInitial: 's',
      })
    ).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: pgError() }),
    });
    await expect(
      BlindDrawService.createSignup({
        eventDate: '2026-04-17',
        firstName: 'Alice',
        lastInitial: 's',
      })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteSignup ─────────────────────────────────────────────────────────────

describe('BlindDrawService.deleteSignup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });
    await expect(BlindDrawService.deleteSignup('signup-1')).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(BlindDrawService.deleteSignup('signup-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── clearSignups ─────────────────────────────────────────────────────────────

describe('BlindDrawService.clearSignups', () => {
  beforeEach(() => vi.clearAllMocks());

  /** A delete chain offering both filters, so the service picks one. */
  const wireDelete = (result: { error: unknown } = { error: null }) => {
    const eq = vi.fn().mockResolvedValue(result);
    const neq = vi.fn().mockResolvedValue(result);
    mockFrom.mockReturnValue({ delete: () => ({ eq, neq }) });
    return { eq, neq };
  };

  // The whole point of the date argument: an unscoped clear took next week's
  // signups along with tonight's.
  it('removes one night when given a date, and only that night', async () => {
    const { eq, neq } = wireDelete();

    await expect(BlindDrawService.clearSignups('2026-04-17')).resolves.toBeUndefined();

    expect(eq).toHaveBeenCalledWith('event_date', '2026-04-17');
    expect(neq).not.toHaveBeenCalled();
  });

  it('removes every night when given no date', async () => {
    const { eq, neq } = wireDelete();

    await expect(BlindDrawService.clearSignups()).resolves.toBeUndefined();

    // PostgREST refuses a delete with no filter at all; the nil uuid is how it
    // is told "every row".
    expect(neq).toHaveBeenCalledWith('id', '00000000-0000-0000-0000-000000000000');
    expect(eq).not.toHaveBeenCalled();
  });

  it('throws DatabaseError on error', async () => {
    wireDelete({ error: pgError() });
    await expect(BlindDrawService.clearSignups()).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when one night fails', async () => {
    wireDelete({ error: pgError() });
    await expect(BlindDrawService.clearSignups('2026-04-17')).rejects.toThrow(DatabaseError);
  });
});
