
import { PlayoffMatchType } from "@/utils/playoffs/playoffTypes";

/**
 * Type adapter for converting between different match type systems
 */
export class MatchTypeAdapter {
  /**
   * Convert PlayoffMatchType to standard MatchType
   * @param matchType The playoff match type to convert
   * @returns Standard match type
   */
  static toStandardMatchType(matchType: PlayoffMatchType): PlayoffMatchType {
    if (matchType === "play-in-2") {
      return "play-in";
    }
    return matchType;
  }

  /**
   * Convert MatchType to PlayoffMatchType
   * @param matchType The standard match type to convert
   * @returns Playoff match type
   */
  static toPlayoffMatchType(matchType: PlayoffMatchType): PlayoffMatchType {
    return matchType;
  }

  /**
   * Check if match type is compatible between the two systems
   * @param matchType The match type to check
   * @returns True if the match type is valid in both systems
   */
  static isCompatibleMatchType(matchType: string): boolean {
    const standardTypes: PlayoffMatchType[] = ["winners", "losers", "finals", "play-in"];
    return standardTypes.includes(matchType as PlayoffMatchType);
  }
  
  /**
   * Check if a value is a PlayoffMatch
   * @param match The match to check
   * @returns True if the match is a PlayoffMatch
   */
  static isPlayoffMatch(match: any): boolean {
    return match && 
      typeof match === 'object' && 
      'team1Score' in match && 
      'team2Score' in match;
  }
  
  /**
   * Check if a PlayoffMatchType can be safely converted to MatchType
   * @param matchType The match type to check
   * @returns Whether the conversion is safe
   */
  static isSafeMatchTypeConversion(matchType: PlayoffMatchType): boolean {
    return matchType !== "play-in-2";
  }
}
