import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
  matchLog: vi.fn(),
}));

// Import after mocks
import {
  fetchMatchesWithTeams,
  fetchMatchForTie,
  fetchMatchTeamIds,
  fetchMatchTimeslots,
  fetchPendingMatches,
  fetchPendingScoresMatches,
  fetchScoreSubmissions,
  fetchUncompletedMatches,
} from '../MatchQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'match-1',
  team1_id: 'team-1',
  team2_id: 'team-2',
  iscompleted: false,
  winner_id: null,
  date: '2026-04-17T18:00:00Z',
  ...overrides,
});

// Chainable mock for fetchMatchesWithTeams' paginated query:
// select → order → order → [gte → lt] → [eq] → range, where range resolves to
// the page result. Test result sets are all smaller than the page size, so the
// pagination loop runs exactly once.
const matchesQueryChain = (result: { data: unknown; error: unknown }) => {
  let rangeCall = 0;
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    select: () => chain,
    order: () => chain,
    gte: () => chain,
    lt: () => chain,
    eq: () => chain,
    // First page returns the result, later pages are empty, so the pagination
    // loop always terminates (guards against an accidental infinite loop).
    range: () => {
      rangeCall += 1;
      return Promise.resolve(rangeCall === 1 ? result : { data: [], error: null });
    },
  };
  return chain;
};

// Chain: .select().eq().is().order() (fetchPendingMatches)
const selectEqIsOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ is: () => ({ order: () => Promise.resolve(result) }) }) }),
});

// Chain: .select().eq().order() (fetchUncompletedMatches)
const selectEqOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ order: () => Promise.resolve(result) }) }),
});

// Chain: .select().limit() (fetchPendingScoresMatches)
const selectLimitChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ limit: () => Promise.resolve(result) }),
});

// Chain: .select().eq() (fetchMatchTimeslots)
const selectEqChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => Promise.resolve(result) }),
});

// Chain: .select().eq().order() → for score_submissions
const selectEqOrderDescChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ order: () => Promise.resolve(result) }) }),
});

// Chain: .select().eq().maybySingle() (fetchMatchForTie, fetchMatchTeamIds)
const selectEqMaybeSingleChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
});

// ─── fetchMatchesWithTeams ────────────────────────────────────────────────────

describe('fetchMatchesWithTeams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns matches on success (no filters)', async () => {
    mockFrom.mockReturnValue(matchesQueryChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesWithTeams();
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(matchesQueryChain({ data: null, error: null }));
    const result = await fetchMatchesWithTeams();
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(matchesQueryChain({ data: null, error: pgError() }));
    await expect(fetchMatchesWithTeams()).rejects.toThrow(DatabaseError);
  });

  it('applies date filter when provided', async () => {
    // With a date filter the chain gains .gte().lt() before .range()
    mockFrom.mockReturnValue(matchesQueryChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesWithTeams({ date: new Date('2026-04-17') });
    expect(result).toHaveLength(1);
  });

  it('paginates past the 1,000-row cap until a short page is returned', async () => {
    // Proves the fix: a full 1,000-row page must trigger a follow-up fetch, and
    // rows from every page are accumulated (previously capped silently at 1,000).
    interface PagingChain {
      select: () => PagingChain;
      order: () => PagingChain;
      gte: () => PagingChain;
      lt: () => PagingChain;
      eq: () => PagingChain;
      range: (from: number, to: number) => Promise<{ data: unknown; error: unknown }>;
    }
    const rangeCalls: Array<[number, number]> = [];
    const fullPage = Array.from({ length: 1000 }, (_, i) => makeMatch({ id: `m-${i}` }));
    const shortPage = [makeMatch({ id: 'm-last' })];
    const chain: PagingChain = {
      select: () => chain,
      order: () => chain,
      gte: () => chain,
      lt: () => chain,
      eq: () => chain,
      range: (from, to) => {
        rangeCalls.push([from, to]);
        const data = rangeCalls.length === 1 ? fullPage : shortPage;
        return Promise.resolve({ data, error: null });
      },
    };
    mockFrom.mockReturnValue(chain);

    const result = await fetchMatchesWithTeams();

    expect(result).toHaveLength(1001);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});

// ─── fetchPendingMatches ──────────────────────────────────────────────────────

describe('fetchPendingMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending matches', async () => {
    mockFrom.mockReturnValue(
      selectEqIsOrderChain({ data: [makeMatch({ iscompleted: true })], error: null })
    );
    const result = await fetchPendingMatches();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqIsOrderChain({ data: null, error: null }));
    const result = await fetchPendingMatches();
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(selectEqIsOrderChain({ data: null, error: pgError() }));
    await expect(fetchPendingMatches()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchUncompletedMatches ──────────────────────────────────────────────────

describe('fetchUncompletedMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns uncompleted matches', async () => {
    mockFrom.mockReturnValue(selectEqOrderChain({ data: [makeMatch()], error: null }));
    const result = await fetchUncompletedMatches();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(selectEqOrderChain({ data: null, error: null }));
    expect(await fetchUncompletedMatches()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(selectEqOrderChain({ data: null, error: pgError() }));
    await expect(fetchUncompletedMatches()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchPendingScoresMatches ────────────────────────────────────────────────

describe('fetchPendingScoresMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending score matches from view', async () => {
    mockFrom.mockReturnValue(selectLimitChain({ data: [{ id: 'm-1' }], error: null }));
    const result = await fetchPendingScoresMatches();
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('v_pending_matches');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(selectLimitChain({ data: null, error: null }));
    expect(await fetchPendingScoresMatches()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(selectLimitChain({ data: null, error: pgError() }));
    await expect(fetchPendingScoresMatches()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchMatchTimeslots ──────────────────────────────────────────────────────

describe('fetchMatchTimeslots', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns timeslots for a date', async () => {
    mockFrom.mockReturnValue(
      selectEqChain({ data: [{ id: 'ts-1', timeslot: '6:30 PM' }], error: null })
    );
    const result = await fetchMatchTimeslots('2026-04-17');
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('team_timeslots');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: null }));
    expect(await fetchMatchTimeslots('2026-04-17')).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(selectEqChain({ data: null, error: pgError() }));
    await expect(fetchMatchTimeslots('2026-04-17')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchScoreSubmissions ────────────────────────────────────────────────────

describe('fetchScoreSubmissions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending submissions', async () => {
    mockFrom.mockReturnValue(
      selectEqOrderDescChain({ data: [{ id: 'sub-1', status: 'pending' }], error: null })
    );
    const result = await fetchScoreSubmissions();
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('score_submissions');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(selectEqOrderDescChain({ data: null, error: null }));
    expect(await fetchScoreSubmissions()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(selectEqOrderDescChain({ data: null, error: pgError() }));
    await expect(fetchScoreSubmissions()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchMatchForTie ─────────────────────────────────────────────────────────

describe('fetchMatchForTie', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns match data when found', async () => {
    const match = {
      winner_id: null,
      loser_id: null,
      team1_id: 't1',
      team2_id: 't2',
      team1_game_wins: 1,
      team2_game_wins: 1,
    };
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: match, error: null }));
    const result = await fetchMatchForTie('match-1');
    expect(result.team1_id).toBe('t1');
  });

  it('throws NotFoundError when match is null', async () => {
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: null, error: null }));
    await expect(fetchMatchForTie('match-1')).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: null, error: pgError() }));
    await expect(fetchMatchForTie('match-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchMatchTeamIds ────────────────────────────────────────────────────────

describe('fetchMatchTeamIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns team IDs when found', async () => {
    mockFrom.mockReturnValue(
      selectEqMaybeSingleChain({ data: { team1_id: 't1', team2_id: 't2' }, error: null })
    );
    const result = await fetchMatchTeamIds('match-1');
    expect(result.team1_id).toBe('t1');
    expect(result.team2_id).toBe('t2');
  });

  it('throws NotFoundError when match not found', async () => {
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: null, error: null }));
    await expect(fetchMatchTeamIds('match-1')).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: null, error: pgError() }));
    await expect(fetchMatchTeamIds('match-1')).rejects.toThrow(DatabaseError);
  });
});
