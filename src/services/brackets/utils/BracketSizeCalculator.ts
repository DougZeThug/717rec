
/**
 * Utility class for calculating bracket sizes and related information
 */
export class BracketSizeCalculator {
  /**
   * Calculate the appropriate bracket size for tournament play
   * @param teamCount Number of teams in the bracket
   * @returns The bracket size to use (prefers smaller brackets with play-ins)
   */
  static calculateBracketSize(teamCount: number): number {
    // For 9+ teams, use next lower power of 2 with play-ins
    // This reduces the number of byes and creates more actual matches
    if (teamCount <= 8) {
      return 8;
    } else if (teamCount <= 16) {
      return 8; // Use 8-team bracket for 9-16 teams with play-ins
    } else if (teamCount <= 32) {
      return 16; // Use 16-team bracket for 17-32 teams with play-ins
    } else {
      // For larger tournaments, use traditional next power of 2
      let power = 1;
      while (power < teamCount) {
        power *= 2;
      }
      return power;
    }
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
