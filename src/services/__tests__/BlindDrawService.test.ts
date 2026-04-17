import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

// Import after mocks
import { BlindDrawService } from '../BlindDrawService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeSettings = () => ({
  id: 'settings-1',
  signup_confirmation_message: 'You signed up!',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

const makeSignup = () => ({
  id: 'signup-1', event_date: '2026-04-17', first_name: 'Alice', last_initial: 'S', created_at: '2026-04-17T10:00:00Z',
});

// ─── fetchBlindDrawSettings ───────────────────────────────────────────────────

describe('BlindDrawService.fetchBlindDrawSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns settings on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ single: () => Promise.resolve({ data: makeSettings(), error: null }) }) }),
    });
    const result = await BlindDrawService.fetchBlindDrawSettings();
    expect(result.id).toBe('settings-1');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }) }),
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
    await expect(BlindDrawService.updateBlindDrawSettings({ id: 'settings-1', message: 'Hello' })).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(BlindDrawService.updateBlindDrawSettings({ id: 'settings-1', message: 'Hello' })).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchBlindDrawSignupCount ────────────────────────────────────────────────

describe('BlindDrawService.fetchBlindDrawSignupCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the count', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ count: 7, error: null }),
    });
    expect(await BlindDrawService.fetchBlindDrawSignupCount()).toBe(7);
  });

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ count: null, error: null }),
    });
    expect(await BlindDrawService.fetchBlindDrawSignupCount()).toBe(0);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ count: null, error: pgError() }),
    });
    await expect(BlindDrawService.fetchBlindDrawSignupCount()).rejects.toThrow(DatabaseError);
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
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          eq: () => Promise.resolve({ data: [makeSignup()], error: null }),
        }),
      }),
    });
    const result = await BlindDrawService.fetchBlindDrawSignups('2026-04-17');
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
    await expect(BlindDrawService.createSignup({ eventDate: '2026-04-17', firstName: 'Alice', lastInitial: 's' })).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      insert: () => Promise.resolve({ error: pgError() }),
    });
    await expect(BlindDrawService.createSignup({ eventDate: '2026-04-17', firstName: 'Alice', lastInitial: 's' })).rejects.toThrow(DatabaseError);
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

  it('resolves on success', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ neq: () => Promise.resolve({ error: null }) }),
    });
    await expect(BlindDrawService.clearSignups()).resolves.toBeUndefined();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      delete: () => ({ neq: () => Promise.resolve({ error: pgError() }) }),
    });
    await expect(BlindDrawService.clearSignups()).rejects.toThrow(DatabaseError);
  });
});
