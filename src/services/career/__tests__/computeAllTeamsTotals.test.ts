import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BulkTeamCareerData } from '@/services/career/CareerService';
import type { Team } from '@/types';

const { mockFetchAllTeamsCareerData, mockFetchDivisionWeightsByName } = vi.hoisted(() => ({
  mockFetchAllTeamsCareerData: vi.fn(),
  mockFetchDivisionWeightsByName: vi.fn(),
}));

vi.mock('@/services/career/CareerService', () => ({
  fetchAllTeamsCareerData: (...args: unknown[]) => mockFetchAllTeamsCareerData(...args),
}));

// The real calculateCareerPowerScore runs, so the failure enters where it
// really does: the live division-weights read every team awaits.
vi.mock('@/services/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: () => mockFetchDivisionWeightsByName(),
  fetchDivisionWeights: () => mockFetchDivisionWeightsByName(),
  clearDivisionWeightsCache: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { computeAllTeamsTotals } from '../computeAllTeamsTotals';

const team = (id: string): Team =>
  ({
    id,
    name: `Team ${id}`,
    power_score: null,
    career_power_score: null,
    wins: null,
    losses: null,
  }) as unknown as Team;

/**
 * A team with real history behind it: two seasons, a title in one and a runner-up
 * in the other. Fuller than it strictly needs to be so the happy-path test walks
 * the championship, runner-up and playoff-finish branches rather than stopping at
 * the empty-array short circuits.
 */
const seasonStatsFor = (id: string) => [
  {
    team_id: id,
    season_id: 'season-1',
    champion: true,
    runner_up: false,
    playoff_rank: 1,
    sos: 0.5,
    division_name: 'Premier',
    power_score: 0.7,
    career_power_score: 0.68,
    match_wins: 8,
    match_losses: 2,
    seasons: { name: 'Spring 2025' },
  },
  {
    team_id: id,
    season_id: 'season-2',
    champion: false,
    runner_up: true,
    playoff_rank: 2,
    sos: 0.45,
    division_name: 'Premier',
    power_score: 0.6,
    career_power_score: 0.59,
    match_wins: 6,
    match_losses: 4,
    seasons: { name: 'Autumn 2025' },
  },
];

const bulkFor = (id: string): BulkTeamCareerData =>
  ({
    teamData: { id, name: `Team ${id}` },
    seasonStats: seasonStatsFor(id),
    currentMatches: [],
    archivedMatches: [],
    playoffMatches: [],
    teamDivisionMap: new Map<string, string>(),
    bracketDivisionWeights: {},
    bracketDivisionDisplayNames: {},
    bracketSeasonMap: {},
    teamDivisionWeight: 0.85,
    currentSeasonId: null,
    seasonPowerScores: seasonStatsFor(id).map((s) => ({
      power_score: s.power_score,
      career_power_score: s.career_power_score,
      match_wins: s.match_wins,
      match_losses: s.match_losses,
      season_id: s.season_id,
    })),
  }) as unknown as BulkTeamCareerData;

const bulkMapFor = (ids: string[]) => new Map(ids.map((id) => [id, bulkFor(id)]));

/** A team as the Teams list hands it over: with its current-season row. */
const teamWithCurrentSeason = (
  id: string,
  current: { power_score: number; career_power_score: number | null; wins: number; losses: number }
): Team => ({ ...team(id), ...current }) as unknown as Team;

/**
 * The same two old seasons, plus a stored row for the current season
 * ('season-3'). That row is stale on purpose: the live numbers for the current
 * season come from the Teams list, so the stored row must not count twice.
 */
const bulkWithCurrentSeason = (id: string): BulkTeamCareerData => {
  const base = bulkFor(id);
  return {
    ...base,
    currentSeasonId: 'season-3',
    seasonPowerScores: [
      ...base.seasonPowerScores,
      {
        power_score: 0.2,
        career_power_score: 0.2,
        match_wins: 1,
        match_losses: 9,
        season_id: 'season-3',
      },
    ],
  };
};

describe('computeAllTeamsTotals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A Map, as the real cache returns — keyed by normalised division name.
    mockFetchDivisionWeightsByName.mockResolvedValue(new Map([['premier', 1]]));
  });

  it('returns totals for every team when the division weights load', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(bulkMapFor(['t1', 't2']));

    const result = await computeAllTeamsTotals([team('t1'), team('t2')]);

    expect([...result.keys()].sort()).toEqual(['t1', 't2']);
    // Folded from the season history, not just an empty shell.
    const t1 = result.get('t1');
    expect(t1?.championships).toBe(1);
    expect(t1?.runner_ups).toBe(1);
    expect(t1?.playoff_finishes.map((f) => f.rank)).toEqual([1, 2]);
    expect(t1?.playoff_finishes[0].season_name).toBe('Spring 2025');
  });

  // Career power score through the batch path, worked out by hand. The old
  // seasons come from the bulk fetch, the current season from the Teams list.
  // Division "Premier" weighs 0.7 here (a plain 1.0 would hide a missing square).
  //
  // Both teams: a title and a runner-up in "Premier", no playoff matches.
  //   old seasons (score x 100, weighted by matches):
  //     season-1: 0.68 -> 68, 8 + 2 = 10 matches -> 680
  //     season-2: 0.59 -> 59, 6 + 4 = 10 matches -> 590
  //   season-3 is the current season: its stale stored row is left out.
  //   bonus: title 7 x 0.7 x 0.7 = 3.43, runner-up 4 x 0.7 x 0.7 = 1.96,
  //     playoff win-rate bonus 0 (no playoff matches), sum 5.39,
  //     cap 15 x 0.7 x 0.7 = 7.35, so the bonus is 5.39.
  // t1 (power score 72, no floored score, 6 + 4 = 10 matches -> 720):
  //     base = (680 + 590 + 720) / 30 = 1990 / 30 = 66.3333
  //     career power score = 66.3333 + 5.39 = 71.7233
  // t2 (power score 60, but the floored score 80 is used instead, 3 + 3 = 6 matches -> 480):
  //     base = (680 + 590 + 480) / 26 = 1750 / 26 = 67.3077
  //     career power score = 67.3077 + 5.39 = 72.6977
  it('works out career power score from the old seasons and the current-season row', async () => {
    mockFetchDivisionWeightsByName.mockResolvedValue(new Map([['premier', 0.7]]));
    mockFetchAllTeamsCareerData.mockResolvedValue(
      new Map([
        ['t1', bulkWithCurrentSeason('t1')],
        ['t2', bulkWithCurrentSeason('t2')],
      ])
    );

    const result = await computeAllTeamsTotals([
      teamWithCurrentSeason('t1', {
        power_score: 72,
        career_power_score: null,
        wins: 6,
        losses: 4,
      }),
      teamWithCurrentSeason('t2', { power_score: 60, career_power_score: 80, wins: 3, losses: 3 }),
    ]);

    expect(result.get('t1')?.career_power_score).toBeCloseTo(71.7233, 4);
    expect(result.get('t2')?.career_power_score).toBeCloseTo(72.6977, 4);
  });

  // A season row with no division name, or no season row to name it, still
  // counts as a title, a runner-up and a playoff finish. The finish reads
  // "Unknown" and "Unknown Season". A blank division is unrated (Doug,
  // 2026-11-13), so the finish adds nothing to the career score: the team with
  // the honours scores exactly what the same team without them scores.
  it('names a finish in a season with no division name "Unknown" and gives it no bonus', async () => {
    // A live rated name beside the fixture's "premier": a fallback that turned a
    // blank division into a RATED name (say "Competitive") would earn a bonus,
    // change the score, and fail the last assertion.
    mockFetchDivisionWeightsByName.mockResolvedValue(
      new Map([
        ['premier', 1],
        ['competitive', 1],
      ])
    );
    const seasonsFor = (id: string, honours: boolean) => [
      {
        team_id: id,
        season_id: 'season-1',
        champion: honours,
        runner_up: false,
        playoff_rank: honours ? 1 : null,
        sos: 0.5,
        division_name: null,
        power_score: 0.7,
        career_power_score: 0.68,
        match_wins: 8,
        match_losses: 2,
        seasons: null,
      },
      {
        team_id: id,
        season_id: 'season-2',
        champion: false,
        runner_up: honours,
        playoff_rank: honours ? 2 : null,
        sos: 0.45,
        division_name: '',
        power_score: 0.6,
        career_power_score: 0.59,
        match_wins: 6,
        match_losses: 4,
        seasons: { name: 'Autumn 2025' },
      },
    ];
    const bulkWith = (id: string, honours: boolean) => {
      const rows = seasonsFor(id, honours);
      return {
        ...bulkFor(id),
        seasonStats: rows,
        seasonPowerScores: rows.map((row) => ({
          power_score: row.power_score,
          career_power_score: row.career_power_score,
          match_wins: row.match_wins,
          match_losses: row.match_losses,
          season_id: row.season_id,
        })),
      } as unknown as BulkTeamCareerData;
    };
    mockFetchAllTeamsCareerData.mockResolvedValue(
      new Map([
        ['t1', bulkWith('t1', true)],
        ['t2', bulkWith('t2', false)],
      ])
    );

    const result = await computeAllTeamsTotals([team('t1'), team('t2')]);

    const honoured = result.get('t1');
    const plain = result.get('t2');
    expect(honoured?.championships).toBe(1);
    expect(honoured?.runner_ups).toBe(1);
    expect(honoured?.playoff_finishes).toEqual([
      { rank: 1, season_name: 'Unknown Season', division_name: 'Unknown' },
      { rank: 2, season_name: 'Autumn 2025', division_name: 'Unknown' },
    ]);
    expect(plain?.championships).toBe(0);
    expect(plain?.playoff_finishes).toEqual([]);
    expect(honoured?.career_power_score).toBeGreaterThan(0);
    expect(honoured?.career_power_score).toBe(plain?.career_power_score);
  });

  // The defect. The division-weights read is memoised behind one shared
  // promise, so a single failure rejects for every team at once. Each rejection
  // was caught, logged, and the team quietly dropped — leaving an empty Map
  // that useCareerRankings reported as a league with no teams: no error, no Try
  // Again, and React Query recording the request as a success.
  it('rejects when the division weights fail and no team could be computed', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(bulkMapFor(['t1', 't2']));
    mockFetchDivisionWeightsByName.mockRejectedValue(new Error('divisions unavailable'));

    await expect(computeAllTeamsTotals([team('t1'), team('t2')])).rejects.toThrow(
      'divisions unavailable'
    );
  });

  // The other side of the same line. One team failing where others succeed is
  // ordinary — it has data the rest do not — and must not take the whole league
  // down with it.
  it('drops a single failing team rather than rejecting the batch', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(bulkMapFor(['t1', 't2']));
    mockFetchDivisionWeightsByName
      .mockRejectedValueOnce(new Error('divisions unavailable'))
      .mockResolvedValue(new Map([['premier', 1]]));

    const result = await computeAllTeamsTotals([team('t1'), team('t2')]);

    expect(result.size).toBe(1);
  });

  // No teams asked for is not a failure, and must stay an empty Map.
  it('resolves empty when there were no teams to compute', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(new Map());

    await expect(computeAllTeamsTotals([])).resolves.toEqual(new Map());
  });

  // A team the bulk fetch returned nothing for was never attempted, so it is
  // not evidence of a failure either.
  it('resolves empty when the bulk fetch returned no data for any team', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(new Map());

    const result = await computeAllTeamsTotals([team('t1')]);

    expect(result.size).toBe(0);
  });
});
