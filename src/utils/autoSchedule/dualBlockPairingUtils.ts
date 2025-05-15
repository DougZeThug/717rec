
// This file is maintained for backward compatibility
// New code should import from '@/utils/autoSchedule/dualBlock' directly

import { DualBlockConfig, PairingResult, TeamPairing, TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { Team } from '@/types';
import { NotificationCallback } from '@/types/dualBlock';

// Re-export everything from the new modular implementation
export { 
  calculateDualBlockMetrics,
  generateDualBlockPairings,
  findTeamsWithSameOpponent
} from './dualBlock';

// Re-export balanceTeamsBetweenBlocks from dualBlockUtils to avoid duplication
export { balanceTeamsBetweenBlocks } from './dualBlockUtils';
