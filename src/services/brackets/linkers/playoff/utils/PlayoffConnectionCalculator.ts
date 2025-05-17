
/**
 * Utility class for calculating connections between different bracket sections
 */
export class PlayoffConnectionCalculator {
  /**
   * Calculate which round in loser bracket a team from winners should go to
   * @param winnerRound The round in winners bracket
   * @returns The corresponding losers bracket round
   */
  static calculateLoserDestinationRound(winnerRound: number): number {
    return winnerRound;
  }
  
  /**
   * Calculate the position in losers bracket for a team from winners bracket
   * @param position Position in winners bracket
   * @param round Round in winners bracket
   * @returns The corresponding position in losers bracket
   */
  static calculateLoserDestinationPosition(position: number, round: number): number {
    // The position calculation depends on the round and the original position
    if (round === 1) {
      // First round losers go into first round of losers bracket
      return position;
    } else {
      // Later round losers enter at specific positions based on bracket structure
      return Math.ceil(position / 2);
    }
  }
  
  /**
   * Calculate the position in the next round based on current position
   * @param currentPosition Current position in the round
   * @returns Position in the next round
   */
  static calculateNextRoundPosition(currentPosition: number): number {
    return Math.ceil(currentPosition / 2);
  }
}
