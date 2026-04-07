import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HeadToHeadService } from '@/services/HeadToHeadService';
import { getMatchHeadToHead } from '../getMatchHeadToHead';

vi.mock('@/services/HeadToHeadService', () => ({
  HeadToHeadService: {
    getTeamHeadToHead: vi.fn(),
  },
}));

const mockGetTeamHeadToHead = HeadToHeadService.getTeamHeadToHead as ReturnType<typeof vi.fn>;

describe('getMatchHeadToHead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when team1Id is null', async () => {
    expect(await getMatchHeadToHead(null, 'team-2')).toBeNull();
  });

  it('returns null when team2Id is undefined', async () => {
    expect(await getMatchHeadToHead('team-1', undefined)).toBeNull();
  });

  it('returns null when both team IDs are the same', async () => {
    expect(await getMatchHeadToHead('team-1', 'team-1')).toBeNull();
  });

  it('returns zero stats when no prior matches exist between the teams', async () => {
    mockGetTeamHeadToHead.mockResolvedValue([]);

    const result = await getMatchHeadToHead('team-1', 'team-2');

    expect(result).toEqual({
      team1Wins: 0,
      team2Wins: 0,
      totalMatches: 0,
      team1GameWins: 0,
      team2GameWins: 0,
    });
  });

  it('returns correct stats for one prior match', async () => {
    mockGetTeamHeadToHead.mockResolvedValue([
      {
        team_id: 'team-1',
        opponent_id: 'team-2',
        opponent_name: 'Team Two',
        matches_played: 3,
        wins: 2,
        losses: 1,
        game_wins: 5,
        game_losses: 3,
        win_pct: 0.667,
        last_played_at: null,
      },
    ]);

    const result = await getMatchHeadToHead('team-1', 'team-2');

    expect(result).toEqual({
      team1Wins: 2,
      team2Wins: 1,
      totalMatches: 3,
      team1GameWins: 5,
      team2GameWins: 3,
    });
  });

  it('finds the correct opponent record among multiple opponents', async () => {
    mockGetTeamHeadToHead.mockResolvedValue([
      {
        team_id: 'team-1',
        opponent_id: 'team-3',
        opponent_name: 'Team Three',
        matches_played: 1,
        wins: 0,
        losses: 1,
        game_wins: 1,
        game_losses: 2,
        win_pct: 0,
        last_played_at: null,
      },
      {
        team_id: 'team-1',
        opponent_id: 'team-2',
        opponent_name: 'Team Two',
        matches_played: 4,
        wins: 3,
        losses: 1,
        game_wins: 7,
        game_losses: 3,
        win_pct: 0.75,
        last_played_at: null,
      },
    ]);

    const result = await getMatchHeadToHead('team-1', 'team-2');

    expect(result).toEqual({
      team1Wins: 3,
      team2Wins: 1,
      totalMatches: 4,
      team1GameWins: 7,
      team2GameWins: 3,
    });
  });

  it('returns null when the service throws an error', async () => {
    mockGetTeamHeadToHead.mockRejectedValue(new Error('DB error'));

    const result = await getMatchHeadToHead('team-1', 'team-2');

    expect(result).toBeNull();
  });
});
