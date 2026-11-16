import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyDropoutDivisions, DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
import { fetchRealDivisionOverrides } from '@/services/divisions/RealDivisionService';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// The season maths is REAL here: the test checks which tier a game lands in.

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
  dbLog: vi.fn(),
}));

vi.mock('@/services/divisions/RealDivisionService', () => ({
  fetchRealDivisionOverrides: vi.fn(),
}));

import { fetchSeasonBreakdown } from '../fetchSeasonBreakdown';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEAM_ID = '11111111-1111-4111-8111-111111111111';
const COMPETITIVE_OPPONENT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

// The three dropped-out teams below are real rows of Doug's list.
const dougRow = (prefix: string) => {
  const key = Object.keys(DROPOUT_DIVISIONS).find((k) => k.startsWith(prefix)) ?? '';
  const [teamId, seasonId] = key.split('_');
  return { key, teamId, seasonId };
};
const BURNING_HOLES = dougRow('eb7976c7'); // Summer 1 2026, really Recreational
const ZOO_PALS = dougRow('56387477'); // Fall 2026 (active), really Intermediate
const TOMATO_SAUCERS = dougRow('accd6e20'); // Winter 2 2026, really Recreational

const seasonStat = (seasonId: string, name: string, startDate: string) => ({
  season_id: seasonId,
  match_wins: 5,
  match_losses: 2,
  game_wins: 11,
  game_losses: 5,
  sos: 0.7,
  power_score: 0.8,
  champion: false,
  runner_up: false,
  playoff_rank: null,
  division_name: 'Competitive',
  seasons: { id: seasonId, name, start_date: startDate },
});

const SEASON_STATS = [
  seasonStat(ZOO_PALS.seasonId, 'Fall 2026', '2026-09-01'),
  seasonStat(BURNING_HOLES.seasonId, 'Summer 1 2026', '2026-06-01'),
  seasonStat(TOMATO_SAUCERS.seasonId, 'Winter 2 2026', '2026-02-01'),
];

// Stored divisions: the three dropped-out teams say Hidden, the other opponent is real.
const ALL_TEAM_SEASON_STATS = [
  { team_id: BURNING_HOLES.teamId, season_id: BURNING_HOLES.seasonId, division_name: 'Hidden' },
  { team_id: ZOO_PALS.teamId, season_id: ZOO_PALS.seasonId, division_name: 'Hidden' },
  { team_id: TOMATO_SAUCERS.teamId, season_id: TOMATO_SAUCERS.seasonId, division_name: 'Hidden2' },
  {
    team_id: COMPETITIVE_OPPONENT,
    season_id: BURNING_HOLES.seasonId,
    division_name: 'Competitive',
  },
];

const game = (opponentId: string, seasonId: string, teamWon: boolean) => ({
  winner_id: teamWon ? TEAM_ID : opponentId,
  loser_id: teamWon ? opponentId : TEAM_ID,
  team1_game_wins: teamWon ? 2 : 0,
  team2_game_wins: teamWon ? 0 : 2,
  team1_id: TEAM_ID,
  team2_id: opponentId,
  season_id: seasonId,
});

// Summer 1 2026: 3 wins and 1 loss against a Competitive team, plus a 0-2 loss to
// Burning Holes. Fall 2026: a 2-0 win over Zoo Pals. Winter 2 2026: a win over Tomato Saucers.
const MATCHES = [
  game(COMPETITIVE_OPPONENT, BURNING_HOLES.seasonId, true),
  game(COMPETITIVE_OPPONENT, BURNING_HOLES.seasonId, true),
  game(COMPETITIVE_OPPONENT, BURNING_HOLES.seasonId, true),
  game(COMPETITIVE_OPPONENT, BURNING_HOLES.seasonId, false),
  game(BURNING_HOLES.teamId, BURNING_HOLES.seasonId, false),
  game(ZOO_PALS.teamId, ZOO_PALS.seasonId, true),
  game(TOMATO_SAUCERS.teamId, TOMATO_SAUCERS.seasonId, true),
];

const result = <T>(data: T) => Promise.resolve({ data, error: null });

const mockTables = () => {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'team_season_stats') {
      return {
        select: (columns: string) =>
          columns.includes('seasons!inner')
            ? { eq: () => ({ order: () => result(SEASON_STATS) }) }
            : result(ALL_TEAM_SEASON_STATS),
      };
    }
    if (table === 'matches') {
      return { select: () => ({ or: () => ({ eq: () => result(MATCHES) }) }) };
    }
    if (table === 'matches_archive') {
      return { select: () => ({ or: () => ({ eq: () => result([]) }) }) };
    }
    if (table === 'playoff_matches') {
      return { select: () => ({ or: () => ({ not: () => result([]) }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
};

/** The overrides the real service gives today: Doug's list on an empty lookup. */
const dougsOverrides = () => applyDropoutDivisions(new Map());

const breakdown = async (overrides: Map<string, string>) => {
  vi.mocked(fetchRealDivisionOverrides).mockResolvedValue(overrides);
  const data = await fetchSeasonBreakdown(TEAM_ID);
  const season = (seasonId: string) => data?.seasons.find((s) => s.seasonId === seasonId);
  return { data, season };
};

const record = (
  season: { divisionRecords: Record<string, { wins: number; losses: number }> } | undefined,
  tier: string
) => `${season?.divisionRecords[tier].wins}-${season?.divisionRecords[tier].losses}`;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('fetchSeasonBreakdown: games against a dropped-out (Hidden) team', () => {
  beforeEach(() => {
    mockTables();
  });

  it('files a loss to Burning Holes under Recreational, not Competitive', async () => {
    const { season } = await breakdown(dougsOverrides());

    // Before the fix this read 3-2 for Competitive (the Hidden loss counted there).
    expect(record(season(BURNING_HOLES.seasonId), 'competitive')).toBe('3-1');
    expect(record(season(BURNING_HOLES.seasonId), 'recreational')).toBe('0-1');
  });

  it('files a win over Zoo Pals in the active season under Intermediate', async () => {
    const { season } = await breakdown(dougsOverrides());

    expect(record(season(ZOO_PALS.seasonId), 'competitive')).toBe('0-0');
    expect(record(season(ZOO_PALS.seasonId), 'intermediate')).toBe('1-0');
  });

  it('files a win over The Tomato Saucers under Recreational', async () => {
    const { season } = await breakdown(dougsOverrides());

    expect(record(season(TOMATO_SAUCERS.seasonId), 'competitive')).toBe('0-0');
    expect(record(season(TOMATO_SAUCERS.seasonId), 'recreational')).toBe('1-0');
  });

  it("leaves today's numbers alone when there are no overrides", async () => {
    const { season } = await breakdown(new Map());

    // A Hidden team still counts as Competitive on this page, as it does today.
    expect(record(season(BURNING_HOLES.seasonId), 'competitive')).toBe('3-2');
    expect(record(season(BURNING_HOLES.seasonId), 'recreational')).toBe('0-0');
    expect(record(season(ZOO_PALS.seasonId), 'competitive')).toBe('1-0');
    expect(record(season(TOMATO_SAUCERS.seasonId), 'competitive')).toBe('1-0');
  });

  it('only moves games between tiers: season W-L and the game total do not change', async () => {
    const before = await breakdown(new Map());
    const after = await breakdown(dougsOverrides());

    const tierGames = (data: typeof before.data) =>
      data?.seasons.map((s) =>
        Object.values(s.divisionRecords).reduce((sum, r) => sum + r.wins + r.losses, 0)
      );
    expect(tierGames(after.data)).toEqual(tierGames(before.data));
    expect(after.data?.seasons.map((s) => [s.seasonId, s.matchWins, s.matchLosses])).toEqual(
      before.data?.seasons.map((s) => [s.seasonId, s.matchWins, s.matchLosses])
    );
    expect(after.data?.seasons.map((s) => [s.sweeps, s.closeWins])).toEqual(
      before.data?.seasons.map((s) => [s.sweeps, s.closeWins])
    );
  });

  it('never replaces a real stored division with an override', async () => {
    const wrong = new Map([[`${COMPETITIVE_OPPONENT}_${BURNING_HOLES.seasonId}`, 'Recreational']]);
    const { season } = await breakdown(wrong);

    // The opponent is stored as Competitive, so its 3 wins and 1 loss stay there.
    expect(record(season(BURNING_HOLES.seasonId), 'competitive')).toBe('3-2');
    expect(record(season(BURNING_HOLES.seasonId), 'recreational')).toBe('0-0');
  });

  it('reads the overrides once for the whole page', async () => {
    await breakdown(dougsOverrides());

    expect(fetchRealDivisionOverrides).toHaveBeenCalledTimes(1);
  });

  it('moves the strongest and toughest tier with the cards', async () => {
    // Today Competitive (5-2) is the only tier with games, so it is both best and worst.
    const before = await breakdown(new Map());
    expect(before.data?.bestDivisionTier).toBe('competitive');
    expect(before.data?.worstDivisionTier).toBe('competitive');

    // With the fix: Competitive 3-1, Intermediate 1-0, Recreational 1-1.
    const after = await breakdown(dougsOverrides());
    expect(after.data?.bestDivisionTier).toBe('intermediate');
    expect(after.data?.worstDivisionTier).toBe('recreational');
  });
});
