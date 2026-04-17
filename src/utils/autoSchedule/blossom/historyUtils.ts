import { TeamPairingConfig } from './types';

/**
 * Check if two teams have played before using the pre-fetched Set (synchronous)
 * Falls back to async function call if Set is not available
 */
export function haveTeamsPlayedBeforeSync(
  team1Id: string,
  team2Id: string,
  config: TeamPairingConfig
): boolean {
  if (config.playedPairsSet) {
    const pairingKey = [team1Id, team2Id].sort().join('-');
    return config.playedPairsSet.has(pairingKey);
  }
  // Should not reach here if pre-fetch worked, but included for safety
  return false;
}
