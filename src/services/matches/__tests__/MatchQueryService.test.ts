import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(), matchLog: vi.fn(),
}));

// Import after mocks
import {
  fetchMatchForTie,
  fetchMatchTeamIds,
  fetchMatchTimeslots,
  fetchMatchesWithTeams,
  fetchPendingMatches,
  fetchPendingScoresMatches,
  fetchScoreSubmissions,
  fetchUncompletedMatches,
} from '../MatchQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

const makeMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'match-1', team1_id: 'team-1', team2_id: 'team-2',
  iscompleted: false, winner_id: null, date: '2026-04-17T18:00:00Z', ...overrides,
});

// Chain: .select().order() → Promise (fetchMatchesWithTeams no filters)
const selectOrderChain = (result: { data: unknown; error: unknown }) => ({
  select: () => ({ order: () => Promise.resolve(result) }),
});

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
    mockFrom.mockReturnValue(selectOrderChain({ data: [makeMatch()], error: null }));
    const result = await fetchMatchesWithTeams();
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(selectOrderChain({ data: null, error: null }));
    const result = await fetchMatchesWithTeams();
    expect(result).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(selectOrderChain({ data: null, error: pgError() }));
    await expect(fetchMatchesWithTeams()).rejects.toThrow(DatabaseError);
  });

  it('applies date filter when provided', async () => {
    // With date filter the chain gains .gte().lt()
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({
          gte: () => ({ lt: () => Promise.resolve({ data: [makeMatch()], error: null }) }),
        }),
      }),
    });
    const result = await fetchMatchesWithTeams({ date: new Date('2026-04-17') });
    expect(result).toHaveLength(1);
  });
});

// ─── fetchPendingMatches ──────────────────────────────────────────────────────

describe('fetchPendingMatches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending matches', async () => {
    mockFrom.mockReturnValue(selectEqIsOrderChain({ data: [makeMatch({ iscompleted: true })], error: null }));
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
    mockFrom.mockReturnValue(selectEqChain({ data: [{ id: 'ts-1', timeslot: '6:30 PM' }], error: null }));
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
    mockFrom.mockReturnValue(selectEqOrderDescChain({ data: [{ id: 'sub-1', status: 'pending' }], error: null }));
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
    const match = { winner_id: null, loser_id: null, team1_id: 't1', team2_id: 't2', team1_game_wins: 1, team2_game_wins: 1 };
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
    mockFrom.mockReturnValue(selectEqMaybeSingleChain({ data: { team1_id: 't1', team2_id: 't2' }, error: null }));
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
