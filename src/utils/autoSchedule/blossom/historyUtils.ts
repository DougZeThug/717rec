import { TeamPairingConfig } from './types';

/**
 * Check if two teams have played before using the pre-fetched Set (synchronous)
 * Returns false when the config has no played-pairs set (no lookup is made).
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
  // The Standard scheduler always passes a set. No set means no history is known: no rematch is flagged.
  return false;
}
