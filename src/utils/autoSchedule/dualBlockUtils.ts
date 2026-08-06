import { DualBlockConfig, PairedTimeBlockTeamsMap, TimeBlockTeamsMap } from '@/types/autoSchedule';

/**
 * Default block names if not specified in config
 */
const DEFAULT_BLOCKS = {
  PRIMARY: 'Early',
  SECONDARY: 'Late',
};

/**
 * Create time block pairs from individual time blocks
 */
export function createTimeBlockPairs(
  timeBlockTeams: TimeBlockTeamsMap,
  config: DualBlockConfig
): PairedTimeBlockTeamsMap {
  const { primaryBlock = DEFAULT_BLOCKS.PRIMARY, secondaryBlock = DEFAULT_BLOCKS.SECONDARY } =
    config;

  // Get teams from blocks or empty arrays if not found
  const primaryTeams = timeBlockTeams[primaryBlock] || [];
  const secondaryTeams = timeBlockTeams[secondaryBlock] || [];

  // Create a single pair entry with both blocks
  const pairKey = `${primaryBlock}-${secondaryBlock}`;
  const pairedBlocks: PairedTimeBlockTeamsMap = {
    [pairKey]: {
      primaryBlock,
      secondaryBlock,
      primaryTeams,
      secondaryTeams,
    },
  };

  return pairedBlocks;
}
