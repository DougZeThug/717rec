import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { loadRankingsFromDatabase } from '../RankingPersistenceService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (message = 'query failed', code = '42P01') => ({
  message,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/**
 * Returns a chain mock for 'ranking_snapshots' load:
 *   .from('ranking_snapshots').select('team_id, rank_position').eq('season_id', id)
 */
const loadSnapshotsChain = (result: { data: unknown; error: unknown | null }) => ({
  select: () => ({
    eq: () => Promise.resolve(result),
  }),
});

/**
 * Returns a chain mock for querying the 'seasons' table:
 *   .from('seasons').select('id').eq('is_active', true).maybeSingle()
 */
const seasonsSelectChain = (result: { data: unknown; error: unknown | null }) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve(result),
    }),
  }),
});

// ─── loadRankingsFromDatabase ────────────────────────────────────────────────

describe('loadRankingsFromDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a rank map when given a seasonId', async () => {
    mockFrom.mockReturnValue(
      loadSnapshotsChain({
        data: [
          { team_id: 't1', rank_position: 1 },
          { team_id: 't2', rank_position: 2 },
        ],
        error: null,
      })
    );

    const result = await loadRankingsFromDatabase('season-1');

    expect(result).toEqual({ t1: 1, t2: 2 });
  });

  it('returns empty object when no rows exist', async () => {
    mockFrom.mockReturnValue(loadSnapshotsChain({ data: [], error: null }));

    const result = await loadRankingsFromDatabase('season-1');

    expect(result).toEqual({});
  });

  it('throws DatabaseError when the snapshots query fails', async () => {
    mockFrom.mockReturnValue(loadSnapshotsChain({ data: null, error: pgError('select failed') }));

    await expect(loadRankingsFromDatabase('season-1')).rejects.toThrow(DatabaseError);
  });

  it('resolves the active season id via getCurrentSeasonId when seasonId is omitted', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: { id: 'active-season' }, error: null });
      }
      if (table === 'ranking_snapshots') {
        return loadSnapshotsChain({
          data: [
            { team_id: 't1', rank_position: 1 },
            { team_id: 't2', rank_position: 2 },
          ],
          error: null,
        });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await loadRankingsFromDatabase();

    expect(result).toEqual({ t1: 1, t2: 2 });
    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockFrom).toHaveBeenCalledWith('ranking_snapshots');
  });

  it('throws NotFoundError when seasonId is omitted and no active season exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: null, error: null });
      }
      return loadSnapshotsChain({ data: [], error: null });
    });

    await expect(loadRankingsFromDatabase()).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError when seasonId is omitted and the seasons query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: null, error: pgError('seasons fetch failed') });
      }
      return loadSnapshotsChain({ data: [], error: null });
    });

    await expect(loadRankingsFromDatabase()).rejects.toThrow(DatabaseError);
  });
});
