import { Team } from '@/types';
import { TeamPairing } from '@/types/autoSchedule';
import { debugLog, errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { withTiming } from '@/utils/performance';

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
import {
  splitsIntoTwoSlots,
  usesOnlyAllowedEdges,
  validatePairings,
  validatePairingsWithDetails,
} from './validation';

/**
 * One run of the generator: Blossom rounds, relaxation, repair and the fallback.
 * With `maxCardinality` each round matches as many teams as it can before it looks at weight.
 */
async function generateOnce(
  teams: Team[],
  config: TeamPairingConfig,
  maxCardinality: boolean
): Promise<TeamPairing[]> {
  // Return empty array for insufficient teams
  if (teams.length < 2) return [];

  // Each team plays 2 matches. Two teams can meet only once, so a block of 2 gets 1.
  const targetMatchesPerTeam = Math.min(2, teams.length - 1);
  const expectedMatches = teams.length; // For N teams, we need N matches (each team gets 2)

  scheduleLog(`Starting Blossom algorithm for ${teams.length} teams`);
  debugLog(`Expected to generate ${expectedMatches} matches (${targetMatchesPerTeam} per team)`);

  try {
    return await withTiming(
      async () => {
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
        const round1Pairings = runBlossomMatching(teams, edges, 1, maxCardinality);

        // STEP 3: Filter edges and run Round 2
        const round2Edges = filterUsedEdges(edges, round1Pairings);
        const round2Pairings = runBlossomMatching(teams, round2Edges, 2, maxCardinality);

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

/**
 * Run the generator again with perfect matchings. Returns the list only when it resolves and
 * `isAcceptable` agrees. A retry that throws or is not acceptable returns null.
 */
async function retryWithPerfectMatchings(
  teams: Team[],
  config: TeamPairingConfig,
  isAcceptable: (pairings: TeamPairing[]) => boolean
): Promise<TeamPairing[] | null> {
  try {
    const retry = await generateOnce(teams, config, true);
    return isAcceptable(retry) ? retry : null;
  } catch {
    return null;
  }
}

/**
 * Generate team pairings using Edmonds' Blossom algorithm for optimal maximum weight matching
 * Enhanced with pre-validation, constraint relaxation, and repair mechanisms to ensure
 * every team gets exactly 2 matches.
 *
 * A round that picks the heaviest matching can leave a team out and leave the other round
 * without a partner for it. For an even block of 4 or more teams the generator runs once more
 * with perfect matchings (every team paired in each round) in two cases:
 * - the first run throws, or
 * - the first run returns a list that Apply cannot split into the block's 2 slots
 *   (`splitsIntoTwoSlots`).
 * The second list is used only when no pairing in it breaks a rule (`usesOnlyAllowedEdges`),
 * and, for the second case, only when it splits too. Otherwise the first error is thrown
 * unchanged, or the first list is returned unchanged.
 */
export async function generatePairingsWithBlossom(
  teams: Team[],
  config: TeamPairingConfig
): Promise<TeamPairing[]> {
  // A perfect matching needs an even block of at least 4 teams. Everything else keeps the
  // first run exactly as it was.
  if (teams.length < 4 || teams.length % 2 !== 0) {
    return generateOnce(teams, config, false);
  }

  let baseline: TeamPairing[];
  try {
    baseline = await generateOnce(teams, config, config.preferFullRounds === true);
  } catch (baselineError) {
    const retry = await retryWithPerfectMatchings(teams, config, usesOnlyAllowedEdges);
    if (!retry) throw baselineError;
    warnLog(`Block of ${teams.length} teams: used perfect matchings after the first run failed`);
    return retry;
  }

  if (splitsIntoTwoSlots(baseline)) return baseline;

  const splittableRetry = await retryWithPerfectMatchings(
    teams,
    config,
    (pairings) => usesOnlyAllowedEdges(pairings) && splitsIntoTwoSlots(pairings)
  );
  if (splittableRetry) {
    warnLog(`Block of ${teams.length} teams: replaced a list that cannot be split into 2 slots`);
    return splittableRetry;
  }
  warnLog(
    `Block of ${teams.length} teams: pairings cannot be split into 2 slots and no rule-following alternative was found`
  );
  return baseline;
}
