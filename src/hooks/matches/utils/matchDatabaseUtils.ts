import { BadgeProcessingService } from '@/services/BadgeProcessingService';
import { FailedBadgeOperationsService } from '@/services/FailedBadgeOperationsService';
import { fetchMatchTeamIds } from '@/services/matches/MatchReadService';
import { resubmitMatchResult } from '@/services/matches/MatchWriteService';
import { BadgeOperationKind as BadgeOperationType, BadgeOperationParams } from '@/types/badges';
import { badgeLog, matchLog, warnLog } from '@/utils/logger';

export interface UpdateMatchScoreParams {
  matchId: string;
  team1Score: number;
  team2Score: number;
  team1GameWins: number;
  team2GameWins: number;
}

export interface UpdateMatchScoreResult {
  data: Awaited<ReturnType<typeof resubmitMatchResult>>;
  team1_id: string;
  team2_id: string;
  team1Win: boolean;
}

type BadgeOperation = {
  [K in BadgeOperationType]: {
    type: K;
    params: BadgeOperationParams[K];
    execute: () => Promise<unknown>;
  };
}[BadgeOperationType];

export const updateMatchScore = async ({
  matchId,
  team1Score,
  team2Score,
  team1GameWins,
  team2GameWins,
}: UpdateMatchScoreParams): Promise<UpdateMatchScoreResult> => {
  matchLog('updateMatchScore called with:', {
    matchId,
    team1Score,
    team2Score,
    team1GameWins,
    team2GameWins,
  });

  // First get the match to extract team IDs
  const matchData = await fetchMatchTeamIds(matchId);

  const { team1_id, team2_id } = matchData;

  if (!team1_id || !team2_id) {
    throw new Error(`Cannot update score: match ${matchId} is missing team IDs`);
  }

  // Determine winner based on scores
  const team1Win = team1Score > team2Score;
  const winnerId = team1Win ? team1_id : team2_id;
  const loserId = team1Win ? team2_id : team1_id;

  matchLog('Match result:', {
    team1Win,
    winnerId,
    loserId,
    team1_id,
    team2_id,
  });

  // Atomically reverse prior stats (if any), write scores + winner, apply new
  // counters, and refresh season stats in one transaction.
  const winnerGameWins = team1Win ? team1GameWins : team2GameWins;
  const loserGameWins = team1Win ? team2GameWins : team1GameWins;
  const data = await resubmitMatchResult(
    matchId,
    winnerId,
    loserId,
    winnerGameWins,
    loserGameWins
  );

  matchLog('Match result submitted atomically:', data);

  // Process all badges for both teams after match completion
  // Each badge type is processed independently to avoid cascading failures
  const badgeOperations: BadgeOperation[] = [
    {
      type: 'match_badges' as const,
      params: { team1Id: team1_id, team2Id: team2_id },
      execute: () => BadgeProcessingService.processMatchBadges(team1_id, team2_id),
    },
    {
      type: 'kingslayer' as const,
      params: { winnerId, loserId },
      execute: () => BadgeProcessingService.processKingslayerBadge(winnerId, loserId),
    },
    {
      type: 'clutch_performer' as const,
      params: { winnerId, team1GameWins, team2GameWins },
      execute: () =>
        BadgeProcessingService.processClutchPerformerBadge(winnerId, team1GameWins, team2GameWins),
    },
    {
      type: 'consistent_performer' as const,
      params: { winnerId },
      execute: () => BadgeProcessingService.processConsistentPerformerBadge(winnerId),
    },
    // Fun badges - processed for both teams
    {
      type: 'ice_cold_winner' as const,
      params: { teamId: winnerId },
      execute: () => BadgeProcessingService.processIceColdBadge(winnerId),
    },
    {
      type: 'ice_cold_loser' as const,
      params: { teamId: loserId },
      execute: () => BadgeProcessingService.processIceColdBadge(loserId),
    },
    {
      type: 'broom_crew_winner' as const,
      params: { teamId: winnerId },
      execute: () => BadgeProcessingService.processBroomCrewBadge(winnerId),
    },
    {
      type: 'broom_crew_loser' as const,
      params: { teamId: loserId },
      execute: () => BadgeProcessingService.processBroomCrewBadge(loserId),
    },
    {
      type: 'gatekeeper_winner' as const,
      params: { teamId: winnerId },
      execute: () => BadgeProcessingService.processGatekeeperBadge(winnerId),
    },
    {
      type: 'gatekeeper_loser' as const,
      params: { teamId: loserId },
      execute: () => BadgeProcessingService.processGatekeeperBadge(loserId),
    },
    {
      type: 'chaos_agent_winner' as const,
      params: { teamId: winnerId },
      execute: () => BadgeProcessingService.processChaosAgentBadge(winnerId),
    },
    {
      type: 'chaos_agent_loser' as const,
      params: { teamId: loserId },
      execute: () => BadgeProcessingService.processChaosAgentBadge(loserId),
    },
    {
      type: 'bully_winner' as const,
      params: { teamId: winnerId },
      execute: () => BadgeProcessingService.processBullyBadge(winnerId),
    },
    {
      type: 'bully_loser' as const,
      params: { teamId: loserId },
      execute: () => BadgeProcessingService.processBullyBadge(loserId),
    },
  ];

  // Process each badge operation independently
  for (const operation of badgeOperations) {
    try {
      const result = await operation.execute();
      badgeLog(`${operation.type} badge processing completed:`, result);
    } catch (badgeError) {
      warnLog(`${operation.type} badge processing failed:`, badgeError);

      // Queue the failed operation for retry and admin notification
      FailedBadgeOperationsService.queueFailedOperation(
        operation.type,
        operation.params,
        badgeError instanceof Error ? badgeError : new Error(String(badgeError)),
        matchId
      );
    }
  }

  return {
    data,
    team1_id,
    team2_id,
    team1Win,
  };
};
