import type { ToolContext } from '@lovable.dev/mcp-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import getMyTeam from '../get-my-team';

const { mockFrom, mockSupabase } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom, mockSupabase: { from: mockFrom } };
});

vi.mock('../_supabase', () => ({
  userClient: () => mockSupabase,
  getActiveSeasonId: async (supabase: typeof mockSupabase) => {
    const { data, error } = await supabase.from('seasons').select('id').eq('is_active', true).maybeSingle();
    return { data: data?.id ?? null, error: error?.message ?? null };
  },
  errorResult: (message: string) => ({
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }),
  textResult: (payload: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: { data: payload } as Record<string, unknown>,
  }),
}));

type Scenario = {
  season?: { id: string } | null;
  seasonError?: string | null;
  membership?: { team_id: string; teams: Record<string, unknown> } | null;
  membershipError?: string | null;
  roster?: Record<string, unknown>[] | null;
  rosterError?: string | null;
  seasonStats?: Record<string, unknown> | null;
  seasonStatsError?: { message: string; code?: string } | null;
};

const baseScenario: Scenario = {
  season: { id: 'season-1' },
  membership: { team_id: 'team-1', teams: { name: 'Eagles' } },
  roster: [{ id: 'player-1', display_name: 'Alice', profile_id: 'profile-1' }],
  seasonStats: { power_score: 72, sos: 0.5, division_name: 'Recreational', match_wins: 2, match_losses: 0, game_wins: 4, game_losses: 1 },
};

const buildMockFrom = (scenario: Scenario) => (table: string) => {
  const merged = { ...baseScenario, ...scenario };
  if (table === 'seasons') {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: merged.season ?? null, error: merged.seasonError ?? null }),
        }),
      }),
    };
  }
  if (table === 'team_memberships') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: merged.membership ?? null, error: merged.membershipError ?? null }),
          }),
        }),
      }),
    };
  }
  if (table === 'team_players') {
    return {
      select: () => ({
        eq: () => Promise.resolve({ data: merged.roster ?? [], error: merged.rosterError ?? null }),
      }),
    };
  }
  if (table === 'team_season_stats') {
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: merged.seasonStats ?? null, error: merged.seasonStatsError ?? null }),
          }),
        }),
      }),
    };
  }
  throw new Error(`Unexpected table: ${table}`);
};

const createContext = (): ToolContext =>
  ({
    isAuthenticated: () => true,
    getUserId: () => 'user-1',
    getToken: () => 'token',
  }) as unknown as ToolContext;

const textOf = (result: unknown) => ((result as { content?: { text?: string }[] }).content?.[0] as { text?: string } | undefined)?.text ?? '';

describe('get_my_team', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('surfaces team_season_stats infrastructure errors as tool errors', async () => {
    mockFrom.mockImplementation(buildMockFrom({ seasonStatsError: { message: 'ETIMEDOUT', code: 'ETIMEDOUT' } }));

    const result = await getMyTeam.handler({}, createContext());

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('ETIMEDOUT');
  });

  it('returns null season stats when no stats row exists', async () => {
    mockFrom.mockImplementation(buildMockFrom({ seasonStats: null, seasonStatsError: null }));

    const result = await getMyTeam.handler({}, createContext());

    expect(result.isError).toBe(false);
    const payload = JSON.parse(textOf(result));
    expect(payload.season_stats).toBeNull();
  });

  it('returns season stats when a row exists', async () => {
    mockFrom.mockImplementation(buildMockFrom({}));

    const result = await getMyTeam.handler({}, createContext());

    expect(result.isError).toBe(false);
    const payload = JSON.parse(result.content[0].text);
    expect(payload.season_stats?.power_score).toBe(72);
    expect(payload.team?.name).toBe('Eagles');
    expect(payload.roster).toHaveLength(1);
  });
});
