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

// ─── localStorage mock ───────────────────────────────────────────────────────

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

vi.stubGlobal('localStorage', localStorageMock);

// Import after mocks
import {
  loadRankingsFromDatabase,
  migrateLocalStorageToDatabase,
  saveRankingsToDatabase,
} from '../RankingPersistenceService';
import type { Ranking } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRanking = (overrides: Partial<Ranking> = {}): Ranking =>
  ({
    teamId: 't1',
    ...overrides,
  }) as Ranking;

const pgError = (message = 'query failed', code = '42P01') => ({
  message,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

/**
 * Returns a chain mock for querying the `seasons` table:
 *   .from('seasons').select('id').eq('is_active', true).maybeSingle()
 */
const seasonsSelectChain = (result: { data: unknown; error: unknown | null }) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve(result),
    }),
  }),
});

/**
 * Returns a chain mock for `ranking_snapshots` upsert:
 *   .from('ranking_snapshots').upsert(rows, opts)
 */
const upsertChain = (result: { error: unknown | null }) => ({
  upsert: () => Promise.resolve(result),
});

/**
 * Returns a chain mock for `ranking_snapshots` load:
 *   .from('ranking_snapshots').select('team_id, rank_position').eq('season_id', id)
 */
const loadSnapshotsChain = (result: { data: unknown; error: unknown | null }) => ({
  select: () => ({
    eq: () => Promise.resolve(result),
  }),
});

// ─── saveRankingsToDatabase ──────────────────────────────────────────────────

describe('saveRankingsToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('early-returns without touching supabase when rankings is empty', async () => {
    await expect(saveRankingsToDatabase([])).resolves.toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('upserts snapshots successfully when a seasonId is provided', async () => {
    mockFrom.mockReturnValue(upsertChain({ error: null }));

    await expect(
      saveRankingsToDatabase([makeRanking({ teamId: 't1' })], 'season-1')
    ).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('ranking_snapshots');
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('resolves current season id via getCurrentSeasonId when seasonId is omitted', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: { id: 'active-season' }, error: null });
      }
      if (table === 'ranking_snapshots') {
        return upsertChain({ error: null });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(saveRankingsToDatabase([makeRanking()])).resolves.toBeUndefined();

    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockFrom).toHaveBeenCalledWith('ranking_snapshots');
  });

  it('throws NotFoundError when seasonId is omitted and no active season exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: null, error: null });
      }
      return upsertChain({ error: null });
    });

    await expect(saveRankingsToDatabase([makeRanking()])).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError when seasonId is omitted and the seasons query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: null, error: pgError('seasons fetch failed') });
      }
      return upsertChain({ error: null });
    });

    await expect(saveRankingsToDatabase([makeRanking()])).rejects.toThrow(DatabaseError);
  });

  it('throws DatabaseError when the snapshot upsert fails', async () => {
    mockFrom.mockReturnValue(upsertChain({ error: pgError('upsert failed', '23505') }));

    await expect(saveRankingsToDatabase([makeRanking()], 'season-1')).rejects.toThrow(
      DatabaseError
    );
  });
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
    mockFrom.mockReturnValue(
      loadSnapshotsChain({ data: null, error: pgError('select failed') })
    );

    await expect(loadRankingsFromDatabase('season-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── migrateLocalStorageToDatabase ───────────────────────────────────────────

describe('migrateLocalStorageToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no-ops when localStorage has no previousRankings key', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    await expect(migrateLocalStorageToDatabase()).resolves.toBeUndefined();

    expect(mockFrom).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it('throws DatabaseError and does not clear localStorage when the migration upsert fails', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ t1: 1, t2: 2 }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return seasonsSelectChain({ data: { id: 'active-season' }, error: null });
      }
      if (table === 'ranking_snapshots') {
        return upsertChain({ error: pgError('migrate upsert failed', '23505') });
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    await expect(migrateLocalStorageToDatabase()).rejects.toThrow(DatabaseError);

    // Proves cleanup only runs after successful upsert
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});
