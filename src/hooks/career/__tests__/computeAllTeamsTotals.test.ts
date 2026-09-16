import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team } from '@/types';

import type { BulkTeamCareerData } from '../useCareerData';

const { mockFetchAllTeamsCareerData, mockFetchDivisionWeightsByName } = vi.hoisted(() => ({
  mockFetchAllTeamsCareerData: vi.fn(),
  mockFetchDivisionWeightsByName: vi.fn(),
}));

vi.mock('../useCareerData', () => ({
  fetchAllTeamsCareerData: (...args: unknown[]) => mockFetchAllTeamsCareerData(...args),
}));

// The real calculateCareerPowerScore runs, so the failure enters where it
// really does: the live division-weights read every team awaits.
vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: () => mockFetchDivisionWeightsByName(),
  fetchDivisionWeights: () => mockFetchDivisionWeightsByName(),
  clearDivisionWeightsCache: vi.fn(),
  getDefaultDivisionWeight: () => 0.85,
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
