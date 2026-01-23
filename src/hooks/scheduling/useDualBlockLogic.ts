import { useState } from 'react';

import { DualBlockConfig, PairedTimeBlockTeamsMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { balanceTeamsBetweenBlocks } from '@/utils/autoSchedule/dualBlock';

/**
 * Hook for managing dual block team balancing logic.
 * Handles pairing blocks and ensuring even team counts between primary and secondary blocks.
 */
export const useDualBlockLogic = () => {
  const [pairedBlocks, setPairedBlocks] = useState<PairedTimeBlockTeamsMap>({});

  /**
   * Helper function to balance teams between blocks.
   * Ensures even team distribution for dual match scheduling.
   */
  const performTeamBalancing = (
    teamBlocks: TimeBlockTeamsMap,
    blockConfig: DualBlockConfig
  ): { balancedTeams: TimeBlockTeamsMap; unmatchedTeamIds: string[] } => {
    // Get primary and secondary block names from config or use defaults
    const primaryBlock = blockConfig.primaryBlock || 'Early';
    const secondaryBlock = blockConfig.secondaryBlock || 'Late';

    // Get teams from each block
    const primaryTeams = teamBlocks[primaryBlock] || [];
    const secondaryTeams = teamBlocks[secondaryBlock] || [];

    // Balance teams between blocks using the refactored function
    const { primaryAdjusted, secondaryAdjusted, unmatchedTeamIds } = balanceTeamsBetweenBlocks(
      primaryTeams,
      secondaryTeams,
      blockConfig
    );

    // Create updated team blocks map
    const balancedTeams = { ...teamBlocks };
    balancedTeams[primaryBlock] = primaryAdjusted;
    balancedTeams[secondaryBlock] = secondaryAdjusted;

    return { balancedTeams, unmatchedTeamIds };
  };

  return {
    pairedBlocks,
    setPairedBlocks,
    performTeamBalancing,
  };
};
