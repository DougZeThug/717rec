import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamForStats: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  teamLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { fetchTeamForStats } from '@/services/teams/TeamFetchService';
import { errorLog, teamLog } from '@/utils/logger';

import { fetchTeamData } from '../fetchTeamData';

describe('fetchTeamData', () => {
  beforeEach(() => vi.clearAllMocks());

  type FetchCase = {
    label: string;
    teamId: string;
    serviceResult: {
      id: string;
      name: string;
      wins: number;
      losses: number;
      game_wins: number;
      game_losses: number;
      divisions: { name: string };
    } | null;
    expected: {
      id: string;
      name: string;
      wins: number;
      losses: number;
      game_wins: number;
      game_losses: number;
      divisions: { name: string };
    } | null;
  };

  it.each<FetchCase>([
    {
      label: 'valid team object',
      teamId: 'team-1',
      serviceResult: {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        game_wins: 8,
        game_losses: 4,
        divisions: { name: 'Competitive' },
      },
      expected: {
        id: 'team-1',
        name: 'Test Team',
        wins: 3,
        losses: 1,
        game_wins: 8,
        game_losses: 4,
        divisions: { name: 'Competitive' },
      },
    },
    {
      label: 'invalid id returns null',
      teamId: 'unknown-id',
      serviceResult: null,
      expected: null,
    },
  ])('returns expected result for $label', async ({ teamId, serviceResult, expected }) => {
    vi.mocked(fetchTeamForStats).mockResolvedValue(serviceResult);

    await expect(fetchTeamData(teamId)).resolves.toEqual(expected);
    expect(fetchTeamForStats).toHaveBeenCalledWith(teamId);
  });

  it('logs error path when no team is found', async () => {
    vi.mocked(fetchTeamForStats).mockResolvedValue(null);

    await fetchTeamData('missing-team');

    expect(errorLog).toHaveBeenCalledWith(
      'ERROR FETCHING TEAM:',
      'No team found with ID: missing-team'
    );
  });

  it('propagates service errors to caller', async () => {
    const err = new Error('DB down');
    vi.mocked(fetchTeamForStats).mockRejectedValue(err);

    await expect(fetchTeamData('team-1')).rejects.toThrow('DB down');
    expect(teamLog).toHaveBeenCalledWith('Fetching team data for ID:', 'team-1');
  });
});
