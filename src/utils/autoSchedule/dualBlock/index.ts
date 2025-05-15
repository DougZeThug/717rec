
/**
 * Dual Block Pairing Utilities
 * Functions for generating and analyzing match pairings across multiple time blocks
 */

// Re-export all dual block utilities
export { calculateDualBlockMetrics } from './metricsUtils';
export { validateDualBlockSchedule } from './validationUtils';
export { calculateOverallQualityScore } from './qualityScoreUtils';
export { generateDualBlockPairings } from './pairingGenerator';
export { findTeamsWithSameOpponent } from './opponentUtils';
export { balanceTeamsBetweenBlocks } from './teamBalancer';

// Types
export type { DualMatchMetrics, TeamMatchCount, DualBlockValidationResult } from './types';
export type { TeamBalanceResult } from './teamBalancer';
