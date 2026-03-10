import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseError, NotFoundError } from '@/types/errors';

// ─── Supabase mock ────────────────────────────────────────────────────────────

// We need to capture per-call chain state so we use factory fns per table call.
// The mock tracks calls via mockFrom for assertions.
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock('@/utils/logger', () => ({
  teamLog: vi.fn(),
  errorLog: vi.fn(),
  matchLog: vi.fn(),
  authLog: vi.fn(),
  warnLog: vi.fn(),
  scoreLog: vi.fn(),
  dbLog: vi.fn(),
}));

// Import after mocks
import { updateTeamApi } from '../TeamUpdateService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTeamData = (overrides = {}) => ({
  name: 'Updated Team',
  logoUrl: 'https://img.example.com/logo.png',
  imageUrl: 'https://img.example.com/image.png',
  players: ['Alice', 'Bob'],
  wins: 3,
  losses: 1,
  game_wins: 6,
  game_losses: 2,
  division_id: 'div-1',
  division: 'div-1',
  divisionName: 'Division A',
  sos: null,
  power_score: null,
  win_percentage: 0.75,
  game_win_percentage: 0.75,
  close_match_losses: 0,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Set up a "happy path" mock where:
 * - team exists check passes
 * - division exists check passes
 * - update succeeds
 * - active season fetch succeeds
 * - season stats update succeeds
 */
const setupFullSuccess = () => {
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    callCount++;

    // 1st call: check team exists (teams.select.eq.single)
    if (table === 'teams' && callCount === 1) {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'team-abc' }, error: null }),
          }),
        }),
      };
    }

    // 2nd call: check division exists (divisions.select.eq.single)
    if (table === 'divisions') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { id: 'div-1', name: 'Division A' }, error: null }),
          }),
        }),
      };
    }

    // 3rd call: update team (teams.update.eq.select.single)
    if (table === 'teams' && callCount === 3) {
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'team-abc',
                    name: 'Updated Team',
                    logo_url: null,
                    image_url: 'https://img.example.com/image.png',
                    players: ['Alice', 'Bob'],
                    division_id: 'div-1',
                    created_at: '2025-01-01T00:00:00Z',
                  },
                  error: null,
                }),
            }),
          }),
        }),
      };
    }

    // 4th call: fetch active season (seasons.select.eq.single)
    if (table === 'seasons') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
          }),
        }),
      };
    }

    // 5th call: update team_season_stats
    if (table === 'team_season_stats') {
      return {
        update: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }

    return {};
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('updateTeamApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
  });

  it('returns updated team data on success', async () => {
    setupFullSuccess();
    const result = await updateTeamApi('team-abc', makeTeamData());

    expect(result.id).toBe('team-abc');
    expect(result.name).toBe('Updated Team');
    expect(result.wins).toBe(3);
    expect(result.losses).toBe(1);
  });

  it('throws NotFoundError when team does not exist', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }));

    await expect(updateTeamApi('missing-id', makeTeamData())).rejects.toThrow(NotFoundError);
  });

  it('throws DatabaseError when team existence check fails', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: null,
              error: {
                message: 'connection error',
                code: '08000',
                details: null,
                hint: null,
                name: 'PostgrestError',
              },
            }),
        }),
      }),
    }));

    await expect(updateTeamApi('team-abc', makeTeamData())).rejects.toThrow(DatabaseError);
  });

  it('throws NotFoundError when division does not exist', async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;

      // Check team exists → passes
      if (table === 'teams' && callCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'team-abc' }, error: null }),
            }),
          }),
        };
      }

      // Check division → not found
      if (table === 'divisions') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }

      return {};
    });

    await expect(updateTeamApi('team-abc', makeTeamData())).rejects.toThrow(NotFoundError);
  });

  it('skips division check when division_id is null', async () => {
    let divisionChecked = false;
    let callCount = 0;

    mockFrom.mockImplementation((table: string) => {
      callCount++;

      if (table === 'teams' && callCount === 1) {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'team-abc' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'divisions') {
        divisionChecked = true;
        return {};
      }

      // Update team
      if (table === 'teams' && callCount === 2) {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'team-abc',
                      name: 'Updated Team',
                      logo_url: null,
                      image_url: null,
                      players: [],
                      division_id: null,
                      created_at: '2025-01-01T00:00:00Z',
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      // Active season
      if (table === 'seasons') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'season-1' }, error: null }),
            }),
          }),
        };
      }

      // Season stats update
      if (table === 'team_season_stats') {
        return {
          update: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      }

      return {};
    });

    await updateTeamApi('team-abc', makeTeamData({ division_id: null }));
    expect(divisionChecked).toBe(false);
  });

  it('uses wins/losses from teamData since db does not return them', async () => {
    setupFullSuccess();
    const result = await updateTeamApi('team-abc', makeTeamData({ wins: 10, losses: 2 }));
    expect(result.wins).toBe(10);
    expect(result.losses).toBe(2);
  });

  it('defaults wins and losses to 0 when teamData has no wins/losses', async () => {
    setupFullSuccess();
    const result = await updateTeamApi(
      'team-abc',
      makeTeamData({ wins: undefined, losses: undefined })
    );
    expect(result.wins).toBe(0);
    expect(result.losses).toBe(0);
  });
});
