/**
 * Dual Block Pairing Utilities
 * Functions for generating and analyzing match pairings across multiple time blocks
 */

// Re-export all dual block utilities
export { calculateDualBlockMetrics } from './metricsUtils';
export { findTeamsWithSameOpponent } from './opponentUtils';
export { generateDualBlockPairings } from './pairingGenerator';
export { calculateOverallQualityScore } from './qualityScoreUtils';
export { balanceTeamsBetweenBlocks } from './teamBalancer';
export { validateDualBlockSchedule } from './validationUtils';

// Types
export type { TeamBalanceResult } from './teamBalancer';
export type { DualBlockValidationResult, DualMatchMetrics, TeamMatchCount } from './types';
