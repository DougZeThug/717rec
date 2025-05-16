
/**
 * Utility class for calculating bracket sizes and related information
 */
export class BracketSizeCalculator {
  /**
   * Calculate the next power of 2 for bracket size
   * @param teamCount Number of teams in the bracket
   * @returns The next power of 2 that can accommodate all teams
   */
  static calculateBracketSize(teamCount: number): number {
    let power = 1;
    while (power < teamCount) {
      power *= 2;
    }
    return power;
  }

  /**
   * Calculate the number of rounds needed for a bracket
   * @param teamCount Number of teams in the bracket
   * @returns Number of rounds needed
   */
  static calculateRoundCount(teamCount: number): number {
    return Math.ceil(Math.log2(teamCount));
  }

  /**
   * Calculate how many play-in matches are needed
   * @param teamCount Total number of teams
   * @param bracketSize Target bracket size (power of 2)
   * @returns Number of play-in matches needed
   */
  static calculatePlayInMatchCount(teamCount: number, bracketSize: number): number {
    return teamCount - (bracketSize / 2);
  }
}
