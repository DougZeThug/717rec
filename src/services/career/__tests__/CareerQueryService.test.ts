import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(), warnLog: vi.fn(), dbLog: vi.fn(),
}));

// Import after mocks
import { CareerQueryService } from '../CareerQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg, code: '42P01', details: null, hint: null, name: 'PostgrestError',
});

// ─── fetchTeamSeasonPowerScores ───────────────────────────────────────────────

describe('CareerQueryService.fetchTeamSeasonPowerScores', () => {
  beforeEach(() => vi.clearAllMocks());

  // .select().eq().not()
  const chain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ eq: () => ({ not: () => Promise.resolve(result) }) }),
  });

  it('returns power score rows on success', async () => {
    const rows = [{ power_score: 75, match_wins: 4, match_losses: 1, season_id: 's-1' }];
    mockFrom.mockReturnValue(chain({ data: rows, error: null }));
    const result = await CareerQueryService.fetchTeamSeasonPowerScores('team-1');
    expect(result).toHaveLength(1);
    expect(result[0].power_score).toBe(75);
    expect(mockFrom).toHaveBeenCalledWith('team_season_stats');
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await CareerQueryService.fetchTeamSeasonPowerScores('team-1')).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(CareerQueryService.fetchTeamSeasonPowerScores('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchCurrentTeamPower ────────────────────────────────────────────────────

describe('CareerQueryService.fetchCurrentTeamPower', () => {
  beforeEach(() => vi.clearAllMocks());

  const chain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
  });

  it('returns team power data when found', async () => {
    const row = { power_score: 80, wins: 5, losses: 1 };
    mockFrom.mockReturnValue(chain({ data: row, error: null }));
    const result = await CareerQueryService.fetchCurrentTeamPower('team-1');
    expect(result?.power_score).toBe(80);
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await CareerQueryService.fetchCurrentTeamPower('team-1')).toBeNull();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(CareerQueryService.fetchCurrentTeamPower('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchActiveSeasonId ──────────────────────────────────────────────────────

describe('CareerQueryService.fetchActiveSeasonId', () => {
  beforeEach(() => vi.clearAllMocks());

  const chain = (result: { data: unknown; error: unknown }) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(result) }) }),
  });

  it('returns season id when active season found', async () => {
    mockFrom.mockReturnValue(chain({ data: { id: 'season-1' }, error: null }));
    expect(await CareerQueryService.fetchActiveSeasonId()).toBe('season-1');
    expect(mockFrom).toHaveBeenCalledWith('seasons');
  });

  it('returns null when no active season', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: null }));
    expect(await CareerQueryService.fetchActiveSeasonId()).toBeNull();
  });

  it('throws DatabaseError on error', async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: pgError() }));
    await expect(CareerQueryService.fetchActiveSeasonId()).rejects.toThrow(DatabaseError);
  });
});
