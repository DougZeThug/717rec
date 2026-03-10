import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updateMatchScore, UpdateMatchScoreParams } from '../utils/matchDatabaseUtils';

// Mock service layer (replaces direct supabase mocking)
vi.mock('@/services/matches/MatchReadService', () => ({
  fetchMatchTeamIds: vi.fn(),
}));

vi.mock('@/services/matches/MatchWriteService', () => ({
  updateMatch: vi.fn(),
}));

// Mock BadgeProcessingService
vi.mock('@/services/BadgeProcessingService', () => ({
  BadgeProcessingService: {
    processMatchBadges: vi.fn().mockResolvedValue({ success: true }),
    processKingslayerBadge: vi.fn().mockResolvedValue({ success: true }),
    processClutchPerformerBadge: vi.fn().mockResolvedValue({ success: true }),
    processConsistentPerformerBadge: vi.fn().mockResolvedValue({ success: true }),
    processIceColdBadge: vi.fn().mockResolvedValue({ success: true }),
    processBroomCrewBadge: vi.fn().mockResolvedValue({ success: true }),
    processGatekeeperBadge: vi.fn().mockResolvedValue({ success: true }),
    processChaosAgentBadge: vi.fn().mockResolvedValue({ success: true }),
    processBullyBadge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/services/FailedBadgeOperationsService', () => ({
  FailedBadgeOperationsService: {
    queueFailedOperation: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  matchLog: vi.fn(),
  badgeLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { BadgeProcessingService } from '@/services/BadgeProcessingService';
import { fetchMatchTeamIds } from '@/services/matches/MatchReadService';
import { updateMatch } from '@/services/matches/MatchWriteService';

describe('updateMatchScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully updates match score when team1 wins', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(updateMatch).mockResolvedValue({
      id: 'match-1',
      team1_score: 2,
      team2_score: 1,
    } as any);

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
    vi.mocked(updateMatch).mockResolvedValue({
      id: 'match-1',
      team1_score: 1,
      team2_score: 3,
    } as any);

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
    vi.mocked(updateMatch).mockRejectedValue(new Error('Update failed'));

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await expect(updateMatchScore(params)).rejects.toBeDefined();
  });

  it('processes badges after successful update', async () => {
    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(updateMatch).mockResolvedValue({
      id: 'match-1',
      team1_score: 2,
      team2_score: 1,
    } as any);

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    await updateMatchScore(params);

    expect(BadgeProcessingService.processMatchBadges).toHaveBeenCalledWith('team-1', 'team-2');
    expect(BadgeProcessingService.processKingslayerBadge).toHaveBeenCalled();
    expect(BadgeProcessingService.processClutchPerformerBadge).toHaveBeenCalled();
    expect(BadgeProcessingService.processConsistentPerformerBadge).toHaveBeenCalled();
  });

  it('does not fail when badge processing fails', async () => {
    vi.mocked(BadgeProcessingService.processMatchBadges).mockRejectedValueOnce(
      new Error('Badge error')
    );

    vi.mocked(fetchMatchTeamIds).mockResolvedValue({ team1_id: 'team-1', team2_id: 'team-2' });
    vi.mocked(updateMatch).mockResolvedValue({
      id: 'match-1',
      team1_score: 2,
      team2_score: 1,
    } as any);

    const params: UpdateMatchScoreParams = {
      matchId: 'match-1',
      team1Score: 2,
      team2Score: 1,
      team1GameWins: 3,
      team2GameWins: 1,
    };

    // Should not throw
    const result = await updateMatchScore(params);
    expect(result.data).toBeDefined();
  });
});
