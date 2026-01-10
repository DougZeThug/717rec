import { nanoid } from 'nanoid';

import { BracketMatch } from './types';

/**
 * Handles generation of finals matches in a tournament
 */
export class FinalsGenerator {
  /**
   * Create the finals match
   * @param bracketId ID of the bracket
   * @param matchMap Storage for match references by position
   * @returns The finals match
   */
  static createFinalsMatch(
    bracketId: string,
    matchMap: Record<string, BracketMatch>
  ): BracketMatch {
    const finalsMatch: BracketMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: 'finals',
      team1Id: null, // Winner of winners bracket
      team2Id: null, // Winner of losers bracket
      team1Seed: null,
      team2Seed: null,
      nextWinMatchId: null, // Always null for finals
      nextLoseMatchId: null, // Always null for finals
      winnerId: null,
      bracket_id: bracketId,
    };

    matchMap['finals-1'] = finalsMatch;

    return finalsMatch;
  }
}
