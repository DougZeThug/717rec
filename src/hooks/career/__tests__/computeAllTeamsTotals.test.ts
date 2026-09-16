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

const bulkFor = (id: string): BulkTeamCareerData =>
  ({
    teamData: { id, name: `Team ${id}` },
    seasonStats: [],
    currentMatches: [],
    archivedMatches: [],
    playoffMatches: [],
    teamDivisionMap: new Map<string, string>(),
    bracketDivisionWeights: {},
    bracketDivisionDisplayNames: {},
    bracketSeasonMap: {},
    teamDivisionWeight: 0.85,
    currentSeasonId: null,
    seasonPowerScores: [],
  }) as unknown as BulkTeamCareerData;

const bulkMapFor = (ids: string[]) => new Map(ids.map((id) => [id, bulkFor(id)]));

describe('computeAllTeamsTotals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchDivisionWeightsByName.mockResolvedValue({});
  });

  it('returns totals for every team when the division weights load', async () => {
    mockFetchAllTeamsCareerData.mockResolvedValue(bulkMapFor(['t1', 't2']));

    const result = await computeAllTeamsTotals([team('t1'), team('t2')]);

    expect([...result.keys()].sort()).toEqual(['t1', 't2']);
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
      .mockResolvedValue({});

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
