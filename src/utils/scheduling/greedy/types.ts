import { Team } from '@/types';

/**
 * Constraint relaxation levels for progressive fallback
 * - 0: All constraints enforced (default)
 * - 1: Allow season rematches
 * - 2: Allow tier gap > 1
 * - 3: Full relaxation (emergency - only blocks session rematches)
 */
export type RelaxationLevel = 0 | 1 | 2 | 3;

export interface GreedySchedulerInput {
  teams: Team[];
  historyPairs: Array<[string, string]>; // Season history
  slots: [string, string]; // Base slots (e.g., ["8:30", "9:00"])
  thirdSlot?: string; // Optional S3 for odd-team nights (e.g., "9:30")
  config?: {
    maxTierGap?: number; // Default: 1 (blocks T1 vs T3)
    byeStrategy?: 'last' | 'fewestPartners'; // Default: 'last'
  };
  // Pairs already created in other blocks (for double header teams)
  // These pairs will be forbidden to prevent duplicate opponents across blocks
  forbiddenPairs?: Set<string>;
}

export interface ScheduledMatch {
  slot: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  divisionA: string;
  divisionB: string;
  tierA: number;
  tierB: number;
}

export interface GreedySchedulerResult {
  matches: ScheduledMatch[];
  // New pairs created in this call (for tracking across multiple blocks)
  newPairs: Set<string>;
  // Diagnostic info about constraint relaxation applied
  diagnostics: {
    relaxationApplied: RelaxationLevel;
    constraintsRelaxed: string[];
    repairAttempted: boolean;
    // Number of season rematches eliminated by the rematchRepairPass 2-swap.
    rematchesRepaired: number;
    // Team IDs that were granted per-team rematch permission as last resort.
    perTeamRematchAllowances: string[];
  };
}

export const MAX_TIER_GAP = 1; // Block tier differences > 1
export const DEFAULT_BYE_STRATEGY: 'last' | 'fewestPartners' = 'last';
