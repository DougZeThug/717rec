import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), matchLog: vi.fn(),
}));

vi.mock('@/utils/timezone', () => ({
  createEveningAwareDateRange: (date: Date) => ({
    startDate: new Date(`${date.toISOString().split('T')[0]}T16:00:00Z`),
    endDate: new Date(`${date.toISOString().split('T')[0]}T23:59:59Z`),
  }),
}));

// Import after mocks
import { fetchMatchesForAdmin, fetchScheduleMatches } from '../MatchScheduleAdminService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeMatch = (id = 'match-1') => ({
  id, team1_id: 'team-1', team2_id: 'team-2', date: '2026-04-17T18:00:00Z',
});

// ─── fetchMatchesForAdmin ─────────────────────────────────────────────────────

describe('fetchMatchesForAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns matches with no date filter', async () => {
    // No date: .select().order() → Promise
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeMatch()], error: null }) }),
    });
    const result = await fetchMatchesForAdmin({});
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('applies date range when date is provided', async () => {
    // With date: .select().order().gte().lte()
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          gte: () => ({
            lte: () => Promise.resolve({ data: [makeMatch()], error: null }),
          }),
        }),
      }),
    });
    const result = await fetchMatchesForAdmin({ date: new Date('2026-04-17') });
    expect(result).toHaveLength(1);
  });

  it('applies bracket filter when bracketId is provided', async () => {
    // No date + bracket: .select().order().eq()
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          eq: () => Promise.resolve({ data: [makeMatch()], error: null }),
        }),
      }),
    });
    const result = await fetchMatchesForAdmin({ bracketId: 'bracket-1' });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchMatchesForAdmin({})).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchMatchesForAdmin({})).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchScheduleMatches ─────────────────────────────────────────────────────

describe('fetchScheduleMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns schedule matches on success', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }) }) }),
        };
      }
      // matches
      return {
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [makeMatch()], error: null }) }) }),
      };
    });
    const result = await fetchScheduleMatches();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    expect(await fetchScheduleMatches()).toEqual([]);
  });

  it('throws DatabaseError when matches query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }) }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }) }),
      };
    });
    await expect(fetchScheduleMatches()).rejects.toThrow(DatabaseError);
  });
});
