// This file is maintained for backward compatibility
// New code should import from '@/utils/autoSchedule/dualBlock' directly

import { Team } from '@/types';
import {
  DualBlockConfig,
  PairingResult,
  TeamPairing,
  TeamPairingMap,
  TimeBlockTeamsMap,
} from '@/types/autoSchedule';
import { NotificationCallback } from '@/types/dualBlock';

// Re-export everything from the new modular implementation
export {
  balanceTeamsBetweenBlocks,
  calculateDualBlockMetrics,
  findTeamsWithSameOpponent,
  generateDualBlockPairings,
} from './dualBlock';
