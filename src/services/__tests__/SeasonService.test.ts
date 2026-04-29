import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessLogicError, DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockFrom, mockRpc, mockAuth } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockAuth: { getUser: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
    auth: mockAuth,
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { SeasonService } from '../SeasonService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed', code = '42P01') => ({
  message: msg,
  code,
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeSeason = (overrides: Record<string, unknown> = {}) => ({
  id: 's-1',
  name: 'Season 1',
  is_active: true,
  is_archived: false,
  start_date: '2026-01-01',
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  champion_team_id: null,
  runner_up_team_id: null,
  confirmation_open: false,
  ...overrides,
});

// ─── fetchSeasons ─────────────────────────────────────────────────────────────

describe('SeasonService.fetchSeasons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns seasons list on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeSeason()], error: null }) }),
    });
    const result = await SeasonService.fetchSeasons();
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('seasons');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchSeasons()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchActiveSeason ────────────────────────────────────────────────────────

describe('SeasonService.fetchActiveSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the active season when exactly one exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: [makeSeason()], error: null }) }),
    });
    const result = await SeasonService.fetchActiveSeason();
    expect(result).toMatchObject({ id: 's-1' });
  });

  it('returns null when no active seasons', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    });
    expect(await SeasonService.fetchActiveSeason()).toBeNull();
  });

  it('throws BusinessLogicError when multiple active seasons found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [makeSeason({ id: 's-1' }), makeSeason({ id: 's-2' })],
            error: null,
          }),
      }),
    });
    await expect(SeasonService.fetchActiveSeason()).rejects.toThrow(BusinessLogicError);
  });

  it('throws DatabaseError on DB error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchActiveSeason()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchConfirmationSeason ──────────────────────────────────────────────────

describe('SeasonService.fetchConfirmationSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  const chain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve(result) }) }) }),
  });

  it('returns season when confirmation is open', async () => {
    mockFrom.mockReturnValue(chain({ data: makeSeason({ confirmation_open: true }), error: null }));
    const result = await SeasonService.fetchConfirmationSeason();
    expect(result).toMatchObject({ confirmation_open: true });
  });

  it('returns null when PGRST116 (no rows)', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError('no rows', 'PGRST116') }));
    expect(await SeasonService.fetchConfirmationSeason()).toBeNull();
  });

  it('throws DatabaseError on other errors', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(SeasonService.fetchConfirmationSeason()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamParticipation ───────────────────────────────────────────────────

describe('SeasonService.fetchTeamParticipation', () => {
  beforeEach(() => vi.clearAllMocks());

  const chain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }) }),
  });

  it('returns participation record when found', async () => {
    const row = {
      id: 'p-1',
      season_id: 's-1',
      team_id: 't-1',
      status: 'PLAYING' as const,
      submitted_by: null,
      submitted_by_name: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockFrom.mockReturnValue(chain({ data: row, error: null }));
    const result = await SeasonService.fetchTeamParticipation('s-1', 't-1');
    expect(result).toMatchObject({ status: 'PLAYING' });
  });

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await SeasonService.fetchTeamParticipation('s-1', 't-1')).toBeNull();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(SeasonService.fetchTeamParticipation('s-1', 't-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchSeasonParticipations ────────────────────────────────────────────────

describe('SeasonService.fetchSeasonParticipations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns participations array on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ data: [{ id: 'p-1', status: 'PLAYING' }], error: null }),
      }),
    });
    const result = await SeasonService.fetchSeasonParticipations('s-1');
    expect(result).toHaveLength(1);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchSeasonParticipations('s-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── submitParticipation ──────────────────────────────────────────────────────

describe('SeasonService.submitParticipation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns upserted record on success', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } });
    mockFrom.mockReturnValue({
      upsert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'p-1', status: 'PLAYING' }, error: null }),
        }),
      }),
    });
    const result = await SeasonService.submitParticipation({
      seasonId: 's-1',
      teamId: 't-1',
      status: 'PLAYING',
    });
    expect(result).toMatchObject({ status: 'PLAYING' });
  });

  it('throws DatabaseError on upsert error', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } });
    mockFrom.mockReturnValue({
      upsert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(
      SeasonService.submitParticipation({ seasonId: 's-1', teamId: 't-1', status: 'PLAYING' })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchSeasonStatIds ───────────────────────────────────────────────────────

describe('SeasonService.fetchSeasonStatIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns unique season ids', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () =>
          Promise.resolve({
            data: [{ season_id: 's-1' }, { season_id: 's-1' }, { season_id: 's-2' }],
            error: null,
          }),
      }),
    });
    const result = await SeasonService.fetchSeasonStatIds();
    expect(result).toHaveLength(2);
    expect(result).toContain('s-1');
    expect(result).toContain('s-2');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchSeasonStatIds()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchStatsBySeason ───────────────────────────────────────────────────────

describe('SeasonService.fetchStatsBySeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns transformed stats with team_name', async () => {
    const row = {
      team_id: 't-1',
      season_id: 's-1',
      match_wins: 5,
      match_losses: 1,
      game_wins: 10,
      game_losses: 3,
      power_score: 80,
      sos: 0.6,
      recorded_at: null,
      teams: { name: 'Eagles' },
    };
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: [row], error: null }) }),
      }),
    });
    const result = await SeasonService.fetchStatsBySeason('s-1');
    expect(result[0].team_name).toBe('Eagles');
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(SeasonService.fetchStatsBySeason('s-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchHistoricalSeasons ───────────────────────────────────────────────────

describe('SeasonService.fetchHistoricalSeasons', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns seasons on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeSeason()], error: null }) }),
    });
    const result = await SeasonService.fetchHistoricalSeasons();
    expect(result).toHaveLength(1);
  });

  it('returns empty array when null', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await SeasonService.fetchHistoricalSeasons()).toEqual([]);
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchHistoricalSeasons()).rejects.toThrow(DatabaseError);
  });
});

// ─── createSeason ─────────────────────────────────────────────────────────────

describe('SeasonService.createSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns new season on success', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: makeSeason(), error: null }) }),
      }),
    });
    const result = await SeasonService.createSeason({ name: 'Season 1', start_date: '2026-01-01' });
    expect(result).toMatchObject({ id: 's-1' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(
      SeasonService.createSeason({ name: 'Season 1', start_date: '2026-01-01' })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── updateSeason ─────────────────────────────────────────────────────────────

describe('SeasonService.updateSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns updated season on success', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: makeSeason({ name: 'Updated' }), error: null }),
          }),
        }),
      }),
    });
    const result = await SeasonService.updateSeason('s-1', {
      name: 'Updated',
      start_date: '2026-01-01',
    });
    expect(result).toMatchObject({ name: 'Updated' });
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: null, error: pgError() }) }),
        }),
      }),
    });
    await expect(
      SeasonService.updateSeason('s-1', { name: 'X', start_date: '2026-01-01' })
    ).rejects.toThrow(DatabaseError);
  });
});

// ─── activateSeason ───────────────────────────────────────────────────────────

describe('SeasonService.activateSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns season data on success', async () => {
    mockRpc.mockResolvedValue({ data: makeSeason(), error: null });
    const result = await SeasonService.activateSeason('s-1');
    expect(mockRpc).toHaveBeenCalledWith('activate_season', { season_id: 's-1' });
    expect(result).toMatchObject({ id: 's-1' });
  });

  it('throws DatabaseError on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(SeasonService.activateSeason('s-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── archiveSeason ────────────────────────────────────────────────────────────

describe('SeasonService.archiveSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves on success', async () => {
    mockRpc.mockResolvedValue({ data: makeSeason(), error: null });
    const result = await SeasonService.archiveSeason('s-1');
    expect(mockRpc).toHaveBeenCalledWith(
      'archive_season',
      expect.objectContaining({ p_season_id: 's-1' })
    );
    expect(result).not.toBeNull();
  });

  it('throws DatabaseError on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(SeasonService.archiveSeason('s-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── partialArchive / playoffs RPCs ───────────────────────────────────────────

describe('SeasonService.activateSeasonWithPartialArchive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls the RPC with p_new_season_id and returns the season', async () => {
    mockRpc.mockResolvedValue({ data: makeSeason(), error: null });
    const result = await SeasonService.activateSeasonWithPartialArchive('s-1');
    expect(mockRpc).toHaveBeenCalledWith('activate_season_with_partial_archive', {
      p_new_season_id: 's-1',
    });
    expect(result).toMatchObject({ id: 's-1' });
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(SeasonService.activateSeasonWithPartialArchive('s-1')).rejects.toThrow(
      DatabaseError
    );
  });
});

describe('SeasonService.finalizePlayoffs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes all four params to the RPC mapped to p_* keys', async () => {
    mockRpc.mockResolvedValue({ data: makeSeason({ is_archived: true }), error: null });
    const result = await SeasonService.finalizePlayoffs({
      seasonId: 's-1',
      championTeamId: 't-c',
      runnerUpTeamId: 't-r',
      thirdPlaceTeamId: 't-3',
    });
    expect(mockRpc).toHaveBeenCalledWith('finalize_playoffs', {
      p_season_id: 's-1',
      p_champion_team_id: 't-c',
      p_runner_up_team_id: 't-r',
      p_third_place_team_id: 't-3',
    });
    expect(result).toMatchObject({ is_archived: true });
  });

  it('coalesces missing optional team ids to null', async () => {
    mockRpc.mockResolvedValue({ data: makeSeason(), error: null });
    await SeasonService.finalizePlayoffs({ seasonId: 's-1' });
    expect(mockRpc).toHaveBeenCalledWith('finalize_playoffs', {
      p_season_id: 's-1',
      p_champion_team_id: null,
      p_runner_up_team_id: null,
      p_third_place_team_id: null,
    });
  });

  it('throws DatabaseError on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: pgError() });
    await expect(SeasonService.finalizePlayoffs({ seasonId: 's-1' })).rejects.toThrow(
      DatabaseError
    );
  });
});

describe('SeasonService.fetchPlayoffActiveSeason', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the playoffs-active season when exactly one exists', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => Promise.resolve({ data: [makeSeason({ playoffs_active: true })], error: null }),
      }),
    });
    const result = await SeasonService.fetchPlayoffActiveSeason();
    expect(result).toMatchObject({ id: 's-1' });
  });

  it('returns null when none', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
    });
    expect(await SeasonService.fetchPlayoffActiveSeason()).toBeNull();
  });

  it('throws BusinessLogicError when more than one playoffs-active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: [makeSeason({ id: 's-1' }), makeSeason({ id: 's-2' })],
            error: null,
          }),
      }),
    });
    await expect(SeasonService.fetchPlayoffActiveSeason()).rejects.toThrow(BusinessLogicError);
  });

  it('throws DatabaseError on DB error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ eq: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(SeasonService.fetchPlayoffActiveSeason()).rejects.toThrow(DatabaseError);
  });
});
