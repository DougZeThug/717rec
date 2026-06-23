import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog, errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { withTiming } from '@/utils/performance';

import { fetchSeasonHistoryForTeams } from '../matchHistoryService';
import { analyzeGraphFeasibility } from './feasibility';
import {
  buildWeightedGraph,
  buildWeightedGraphWithRelaxation,
  filterUsedEdges,
} from './graphBuilder';
import { countTeamMatches, runBlossomMatching } from './matchingRunner';
import { findGuaranteedSolution, repairUnmatchedTeams } from './repair';
import { logFinalStatistics } from './statistics';
import { Edge, RelaxationLevel, TeamPairingConfig } from './types';
import { validatePairings, validatePairingsWithDetails } from './validation';

/**
 * Generate team pairings using Edmonds' Blossom algorithm for optimal maximum weight matching
 * Enhanced with pre-validation, constraint relaxation, and repair mechanisms to ensure
 * every team gets exactly 2 matches.
 */
export async function generatePairingsWithBlossom(
  teams: Team[],
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];

  const targetMatchesPerTeam = 2;
  const expectedMatches = teams.length; // For N teams, we need N matches (each team gets 2)

  scheduleLog(`Starting Blossom algorithm for ${teams.length} teams`);
  debugLog(`Expected to generate ${expectedMatches} matches (${targetMatchesPerTeam} per team)`);

  try {
    return await withTiming(
      async () => {
        // Pre-fetch match history once if not provided (avoids N+1 queries)
        if (!config.playedPairsSet && config.avoidRematches) {
          scheduleLog('Pre-fetching season history for all teams...');
          const teamIds = teams.map((team) => team.id);
          const historyPairs = await fetchSeasonHistoryForTeams(teamIds);

          // Build Set for O(1) lookup
          config.playedPairsSet = new Set<string>();
          historyPairs.forEach(([team1Id, team2Id]) => {
            const pairingKey = [team1Id, team2Id].sort().join('-');
            config.playedPairsSet!.add(pairingKey);
          });

          scheduleLog(`Loaded ${historyPairs.length} historical match pairs into memory`);
        }

        // STEP 1: Analyze graph feasibility before running Blossom
        const feasibilityResult = analyzeGraphFeasibility(teams, config, 0);

        let edges: Edge[];
        let relaxationLevel: RelaxationLevel = 0;

        if (!feasibilityResult.isFeasible) {
          // Some teams don't have enough valid edges - apply targeted relaxation
          relaxationLevel = feasibilityResult.recommendedRelaxation;
          const atRiskTeamIds = new Set(feasibilityResult.atRiskTeams.map((t) => t.teamId));

          scheduleLog(
            `Applying relaxation level ${relaxationLevel} for ${atRiskTeamIds.size} at-risk teams`
          );

          // Build graph with relaxed constraints for at-risk teams
          edges = buildWeightedGraphWithRelaxation(teams, config, atRiskTeamIds, relaxationLevel);
        } else {
          // Build standard weighted graph
          edges = buildWeightedGraph(teams, config);
        }

        debugLog(`Built graph with ${edges.length} valid edges`);

        // STEP 2: Run Blossom algorithm for Round 1
        const round1Pairings = runBlossomMatching(teams, edges, 1);

        // STEP 3: Filter edges and run Round 2
        const round2Edges = filterUsedEdges(edges, round1Pairings);
        const round2Pairings = runBlossomMatching(teams, round2Edges, 2);

        // Combine results
        let allPairings = [...round1Pairings, ...round2Pairings];

        // STEP 4: Check if any teams are missing matches and repair
        const teamMatchCounts = countTeamMatches(teams, allPairings);
        const teamsNeedingRepair = teams.filter(
          (t) => (teamMatchCounts.get(t.id) || 0) < targetMatchesPerTeam
        );

        if (teamsNeedingRepair.length > 0) {
          debugLog(`${teamsNeedingRepair.length} teams need repair after Blossom rounds`);

          // If we haven't relaxed yet, try with relaxation first
          if (relaxationLevel === 0) {
            // Re-analyze with relaxation to get more edges
            const relaxedFeasibility = analyzeGraphFeasibility(teams, config, 1);
            if (relaxedFeasibility.recommendedRelaxation > 0) {
              relaxationLevel = relaxedFeasibility.recommendedRelaxation;
              const needsRelaxation = new Set(teamsNeedingRepair.map((t) => t.id));

              // Rebuild edges with relaxation for teams that need it
              edges = buildWeightedGraphWithRelaxation(
                teams,
                config,
                needsRelaxation,
                relaxationLevel
              );
              debugLog(
                `Rebuilt graph with ${edges.length} edges (relaxation level ${relaxationLevel})`
              );
            }
          }

          // Repair unmatched teams using greedy matching
          allPairings = repairUnmatchedTeams(teams, allPairings, edges, targetMatchesPerTeam);
        }

        // STEP 5: Final validation with enhanced feedback
        try {
          validatePairings(teams, allPairings, targetMatchesPerTeam);
        } catch (_validationError) {
          // If validation fails, try one more repair pass with full relaxation
          warnLog('Validation failed, attempting final repair with full relaxation...');

          const fullRelaxationEdges = buildWeightedGraphWithRelaxation(
            teams,
            config,
            new Set(teams.map((t) => t.id)),
            3
          );

          allPairings = repairUnmatchedTeams(
            teams,
            allPairings,
            fullRelaxationEdges,
            targetMatchesPerTeam
          );

          // Try validation again - this time let it throw if it fails
          validatePairingsWithDetails(teams, allPairings, targetMatchesPerTeam, config);
        }

        // Log final statistics
        logFinalStatistics(teams, allPairings, targetMatchesPerTeam);

        return allPairings;
      },
      debugLog,
      'Blossom algorithm'
    );
  } catch (error) {
    errorLog('Blossom algorithm failed:', error);

    // Fallback to relaxed solution with guaranteed matching
    warnLog('Falling back to guaranteed matching solution...');
    const fallbackPairings = findGuaranteedSolution(teams, config, targetMatchesPerTeam);
    // Validate the fallback before returning so partial results surface as a
    // generation failure instead of silently producing teams with < target matches.
    validatePairingsWithDetails(teams, fallbackPairings, targetMatchesPerTeam, config);
    return fallbackPairings;
  }
}
