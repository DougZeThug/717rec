import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError, NotFoundError } from '@/types/errors';
import { getUIErrorMessage } from '@/utils/errorHandler';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockGetUser = vi.fn(() => Promise.resolve({ data: { user: { id: 'admin-1' } } }));
const mockInvoke = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getUser: () => mockGetUser() },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  teamLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import {
  approveMatchResult,
  batchCreateMatches,
  confirmMatchTie,
  createMatch,
  createScoreSubmission,
  deleteMatchWithStatsReversal,
  fetchActiveSeason,
  fetchActiveSeasonIdOptional,
  MatchCreateData,
  MatchNonResultUpdate,
  reopenMatchResult,
  saveAutoScheduleMatches,
  updateMatch,
  updateScoreSubmissionStatus,
} from '../MatchWriteService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeMatchData = (overrides: Partial<MatchCreateData> = {}): MatchCreateData => ({
  team1_id: 'team-a',
  team2_id: 'team-b',
  date: '2025-06-15T10:00:00',
  location: 'Court A',
  iscompleted: false,
  round_number: 1,
  team1_score: 0,
  team2_score: 0,
  team1_game_wins: 0,
  team2_game_wins: 0,
  season_id: 'season-1',
  ...overrides,
});

/** A PostgrestError shape, the way this file's other write tests build one. */
const postgrestError = (message = 'query failed') => ({
  message,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

// Type-level guard: result fields must not be accepted by generic match updates.
const assertNonResultUpdate = (_payload: MatchNonResultUpdate) => undefined;
// @ts-expect-error winner_id is a result field and must go through an atomic RPC.
assertNonResultUpdate({ winner_id: 'team-a' });

// ─── fetchActiveSeason ────────────────────────────────────────────────────────

describe('fetchActiveSeason', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the active season id', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
        }),
      }),
    });

    const id = await fetchActiveSeason();
    expect(id).toBe('season-1');
  });

  it('throws NotFoundError when no active season exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    await expect(fetchActiveSeason()).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: null,
              error: {
                message: 'connection lost',
                code: '08006',
                details: null,
                hint: null,
                name: 'PostgrestError',
              },
            }),
        }),
      }),
    });

    await expect(fetchActiveSeason()).rejects.toThrow(DatabaseError);
  });

  it('queries the seasons table', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
        }),
      }),
    });

    await fetchActiveSeason();
    expect(mockFrom).toHaveBeenCalledWith('seasons');
  });
});

// ─── batchCreateMatches ───────────────────────────────────────────────────────

describe('batchCreateMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns created matches on success', async () => {
    const createdMatches = [{ id: 'new-match-1', ...makeMatchData() }];
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => Promise.resolve({ data: createdMatches, error: null }),
      }),
    });

    const result = await batchCreateMatches([makeMatchData()]);
    expect(result).toEqual(createdMatches);
  });

  it('handles creating multiple matches at once', async () => {
    const matches = [makeMatchData(), makeMatchData({ team1_id: 'team-c', team2_id: 'team-d' })];
    const created = matches.map((m, i) => ({ id: `match-${i}`, ...m }));

    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => Promise.resolve({ data: created, error: null }),
      }),
    });

    const result = await batchCreateMatches(matches);
    expect(result).toHaveLength(2);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () =>
          Promise.resolve({
            data: null,
            error: {
              message: 'insert failed',
              code: '23505',
              details: null,
              hint: null,
              name: 'PostgrestError',
            },
          }),
      }),
    });

    await expect(batchCreateMatches([makeMatchData()])).rejects.toThrow(DatabaseError);
  });

  it('inserts into the matches table', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
      }),
    });

    await batchCreateMatches([makeMatchData()]);
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });
});

// ─── createMatch ──────────────────────────────────────────────────────────────

describe('createMatch', () => {
  it('saves a new match as not completed, with zero scores', async () => {
    const insert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'new-match' }, error: null }),
      }),
    }));
    mockFrom.mockImplementation((table: string) =>
      table === 'seasons'
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
              }),
            }),
          }
        : { insert }
    );

    await createMatch({
      team1Id: 'team-a',
      team2Id: 'team-b',
      date: '2025-06-15T10:00:00',
      location: 'Court A',
      team1_game_wins: 0,
      team2_game_wins: 0,
    });

    // v_pending_matches filters on iscompleted = false, which skips NULL.
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        iscompleted: false,
        team1_score: 0,
        team2_score: 0,
        season_id: 'season-1',
      })
    );
  });

  const newMatchInput = {
    team1Id: 'team-a',
    team2Id: 'team-b',
    date: '2025-06-15T10:00:00',
    location: 'Court A',
    team1_game_wins: 0,
    team2_game_wins: 0,
  };

  /** Route the season lookup to `season`; any other table is a plain insert that must not run. */
  const mockSeasonLookup = (season: { data: { id: string } | null; error: unknown }) => {
    const insert = vi.fn();
    mockFrom.mockImplementation((table: string) =>
      table === 'seasons'
        ? {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve(season) }),
            }),
          }
        : { insert }
    );
    return insert;
  };

  it('throws DatabaseError when the active season cannot be read', async () => {
    const insert = mockSeasonLookup({ data: null, error: postgrestError() });

    await expect(createMatch(newMatchInput)).rejects.toThrow(DatabaseError);
    expect(insert).not.toHaveBeenCalled();
  });

  it('throws BusinessLogicError and writes nothing when there is no active season', async () => {
    const insert = mockSeasonLookup({ data: null, error: null });

    await expect(createMatch(newMatchInput)).rejects.toThrow(BusinessLogicError);
    expect(insert).not.toHaveBeenCalled();
  });
});

// ─── updateMatch ──────────────────────────────────────────────────────────────

describe('updateMatch', () => {
  const MATCH_ID = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates non-result match fields and returns the row', async () => {
    const row = { id: MATCH_ID, date: '2026-01-01', location: 'Court B' };
    mockFrom.mockReturnValue({
      update: (payload: MatchNonResultUpdate) => ({
        eq: (column: string, value: string) => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { ...row, payload, column, value }, error: null }),
          }),
        }),
      }),
    });

    await expect(
      updateMatch(MATCH_ID, { date: '2026-01-01', location: 'Court B' })
    ).resolves.toEqual(
      expect.objectContaining({
        id: MATCH_ID,
        payload: { date: '2026-01-01', location: 'Court B' },
      })
    );
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: null,
                error: {
                  message: 'update failed',
                  code: '23503',
                  details: null,
                  hint: null,
                  name: 'PostgrestError',
                },
              }),
          }),
        }),
      }),
    });

    await expect(updateMatch(MATCH_ID, { location: 'Court B' })).rejects.toThrow(DatabaseError);
  });
});

// ─── reopenMatchResult ────────────────────────────────────────────────────────

describe('reopenMatchResult', () => {
  const MATCH_ID = '44444444-4444-4444-8444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls reopen_live_match so completion and score fields are cleared atomically', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    await expect(reopenMatchResult(MATCH_ID)).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('reopen_live_match', { p_match_id: MATCH_ID });
  });

  it('returns false for idempotent no-op outcomes', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await expect(reopenMatchResult(MATCH_ID)).resolves.toBe(false);
  });

  it('throws DatabaseError on Supabase RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: 'Admin access required',
        code: 'P0001',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    await expect(reopenMatchResult(MATCH_ID)).rejects.toThrow(DatabaseError);
  });
});

// ─── deleteMatchWithStatsReversal ─────────────────────────────────────────────

describe('deleteMatchWithStatsReversal', () => {
  const MATCH_ID = '77777777-7777-4777-8777-777777777777';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes through the atomic function so the stats are reversed with it', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(deleteMatchWithStatsReversal(MATCH_ID)).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith('delete_match_with_stats_reversal', {
      p_match_id: MATCH_ID,
    });
  });

  it('throws DatabaseError when the function fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: postgrestError('rolled back') });

    await expect(deleteMatchWithStatsReversal(MATCH_ID)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchActiveSeasonIdOptional ──────────────────────────────────────────────

describe('fetchActiveSeasonIdOptional', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSeason = (result: { data: { id: string } | null; error: unknown }) =>
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
      }),
    });

  it('returns the active season id', async () => {
    mockSeason({ data: { id: 'season-1' }, error: null });

    await expect(fetchActiveSeasonIdOptional()).resolves.toBe('season-1');
    expect(mockFrom).toHaveBeenCalledWith('seasons');
  });

  it('returns undefined, not an error, when there is no active season', async () => {
    mockSeason({ data: null, error: null });

    await expect(fetchActiveSeasonIdOptional()).resolves.toBeUndefined();
  });

  it('throws DatabaseError when the lookup fails', async () => {
    mockSeason({ data: null, error: postgrestError() });

    await expect(fetchActiveSeasonIdOptional()).rejects.toThrow(DatabaseError);
  });
});

// ─── saveAutoScheduleMatches ──────────────────────────────────────────────────

describe('saveAutoScheduleMatches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const rows = [
    {
      team1_id: 'team-a',
      team2_id: 'team-b',
      date: '2025-06-15T10:00:00',
      location: 'Court A',
      round_number: 1,
      season_id: 'season-1',
      metadata: { autoScheduled: true },
    },
  ];

  it('inserts into matches and returns the saved rows', async () => {
    const insert = vi.fn(() => ({
      select: () => Promise.resolve({ data: [{ id: 'm1', ...rows[0] }], error: null }),
    }));
    mockFrom.mockReturnValue({ insert });

    const saved = await saveAutoScheduleMatches(rows);

    expect(mockFrom).toHaveBeenCalledWith('matches');
    expect(insert).toHaveBeenCalledWith(rows);
    expect(saved).toEqual([{ id: 'm1', ...rows[0] }]);
  });

  it('throws DatabaseError when the insert fails', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => Promise.resolve({ data: null, error: postgrestError() }),
      }),
    });

    await expect(saveAutoScheduleMatches(rows)).rejects.toThrow(DatabaseError);
  });
});

// ─── approveMatchResult ───────────────────────────────────────────────────────

describe('approveMatchResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const approve = () => approveMatchResult('match-1', 'team-a', 'team-b', 2, 1);

  it('sends the winner, the loser and both game counts to the atomic function', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    await expect(approve()).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('approve_match_result', {
      p_match_id: 'match-1',
      p_winner_id: 'team-a',
      p_loser_id: 'team-b',
      p_winner_game_wins: 2,
      p_loser_game_wins: 1,
    });
  });

  it('returns false when the guard matched no row', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await expect(approve()).resolves.toBe(false);
  });

  it('treats a missing answer as false', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(approve()).resolves.toBe(false);
  });

  it('throws DatabaseError when the function fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: postgrestError('Admin access required') });

    await expect(approve()).rejects.toThrow(DatabaseError);
  });
});

// ─── confirmMatchTie ──────────────────────────────────────────────────────────

describe('confirmMatchTie', () => {
  const MATCH_ID = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  });

  /** A PostgrestError shape, the way this file's other write tests build one. */
  const pgError = () => ({
    message: 'update failed',
    code: '42P01',
    details: null,
    hint: null,
    name: 'PostgrestError',
  });

  interface Captured {
    payload?: MatchNonResultUpdate;
    /** The column and value the write was guarded on. */
    guard?: [string, unknown];
  }

  /**
   * Mock the read of current metadata, then the guarded update, capturing both
   * the payload and the predicate. `stamped` is the row the update selects back:
   * null is a write that matched nothing, i.e. a lost race.
   */
  const mockReadThenUpdate = (
    existing: unknown,
    captured: Captured,
    stamped: { id: string } | null = { id: MATCH_ID },
    writeError: unknown = null
  ) => {
    let call = 0;
    mockFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { metadata: existing }, error: null }),
            }),
          }),
        };
      }
      return {
        update: (payload: MatchNonResultUpdate) => {
          captured.payload = payload;
          return {
            eq: () => ({
              is: (column: string, value: unknown) => {
                captured.guard = [column, value];
                return {
                  select: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: writeError ? null : stamped, error: writeError }),
                  }),
                };
              },
            }),
          };
        },
      };
    });
  };

  it('stamps the tie and records who confirmed it', async () => {
    const captured: Captured = {};
    mockReadThenUpdate(null, captured);

    await confirmMatchTie(MATCH_ID);

    const metadata = captured.payload?.metadata as Record<string, unknown>;
    expect(metadata.tie_confirmed_at).toEqual(expect.any(String));
    expect(metadata.tie_confirmed_by).toBe('admin-1');
  });

  it('keeps metadata another feature already wrote', async () => {
    const captured: Captured = {};
    mockReadThenUpdate({ autoScheduled: true }, captured);

    await confirmMatchTie(MATCH_ID);

    const metadata = captured.payload?.metadata as Record<string, unknown>;
    expect(metadata.autoScheduled).toBe(true);
    expect(metadata.tie_confirmed_at).toEqual(expect.any(String));
  });

  // The defect: the write was a plain UPDATE by id, so approve_match_result
  // could decide the match between the read and the write and both would
  // "succeed" — leaving a decisive win wearing a tie stamp, which the league
  // then counted as a win while the admin had been told it was a tie.
  it('only writes while the match still has no winner', async () => {
    const captured: Captured = {};
    mockReadThenUpdate(null, captured);

    await confirmMatchTie(MATCH_ID);

    expect(captured.guard).toEqual(['winner_id', null]);
  });

  it('refuses the tie when a winner was recorded first', async () => {
    const captured: Captured = {};
    // The guarded update matched no row: something gave the match a winner.
    mockReadThenUpdate(null, captured, null);

    await expect(confirmMatchTie(MATCH_ID)).rejects.toThrow(BusinessLogicError);
  });

  it('tells the admin a winner was recorded, not that something went wrong', async () => {
    const captured: Captured = {};
    mockReadThenUpdate(null, captured, null);

    const thrown = await confirmMatchTie(MATCH_ID).catch((error: unknown) => error);

    expect(getUIErrorMessage(thrown, 'Failed to confirm the tie')).toContain(
      'already has a winner'
    );
  });

  it('throws DatabaseError when the write itself fails', async () => {
    const captured: Captured = {};
    mockReadThenUpdate(null, captured, null, pgError());

    await expect(confirmMatchTie(MATCH_ID)).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the match cannot be read', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: {
                message: 'not found',
                code: 'PGRST116',
                details: null,
                hint: null,
                name: 'PostgrestError',
              },
            }),
        }),
      }),
    });

    await expect(confirmMatchTie(MATCH_ID)).rejects.toThrow(DatabaseError);
  });
});

// ─── updateScoreSubmissionStatus ──────────────────────────────────────────────

describe('updateScoreSubmissionStatus', () => {
  const SUBMISSION_ID = '66666666-6666-4666-8666-666666666666';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  });

  /** `result` is what the update selects back: null is a write that matched no row. */
  const mockUpdate = (result: { data: { id: string } | null; error: unknown }) => {
    const payloads: unknown[] = [];
    mockFrom.mockReturnValue({
      update: (payload: unknown) => {
        payloads.push(payload);
        return {
          eq: () => ({
            select: () => ({ maybeSingle: () => Promise.resolve(result) }),
          }),
        };
      },
    });
    return payloads;
  };

  it('stamps the status and who reviewed it', async () => {
    const payloads = mockUpdate({ data: { id: SUBMISSION_ID }, error: null });

    await expect(updateScoreSubmissionStatus(SUBMISSION_ID, 'rejected')).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('score_submissions');
    expect(payloads[0]).toMatchObject({ status: 'rejected', reviewed_by: 'admin-1' });
  });

  // The defect: a write that matched no row (cascade-deleted submission, or RLS
  // hiding it) returned no error, so the admin was told it had worked.
  it('throws BusinessLogicError when no row was updated', async () => {
    mockUpdate({ data: null, error: null });

    await expect(updateScoreSubmissionStatus(SUBMISSION_ID, 'rejected')).rejects.toThrow(
      BusinessLogicError
    );
  });

  it('throws DatabaseError when the write fails', async () => {
    mockUpdate({
      data: null,
      error: {
        message: 'update failed',
        code: '42P01',
        details: null,
        hint: null,
        name: 'PostgrestError',
      },
    });

    await expect(updateScoreSubmissionStatus(SUBMISSION_ID, 'approved')).rejects.toThrow(
      DatabaseError
    );
  });
});

// ─── createScoreSubmission ────────────────────────────────────────────────────

describe('createScoreSubmission', () => {
  const SUBMISSION_MATCH_ID = '55555555-5555-4555-8555-555555555555';
  const payload = {
    match_id: SUBMISSION_MATCH_ID,
    submitter_name: 'Jane',
    submitter_team: 'Bag Boys',
    message: '21-18',
  };

  beforeEach(() => vi.clearAllMocks());

  it('returns true when the function accepts the report', async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    await expect(createScoreSubmission(payload)).resolves.toBe(true);
  });

  it('surfaces the reason the edge function gave', async () => {
    // supabase-js reports a non-2xx with a fixed message and puts the real body
    // on context, so the reason only survives if it is read out.
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 429,
          clone: () => ({
            json: () => Promise.resolve({ error: 'Too many reports. Try again later.' }),
            text: () => Promise.resolve(''),
          }),
        },
      },
    });

    const thrown = await createScoreSubmission(payload).catch((e) => e);
    expect(getUIErrorMessage(thrown, 'Failed to report the score')).toBe(
      'Failed to report the score: Too many reports. Try again later.'
    );
  });

  it('surfaces an error the function returned with a 2xx', async () => {
    // Some paths answer 200 with an error field rather than a status code.
    mockInvoke.mockResolvedValue({
      data: { error: 'That match already has a report.' },
      error: null,
    });

    const thrown = await createScoreSubmission(payload).catch((e) => e);
    expect(thrown).toBeInstanceOf(BusinessLogicError);
    expect(getUIErrorMessage(thrown, 'Failed to report the score')).toBe(
      'Failed to report the score: That match already has a report.'
    );
  });
});
