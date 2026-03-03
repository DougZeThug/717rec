import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
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
  fetchActiveSeason,
  batchCreateMatches,
  updateMatchScore,
  MatchCreateData,
  MatchUpdateData,
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

const makeUpdateData = (overrides: Partial<MatchUpdateData> = {}): MatchUpdateData => ({
  team1_score: 3,
  team2_score: 1,
  iscompleted: true,
  winner_id: 'team-a',
  loser_id: 'team-b',
  ...overrides,
});

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

// ─── updateMatchScore ─────────────────────────────────────────────────────────

describe('updateMatchScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });

    await expect(updateMatchScore('match-1', makeUpdateData())).resolves.toBeUndefined();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () =>
          Promise.resolve({
            error: {
              message: 'update failed',
              code: '23503',
              details: null,
              hint: null,
              name: 'PostgrestError',
            },
          }),
      }),
    });

    await expect(updateMatchScore('match-1', makeUpdateData())).rejects.toThrow(DatabaseError);
  });

  it('updates the matches table', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });

    await updateMatchScore('match-1', makeUpdateData());
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });
});
