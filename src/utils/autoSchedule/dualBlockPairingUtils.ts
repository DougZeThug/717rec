// This file is maintained for backward compatibility
// New code should import from '@/utils/autoSchedule/dualBlock' directly

// Re-export everything from the new modular implementation
export {
  balanceTeamsBetweenBlocks,
  calculateDualBlockMetrics,
  findTeamsWithSameOpponent,
  generateDualBlockPairings,
} from './dualBlock';
