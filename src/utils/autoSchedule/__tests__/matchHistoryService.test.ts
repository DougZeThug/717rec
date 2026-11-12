import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchActiveSeasonIdStrict = vi.fn();
const mockCountTeamMatchesInSeason = vi.fn();
const mockFetchMatchPairsInSeason = vi.fn();

vi.mock('@/services/matches/MatchReadService', () => ({
  fetchActiveSeasonIdStrict: () => mockFetchActiveSeasonIdStrict(),
  countTeamMatchesInSeason: (team1Id: string, team2Id: string, seasonId: string) =>
    mockCountTeamMatchesInSeason(team1Id, team2Id, seasonId),
  fetchMatchPairsInSeason: (teamIds: string[], seasonId: string) =>
    mockFetchMatchPairsInSeason(teamIds, seasonId),
}));

vi.mock('@/utils/logger', () => ({
  dbLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
}));

// Import after mocks
import { errorLog } from '@/utils/logger';

import { fetchSeasonHistoryForTeams, haveTeamsPlayedBefore } from '../matchHistoryService';

const SEASON = 'season-1';

beforeEach(() => {
  mockFetchActiveSeasonIdStrict.mockReset();
  mockCountTeamMatchesInSeason.mockReset();
  mockFetchMatchPairsInSeason.mockReset();
  mockFetchActiveSeasonIdStrict.mockResolvedValue(SEASON);
});

describe('haveTeamsPlayedBefore', () => {
  it('is true when the two teams have played this season (count above 0)', async () => {
    mockCountTeamMatchesInSeason.mockResolvedValue(2);

    await expect(haveTeamsPlayedBefore('team-a', 'team-b')).resolves.toBe(true);

    expect(mockFetchActiveSeasonIdStrict).toHaveBeenCalledTimes(1);
    expect(mockCountTeamMatchesInSeason).toHaveBeenCalledTimes(1);
    expect(mockCountTeamMatchesInSeason).toHaveBeenCalledWith('team-a', 'team-b', SEASON);
  });

  it('is false when the two teams have not played this season (count is 0)', async () => {
    mockCountTeamMatchesInSeason.mockResolvedValue(0);

    await expect(haveTeamsPlayedBefore('team-a', 'team-b')).resolves.toBe(false);

    expect(mockCountTeamMatchesInSeason).toHaveBeenCalledTimes(1);
  });

  it('is false, and logs an error, when the active season lookup throws', async () => {
    const seasonError = new Error('no active season');
    mockFetchActiveSeasonIdStrict.mockRejectedValue(seasonError);

    await expect(haveTeamsPlayedBefore('team-a', 'team-b')).resolves.toBe(false);

    expect(mockCountTeamMatchesInSeason).not.toHaveBeenCalled();
    // Handled by the season lookup's own catch: one log, not the outer catch's second one.
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith('Error fetching active season:', seasonError);
  });

  it('is false, and logs an error, when the count query throws', async () => {
    mockCountTeamMatchesInSeason.mockRejectedValue(new Error('count failed'));

    await expect(haveTeamsPlayedBefore('team-a', 'team-b')).resolves.toBe(false);

    expect(mockCountTeamMatchesInSeason).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalled();
  });
});

describe('fetchSeasonHistoryForTeams', () => {
  it('returns an empty list for an empty team list, without any lookup', async () => {
    await expect(fetchSeasonHistoryForTeams([])).resolves.toEqual([]);

    expect(mockFetchActiveSeasonIdStrict).not.toHaveBeenCalled();
    expect(mockFetchMatchPairsInSeason).not.toHaveBeenCalled();
  });

  it('returns the [team1, team2] pair of every match found this season', async () => {
    mockFetchMatchPairsInSeason.mockResolvedValue([
      { team1_id: 'team-a', team2_id: 'team-b' },
      { team1_id: 'team-c', team2_id: 'team-a' },
    ]);

    const teamIds = ['team-a', 'team-b', 'team-c'];
    await expect(fetchSeasonHistoryForTeams(teamIds)).resolves.toEqual([
      ['team-a', 'team-b'],
      ['team-c', 'team-a'],
    ]);

    expect(mockFetchMatchPairsInSeason).toHaveBeenCalledTimes(1);
    expect(mockFetchMatchPairsInSeason).toHaveBeenCalledWith(teamIds, SEASON);
  });

  it('skips matches where team1_id or team2_id is missing', async () => {
    mockFetchMatchPairsInSeason.mockResolvedValue([
      { team1_id: 'team-a', team2_id: null },
      { team1_id: null, team2_id: 'team-b' },
      { team1_id: null, team2_id: null },
      { team1_id: 'team-b', team2_id: 'team-c' },
    ]);

    await expect(fetchSeasonHistoryForTeams(['team-a', 'team-b', 'team-c'])).resolves.toEqual([
      ['team-b', 'team-c'],
    ]);
  });

  it('returns an empty list when the active season lookup throws', async () => {
    const seasonError = new Error('no active season');
    mockFetchActiveSeasonIdStrict.mockRejectedValue(seasonError);

    await expect(fetchSeasonHistoryForTeams(['team-a', 'team-b'])).resolves.toEqual([]);

    expect(mockFetchMatchPairsInSeason).not.toHaveBeenCalled();
    // Handled by the season lookup's own catch: one log, not the outer catch's second one.
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(errorLog).toHaveBeenCalledWith('Error fetching active season:', seasonError);
  });

  it('returns an empty list when the pairs query throws', async () => {
    mockFetchMatchPairsInSeason.mockRejectedValue(new Error('pairs failed'));

    await expect(fetchSeasonHistoryForTeams(['team-a', 'team-b'])).resolves.toEqual([]);

    expect(mockFetchMatchPairsInSeason).toHaveBeenCalledTimes(1);
  });
});
