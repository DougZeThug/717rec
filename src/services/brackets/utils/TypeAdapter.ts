
import { MatchType, PlayoffMatchType } from "../types";

/**
 * Type adapter for converting between different match type systems
 */
export class MatchTypeAdapter {
  /**
   * Convert PlayoffMatchType to standard MatchType
   * @param matchType The playoff match type to convert
   * @returns Standard match type
   */
  static toStandardMatchType(matchType: PlayoffMatchType): MatchType {
    if (matchType === "play-in-2") {
      return "play-in";
    }
    return matchType as MatchType;
  }

  /**
   * Convert MatchType to PlayoffMatchType
   * @param matchType The standard match type to convert
   * @returns Playoff match type
   */
  static toPlayoffMatchType(matchType: MatchType): PlayoffMatchType {
    return matchType as PlayoffMatchType;
  }

  /**
   * Check if match type is compatible between the two systems
   * @param matchType The match type to check
   * @returns True if the match type is valid in both systems
   */
  static isCompatibleMatchType(matchType: string): boolean {
    const standardTypes: MatchType[] = ["winners", "losers", "finals", "play-in"];
    return standardTypes.includes(matchType as MatchType);
  }
}
