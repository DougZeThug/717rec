import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError } from '@/types/errors';

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
import { fetchTeamMatchesData, fetchTeamsByIds, fetchTeamsMap } from '../MatchTeamLookupService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pgError = (msg = 'query failed') => ({
  message: msg,
  code: '42P01',
  details: null,
  hint: null,
  name: 'PostgrestError',
});

const makeTeam = (id = 'team-1') => ({
  team_id: id,
  name: 'Eagles',
  image_url: null,
  logo_url: null,
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
});

// ─── fetchTeamMatchesData ─────────────────────────────────────────────────────

describe('fetchTeamMatchesData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns matches for team in active season', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
            }),
          }),
        };
      }
      // matches: .select().eq().or().order()
      return {
        select: () => ({
          eq: () => ({
            or: () => ({ order: () => Promise.resolve({ data: [{ id: 'm-1' }], error: null }) }),
          }),
        }),
      };
    });

    const result = await fetchTeamMatchesData('team-1');
    expect(result).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('seasons');
    expect(mockFrom).toHaveBeenCalledWith('matches');
  });

  it('returns null when no active season', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
    });
    const result = await fetchTeamMatchesData('team-1');
    expect(result).toBeNull();
  });

  it('returns empty array when no matches', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: { id: 's-1' }, error: null }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ or: () => ({ order: () => Promise.resolve({ data: null, error: null }) }) }),
        }),
      };
    });
    const result = await fetchTeamMatchesData('team-1');
    expect(result).toEqual([]);
  });

  it('throws DatabaseError when matches query fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: { id: 's-1' }, error: null }) }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            or: () => ({ order: () => Promise.resolve({ data: null, error: pgError() }) }),
          }),
        }),
      };
    });
    await expect(fetchTeamMatchesData('team-1')).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamsByIds ──────────────────────────────────────────────────────────

describe('fetchTeamsByIds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns teams matching given IDs', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        in: () => Promise.resolve({ data: [makeTeam('t1'), makeTeam('t2')], error: null }),
      }),
    });
    const result = await fetchTeamsByIds(['t1', 't2']);
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it('returns empty array without hitting Supabase when teamIds is empty', async () => {
    const result = await fetchTeamsByIds([]);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: null }) }),
    });
    expect(await fetchTeamsByIds(['t1'])).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ in: () => Promise.resolve({ data: null, error: pgError() }) }),
    });
    await expect(fetchTeamsByIds(['t1'])).rejects.toThrow(DatabaseError);
  });
});

// ─── fetchTeamsMap ────────────────────────────────────────────────────────────

describe('fetchTeamsMap', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns all teams', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ data: [makeTeam('t1'), makeTeam('t2')], error: null }),
    });
    const result = await fetchTeamsMap();
    expect(result).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledWith('v_team_details');
  });

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ data: null, error: null }),
    });
    expect(await fetchTeamsMap()).toEqual([]);
  });

  it('throws DatabaseError on Supabase error', async () => {
    mockFrom.mockReturnValue({
      select: () => Promise.resolve({ data: null, error: pgError() }),
    });
    await expect(fetchTeamsMap()).rejects.toThrow(DatabaseError);
  });
});
