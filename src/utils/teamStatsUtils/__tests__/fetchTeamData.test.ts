import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/teams/TeamFetchService', () => ({
  fetchTeamForStats: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  teamLog: vi.fn(),
  errorLog: vi.fn(),
}));

import { fetchTeamForStats } from '@/services/teams/TeamFetchService';

import { fetchTeamData } from '../fetchTeamData';

describe('fetchTeamData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the team when found', async () => {
    const mockTeam = {
      id: 'team-1',
      name: 'Test Team',
      wins: 3,
      losses: 1,
      game_wins: 8,
      game_losses: 4,
    };
    vi.mocked(fetchTeamForStats).mockResolvedValue(mockTeam as any);

    const result = await fetchTeamData('team-1');

    expect(result).toEqual(mockTeam);
    expect(fetchTeamForStats).toHaveBeenCalledWith('team-1');
  });

  it('returns null when no team is found', async () => {
    vi.mocked(fetchTeamForStats).mockResolvedValue(null);

    const result = await fetchTeamData('unknown-id');

    expect(result).toBeNull();
  });

  it('calls fetchTeamForStats with the provided teamId', async () => {
    vi.mocked(fetchTeamForStats).mockResolvedValue(null);

    await fetchTeamData('specific-id');

    expect(fetchTeamForStats).toHaveBeenCalledWith('specific-id');
  });
});
