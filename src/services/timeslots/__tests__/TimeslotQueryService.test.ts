import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  teamLog: vi.fn(),
  scheduleLog: vi.fn(),
}));

// Import after mocks
import { TimeslotQueryService } from '../TimeslotQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeRawSlot = (overrides: Record<string, unknown> = {}) => ({
  id: 'ts-1',
  match_date: '2026-04-17',
  timeslot: '6:30 PM',
  team_id: 'team-1',
  created_at: '2026-04-17T00:00:00Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  teams: null,
  ...overrides,
});

// Chains matching each query shape:
const selectEqChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => Promise.resolve(result) }),
});

const selectEqGteLteOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({
    eq: () => ({
      gte: () => ({
        lte: () => ({
          order: () => Promise.resolve(result),
        }),
      }),
    }),
  }),
});

const selectEqInEqChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({
    eq: () => ({
      in: () => ({
        eq: () => Promise.resolve(result),
      }),
    }),
  }),
});

const selectEqEqChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({
    eq: () => ({
      eq: () => Promise.resolve(result),
    }),
  }),
});

// ─── fetchByDate ──────────────────────────────────────────────────────────────

describe('TimeslotQueryService.fetchByDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns transformed timeslots on success', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: [makeRawSlot()], error: null }));
    const result = await TimeslotQueryService.fetchByDate(new Date('2026-04-17'));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ts-1');
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: [], error: null }));
    const result = await TimeslotQueryService.fetchByDate(new Date('2026-04-17'));
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: pgError() }));
    await expect(TimeslotQueryService.fetchByDate(new Date('2026-04-17'))).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── fetchTimeslotsByDate ─────────────────────────────────────────────────────

describe('TimeslotQueryService.fetchTimeslotsByDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns raw rows on success', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: [makeRawSlot()], error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsByDate('2026-04-17');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsByDate('2026-04-17');
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: pgError() }));
    await expect(TimeslotQueryService.fetchTimeslotsByDate('2026-04-17')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── fetchTimeslotsForDate ────────────────────────────────────────────────────

describe('TimeslotQueryService.fetchTimeslotsForDate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns raw rows on success', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: [makeRawSlot()], error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsForDate('2026-04-17');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsForDate('2026-04-17');
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: pgError() }));
    await expect(TimeslotQueryService.fetchTimeslotsForDate('2026-04-17')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── fetchWeekTimeslotsByTeam ─────────────────────────────────────────────────

describe('TimeslotQueryService.fetchWeekTimeslotsByTeam', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows within date range', async () => {
    mockFrom.mockReturnValue(
      selectEqGteLteOrderChain({ data: [makeRawSlot(), makeRawSlot({ id: 'ts-2' })], error: null })
    );
    const result = await TimeslotQueryService.fetchWeekTimeslotsByTeam(
      'team-1',
      '2026-04-14',
      '2026-04-20'
    );
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqGteLteOrderChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchWeekTimeslotsByTeam(
      'team-1',
      '2026-04-14',
      '2026-04-20'
    );
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqGteLteOrderChain({ data: null, error: pgError() }));
    await expect(
      TimeslotQueryService.fetchWeekTimeslotsByTeam('team-1', '2026-04-14', '2026-04-20')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTimeslotsForPair ────────────────────────────────────────────────────

describe('TimeslotQueryService.fetchTimeslotsForPair', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows for the pair slots', async () => {
    mockFrom.mockReturnValue(selectEqInEqChain({ data: [makeRawSlot()], error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsForPair(
      '2026-04-17',
      '6:30 PM',
      '7:00 PM'
    );
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqInEqChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchTimeslotsForPair(
      '2026-04-17',
      '6:30 PM',
      '7:00 PM'
    );
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqInEqChain({ data: null, error: pgError() }));
    await expect(
      TimeslotQueryService.fetchTimeslotsForPair('2026-04-17', '6:30 PM', '7:00 PM')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamsByTimeslot ─────────────────────────────────────────────────────

describe('TimeslotQueryService.fetchTeamsByTimeslot', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns rows for the given timeslot', async () => {
    mockFrom.mockReturnValue(
      selectEqEqChain({ data: [{ team_id: 'team-1', teams: null }], error: null })
    );
    const result = await TimeslotQueryService.fetchTeamsByTimeslot('2026-04-17', '6:30 PM');
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqEqChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchTeamsByTimeslot('2026-04-17', '6:30 PM');
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqEqChain({ data: null, error: pgError() }));
    await expect(
      TimeslotQueryService.fetchTeamsByTimeslot('2026-04-17', '6:30 PM')
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTimeslotValidation ──────────────────────────────────────────────────

describe('TimeslotQueryService.fetchTimeslotValidation', () => {
  beforeEach(() => vi.clearAllMocks());

  const validationChain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => ({
            in: () => Promise.resolve(result),
          }),
        }),
      }),
    }),
  });

  it('returns data on success', async () => {
    const rows = [{ timeslot: '6:30 PM', match_sequence: 1 }];
    mockFrom.mockReturnValue(validationChain({ data: rows, error: null }));
    const result = await TimeslotQueryService.fetchTimeslotValidation(
      '2026-04-17',
      'team-1',
      '6:30 PM',
      '7:00 PM'
    );
    expect(result).toEqual(rows);
  });

  it('throws DatabaseError on Supabase error (no longer swallows failures)', async () => {
    mockFrom.mockReturnValue(validationChain({ data: null, error: pgError() }));
    await expect(
      TimeslotQueryService.fetchTimeslotValidation('2026-04-17', 'team-1', '6:30 PM', '7:00 PM')
    ).rejects.toThrow(DatabaseError);
  });

  it('returns null when data is null and no error', async () => {
    mockFrom.mockReturnValue(validationChain({ data: null, error: null }));
    const result = await TimeslotQueryService.fetchTimeslotValidation(
      '2026-04-17',
      'team-1',
      '6:30 PM',
      '7:00 PM'
    );
    expect(result).toBeNull();
  });
});
