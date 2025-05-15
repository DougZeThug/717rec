
/**
 * Dual Block Pairing Utilities
 * Functions for generating and analyzing match pairings across multiple time blocks
 */

// Re-export all dual block utilities
export { calculateDualBlockMetrics } from './metricsUtils';
export { generateDualBlockPairings } from './pairingGenerator';
export { findTeamsWithSameOpponent } from './opponentUtils';
// Note: We use balanceTeamsBetweenBlocks from dualBlockUtils instead of duplicating

// Types
export type { DualMatchMetrics } from './types';
