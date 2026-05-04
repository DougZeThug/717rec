import { Team } from '@/types';
import { warnLog } from '@/utils/logger';

import { haveTeamsPlayedBeforeSync } from './historyUtils';
import { getTierFromDivision, isBothRecreational, isExtremeTierDifference } from './tierUtils';
import {
  GraphFeasibilityResult,
  RelaxationLevel,
  TeamEdgeAnalysis,
  TeamPairingConfig,
} from './types';

/**
 * Analyze graph feasibility to determine if a 2-match solution is possible
 * This pre-validates the graph before running Blossom to detect constraint issues early
 */
export function analyzeGraphFeasibility(
  teams: Team[],
  config: TeamPairingConfig,
  relaxationLevel: RelaxationLevel = 0
): GraphFeasibilityResult {
  const analysis = new Map<string, TeamEdgeAnalysis>();
  const targetMatchesPerTeam = 2;

  // Initialize analysis for each team
  teams.forEach((team) => {
    analysis.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      tier: getTierFromDivision(team.divisionName),
      totalEdges: 0,
      edgesBlockedByTier: 0,
      edgesBlockedByRematch: 0,
      availableEdges: 0,
      isAtRisk: false,
      uniqueOpponentIds: [],
    });
  });

  // Count edges for each team
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const team1 = teams[i];
      const team2 = teams[j];
      const team1Analysis = analysis.get(team1.id)!;
      const team2Analysis = analysis.get(team2.id)!;

      team1Analysis.totalEdges++;
      team2Analysis.totalEdges++;

      // Check tier constraint (with relaxation support)
      const tierBlocked = relaxationLevel < 2 && isExtremeTierDifference(team1, team2);

      if (tierBlocked) {
        team1Analysis.edgesBlockedByTier++;
        team2Analysis.edgesBlockedByTier++;
        continue;
      }

      // Check rematch constraint (with relaxation support)
      // Always check playedPairsSet — covers both season history (when avoidRematches=true)
      // and same-session rematches (always added by standardPairing across blocks)
      const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
      const rematchBlocked =
        relaxationLevel < 1 && hasPlayedBefore && !isBothRecreational(team1, team2);

      if (rematchBlocked) {
        team1Analysis.edgesBlockedByRematch++;
        team2Analysis.edgesBlockedByRematch++;
        continue;
      }

      // Edge is available
      team1Analysis.availableEdges++;
      team2Analysis.availableEdges++;
      team1Analysis.uniqueOpponentIds.push(team2.id);
      team2Analysis.uniqueOpponentIds.push(team1.id);
    }
  }

  // Identify at-risk teams (fewer than targetMatchesPerTeam available edges)
  const atRiskTeams: TeamEdgeAnalysis[] = [];
  analysis.forEach((teamAnalysis) => {
    teamAnalysis.isAtRisk = teamAnalysis.availableEdges < targetMatchesPerTeam;
    if (teamAnalysis.isAtRisk) {
      atRiskTeams.push(teamAnalysis);
    }
  });

  // Determine recommended relaxation level
  let recommendedRelaxation: RelaxationLevel = 0;
  if (atRiskTeams.length > 0) {
    // Check if relaxing rematches would help
    const rematchBlockedTeams = atRiskTeams.filter((t) => t.edgesBlockedByRematch > 0);
    if (rematchBlockedTeams.length > 0) {
      recommendedRelaxation = 1;
    }

    // Check if we also need to relax tier constraints
    const stillAtRiskAfterRematch = atRiskTeams.filter(
      (t) => t.availableEdges + t.edgesBlockedByRematch < targetMatchesPerTeam
    );
    if (stillAtRiskAfterRematch.length > 0) {
      const tierBlockedTeams = stillAtRiskAfterRematch.filter((t) => t.edgesBlockedByTier > 0);
      if (tierBlockedTeams.length > 0) {
        recommendedRelaxation = 2;
      }
    }

    // If still not enough, need full relaxation
    const stillAtRiskAfterBoth = atRiskTeams.filter(
      (t) =>
        t.availableEdges + t.edgesBlockedByRematch + t.edgesBlockedByTier < targetMatchesPerTeam
    );
    if (stillAtRiskAfterBoth.length > 0) {
      recommendedRelaxation = 3;
    }
  }

  // Log analysis results
  if (atRiskTeams.length > 0) {
    warnLog(`Graph feasibility analysis found ${atRiskTeams.length} at-risk teams:`);
    atRiskTeams.forEach((t) => {
      warnLog(
        `  ${t.teamName} (T${t.tier}): ${t.availableEdges} edges available ` +
          `(${t.edgesBlockedByTier} blocked by tier, ${t.edgesBlockedByRematch} blocked by rematch)`
      );
    });
    warnLog(`Recommended relaxation level: ${recommendedRelaxation}`);
  }

  return {
    isFeasible: atRiskTeams.length === 0,
    atRiskTeams,
    recommendedRelaxation,
    analysis,
  };
}
