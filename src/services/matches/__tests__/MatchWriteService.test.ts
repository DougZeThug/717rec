import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';
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
import { BusinessLogicError } from '@/types/errors';

import {
  batchCreateMatches,
  confirmMatchTie,
  createScoreSubmission,
  fetchActiveSeason,
  MatchCreateData,
  MatchNonResultUpdate,
  reopenMatchResult,
  updateMatch,
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

// ─── confirmMatchTie ──────────────────────────────────────────────────────────

describe('confirmMatchTie', () => {
  const MATCH_ID = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } });
  });

  /** Mock the read of current metadata, then the update, capturing the payload. */
  const mockReadThenUpdate = (existing: unknown, captured: { payload?: MatchNonResultUpdate }) => {
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
              select: () => ({
                single: () => Promise.resolve({ data: { id: MATCH_ID }, error: null }),
              }),
            }),
          };
        },
      };
    });
  };

  it('stamps the tie and records who confirmed it', async () => {
    const captured: { payload?: MatchNonResultUpdate } = {};
    mockReadThenUpdate(null, captured);

    await confirmMatchTie(MATCH_ID);

    const metadata = captured.payload?.metadata as Record<string, unknown>;
    expect(metadata.tie_confirmed_at).toEqual(expect.any(String));
    expect(metadata.tie_confirmed_by).toBe('admin-1');
  });

  it('keeps metadata another feature already wrote', async () => {
    const captured: { payload?: MatchNonResultUpdate } = {};
    mockReadThenUpdate({ autoScheduled: true }, captured);

    await confirmMatchTie(MATCH_ID);

    const metadata = captured.payload?.metadata as Record<string, unknown>;
    expect(metadata.autoScheduled).toBe(true);
    expect(metadata.tie_confirmed_at).toEqual(expect.any(String));
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
