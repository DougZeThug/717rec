import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateMatchScore, UpdateMatchScoreParams } from '../utils/matchDatabaseUtils';

// Mock service layer (replaces direct supabase mocking)
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchTeamIds: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  resubmitMatchResult: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  badgeLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { fetchMatchTeamIds } from '@/services/matches/MatchReadService';
import { resubmitMatchResult } from '@/services/matches/MatchWriteService';

type UpdatedMatch = Awaited<ReturnType<typeof resubmitMatchResult>>;

const makeUpdatedMatch = (overrides: Partial<UpdatedMatch> = {}): UpdatedMatch =>
  ({
    applied: true,
    reversed_previous: false,
    previous_winner_id: null,
    ...overrides,
  }) as UpdatedMatch;

describe('updateMatchScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully updates match score when team1 wins', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(resubmitMatchResult).mockResolvedValue(makeUpdatedMatch());

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    const result = await updateMatchScore(params);

    expect(result.team1Win).toBe(true);
    expect(result.team1_id).toBe('team-1');
    expect(result.team2_id).toBe('team-2');
    expect(result.data).toBeDefined();
  });

  it('correctly determines team2 as winner', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(resubmitMatchResult).mockResolvedValue(makeUpdatedMatch());

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 1,
      team2Score: 3,
      team1GameWins: 1,
      team2GameWins: 3,
    };

    const result = await updateMatchScore(params);

    expect(result.team1Win).toBe(false);
  });

  it('throws error when match not found', async () => {
    vi.mocked(fetchMatchTeamIds).mockRejectedValue(
      new Error('Failed to fetch match data: Match not found')
    );

    const params: UpdateMatchScoreParams = {
      matchId: 'non-existent',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await expect(updateMatchScore(params)).rejects.toThrow('Failed to fetch match data');
  });

  it('throws error when update fails', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(resubmitMatchResult).mockRejectedValue(new Error('Update failed'));

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await expect(updateMatchScore(params)).rejects.toBeDefined();
  });

  it('leaves badge processing to the database and makes no badge calls of its own', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(resubmitMatchResult).mockResolvedValue(makeUpdatedMatch());

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await updateMatchScore(params);

    // resubmit_match_result runs process_all_match_badges() in the same
    // transaction, so submitting a score is now exactly one write call rather
    // than one write plus fourteen badge round-trips.
    expect(resubmitMatchResult).toHaveBeenCalledTimes(1);
    expect(resubmitMatchResult).toHaveBeenCalledWith('match-1', 'team-1', 'team-2', 3, 1);
  });
});
