import { scheduleLog } from '@/utils/logger';

import { canPlay, getTier } from './constraints';
import { analyzeGreedyFeasibility } from './feasibility';
import { pairKey } from './pairKey';
import { scheduleEven } from './scheduleEven';
import { scheduleOdd } from './scheduleOdd';
import {
  DEFAULT_BYE_STRATEGY,
  GreedySchedulerInput,
  GreedySchedulerResult,
  MAX_TIER_GAP,
  RelaxationLevel,
  ScheduledMatch,
} from './types';

export { pairKey } from './pairKey';
export type {
  GreedySchedulerInput,
  GreedySchedulerResult,
  RelaxationLevel,
  ScheduledMatch,
} from './types';

/**
 * Main greedy scheduler function
 */
export function generateScheduleGreedy(input: GreedySchedulerInput): ScheduledMatch[] {
  const result = generateScheduleGreedyWithTracking(input);
  return result.matches;
}

/**
 * Main greedy scheduler function with pair tracking
 * Use this when scheduling multiple blocks with double header teams
 *
 * Enhanced with:
 * - Pre-validation to detect constraint issues
 * - Progressive constraint relaxation
 * - Repair pass for unmatched teams
 */
export function generateScheduleGreedyWithTracking(
  input: GreedySchedulerInput
): GreedySchedulerResult {
  const { teams, historyPairs, slots, thirdSlot, config, forbiddenPairs } = input;
  const maxTierGap = config?.maxTierGap ?? MAX_TIER_GAP;
  const byeStrategy = config?.byeStrategy ?? DEFAULT_BYE_STRATEGY;

  // Build played set from season history
  const playedSet = new Set<string>();
  for (const [idA, idB] of historyPairs) {
    playedSet.add(pairKey(idA, idB));
  }

  // Sort teams by constraint pressure (fewest valid opponents first)
  // This ensures most constrained teams get paired first
  const baseTonightPairs = new Set<string>(forbiddenPairs || []);
  const sortedTeams = [...teams].sort((a, b) => {
    // Count valid opponents for each team
    const aOpponents = teams.filter(
      (t) => t.id !== a.id && canPlay(a, t, playedSet, baseTonightPairs, maxTierGap, 0)
    ).length;
    const bOpponents = teams.filter(
      (t) => t.id !== b.id && canPlay(b, t, playedSet, baseTonightPairs, maxTierGap, 0)
    ).length;

    // Most constrained (fewest opponents) first
    if (aOpponents !== bOpponents) return aOpponents - bOpponents;

    // Fall back to tier, then name for stability
    const tierA = getTier(a);
    const tierB = getTier(b);
    if (tierA !== tierB) return tierA - tierB;
    return a.name.localeCompare(b.name);
  });

  const [slot1, slot2] = slots;
  const isOdd = teams.length % 2 === 1;

  // Pre-validation: check if scheduling is feasible with current constraints
  const feasibility = analyzeGreedyFeasibility(
    sortedTeams,
    playedSet,
    baseTonightPairs,
    maxTierGap
  );
  const relaxationLevel: RelaxationLevel = feasibility.recommendedLevel;

  if (!feasibility.isFeasible) {
    const relaxationNames: Record<RelaxationLevel, string> = {
      0: 'none',
      1: 'allow cross-tier matches',
      2: 'allow season rematches',
      3: 'full relaxation',
    };
    scheduleLog(
      `Constraint pre-check: ${feasibility.atRiskTeams.length} teams at risk. ` +
        `Applying relaxation level ${relaxationLevel} (${relaxationNames[relaxationLevel]})`
    );
  }

  // Track diagnostics
  const diagnostics: GreedySchedulerResult['diagnostics'] = {
    relaxationApplied: relaxationLevel,
    constraintsRelaxed: [],
    repairAttempted: false,
    rematchesRepaired: 0,
    perTeamRematchAllowances: [],
  };
  // Per-team rematch allowances accumulated across slot generations.
  const perTeamRematchAllowed = new Set<string>();

  if (relaxationLevel >= 1) diagnostics.constraintsRelaxed.push('tier_constraints');
  if (relaxationLevel >= 2) diagnostics.constraintsRelaxed.push('season_rematches');

  // Initialize tonightPairs with forbidden pairs (from other blocks)
  const tonightPairs = new Set<string>(forbiddenPairs || []);
  const newPairs = new Set<string>();
  const teamMatchCounts = new Map<string, number>();

  if (!isOdd) {
    const { matches } = scheduleEven({
      teams,
      sortedTeams,
      slot1,
      slot2,
      playedSet,
      tonightPairs,
      newPairs,
      teamMatchCounts,
      forbiddenPairs,
      maxTierGap,
      relaxationLevel,
      perTeamRematchAllowed,
      diagnostics,
    });
    diagnostics.perTeamRematchAllowances = Array.from(perTeamRematchAllowed);
    return { matches, newPairs, diagnostics };
  } else {
    const matches = scheduleOdd({
      teams,
      sortedTeams,
      slot1,
      slot2,
      thirdSlot,
      playedSet,
      tonightPairs,
      newPairs,
      teamMatchCounts,
      maxTierGap,
      byeStrategy,
      relaxationLevel,
      perTeamRematchAllowed,
      diagnostics,
    });
    diagnostics.perTeamRematchAllowances = Array.from(perTeamRematchAllowed);
    return { matches, newPairs, diagnostics };
  }
}
