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
  teamLog: vi.fn(),
}));

vi.mock('@/utils/teamTransformer', () => ({
  transformTeamRow: (row: Record<string, unknown>) => ({
    id: row.team_id,
    name: row.name,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    game_wins: row.game_wins ?? 0,
    game_losses: row.game_losses ?? 0,
    logoUrl: row.image_url || row.logo_url,
    imageUrl: row.image_url || row.logo_url,
    division: row.division_id,
    divisionName: row.divisionname,
    power_score: row.power_score,
    sos: row.sos,
    win_percentage: row.win_percentage ?? 0,
    game_win_percentage: row.game_win_percentage ?? 0,
  }),
}));

// Import after mocks
import {
  fetchAvailableTeams,
  fetchTeamDetails,
  fetchTeamForStats,
  fetchTeamsFromApi,
  fetchTeamsWithOptions,
} from '../TeamQueryService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeTeamRow = (overrides: Record<string, unknown> = {}) => ({
  team_id: 'team-1',
  name: 'Eagles',
  logo_url: null,
  image_url: null,
  players: [],
  wins: 0,
  losses: 0,
  game_wins: 0,
  game_losses: 0,
  created_at: '2026-01-01T00:00:00Z',
  division_id: 'd1',
  divisionname: 'Div A',
  sos: null,
  power_score: null,
  win_percentage: 0,
  game_win_percentage: 0,
  close_match_losses: null,
  seed: null,
  ...overrides,
});

// ─── fetchTeamsFromApi ────────────────────────────────────────────────────────

describe('fetchTeamsFromApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns transformed teams on success', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeTeamRow()], error: null }) }),
    });
    const result = await fetchTeamsFromApi();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Eagles');
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchTeamsFromApi()).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchTeamsFromApi()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamsWithOptions ────────────────────────────────────────────────────

describe('fetchTeamsWithOptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all teams when no options', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [makeTeamRow()], error: null }) }),
    });
    const result = await fetchTeamsWithOptions();
    expect(result).toHaveLength(1);
  });

  it('filters by divisionId when provided', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        order: () => ({ eq: () => Promise.resolve({ data: [makeTeamRow()], error: null }) }),
      }),
    });
    const result = await fetchTeamsWithOptions({ divisionId: 'd1' });
    expect(result).toHaveLength(1);
  });

  it('excludes hidden teams by default', async () => {
    const rows = [makeTeamRow(), makeTeamRow({ team_id: 'h1', divisionname: 'Hidden' })];
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
    });
    const result = await fetchTeamsWithOptions();
    expect(result).toHaveLength(1);
    expect(result.every((t) => t.divisionName !== 'Hidden')).toBe(true);
  });

  it('includes hidden teams when includeHidden=true', async () => {
    const rows = [makeTeamRow(), makeTeamRow({ team_id: 'h1', divisionname: 'Hidden' })];
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }),
    });
    const result = await fetchTeamsWithOptions({ includeHidden: true });
    expect(result).toHaveLength(2);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchTeamsWithOptions()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamDetails ─────────────────────────────────────────────────────────

describe('fetchTeamDetails', () => {
  // Valid v4 UUID — the function now guards its teamId input.
  const TEAM_ID = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => vi.clearAllMocks());

  it('returns team when found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: makeTeamRow(), error: null }) }),
      }),
    });
    const result = await fetchTeamDetails(TEAM_ID);
    expect(result.name).toBe('Eagles');
  });

  it('throws NotFoundError when team not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    await expect(fetchTeamDetails(TEAM_ID)).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchTeamDetails(TEAM_ID)).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchAvailableTeams ──────────────────────────────────────────────────────

describe('fetchAvailableTeams', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns mapped teams on success', async () => {
    const row = {
      id: 'team-1',
      name: 'Eagles',
      logo_url: null,
      image_url: 'img.png',
      division_id: 'd1',
      wins: 2,
      losses: 1,
    };
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: [row], error: null }) }),
    });
    const result = await fetchAvailableTeams();
    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toBe('img.png');
    expect(mockFrom).toHaveBeenCalledWith('teams');
  });

  it('returns empty array when no rows', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchAvailableTeams()).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchAvailableTeams()).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamForStats ────────────────────────────────────────────────────────

describe('fetchTeamForStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns team data when found', async () => {
    const row = {
      id: 'team-1',
      name: 'Eagles',
      wins: 4,
      losses: 2,
      game_wins: 8,
      game_losses: 5,
      divisions: { name: 'Div A' },
    };
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
      }),
    });
    const result = await fetchTeamForStats('team-1');
    expect(result?.name).toBe('Eagles');
  });

  it('returns null when team not found', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    expect(await fetchTeamForStats('missing')).toBeNull();
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: pgError() }) }),
      }),
    });
    await expect(fetchTeamForStats('team-1')).rejects.toThrow(DatabaseError);
  });
});
