
import { nanoid } from "nanoid";
import { BracketMatch, MatchType, PlayoffMatch } from "../../types";
import { IFinalsGenerator } from "../types/MatchLinkingTypes";

/**
 * Base class for finals generation functionality
 */
export class FinalsGenerator<TMatch extends BracketMatch> implements IFinalsGenerator<TMatch> {
  protected bracketId: string;
  protected matchMap: Record<string, TMatch>;
  
  /**
   * Create a new FinalsGenerator
   * @param bracketId ID of the bracket
   * @param matchMap Map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, TMatch>
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Generate the finals match(es)
   * @param matches Array of all matches
   * @returns Updated array of matches with finals added
   */
  generateFinals(matches: TMatch[]): TMatch[] {
    const finalsMatch = this.createFinalsMatch();
    this.matchMap['finals-1'] = finalsMatch;
    matches.push(finalsMatch);
    
    return matches;
  }
  
  /**
   * Create a reset match for the grand finals
   * @returns Reset match
   */
  createResetMatch(): TMatch {
    const resetMatch = this.createFinalsMatch(2);
    this.matchMap['finals-2'] = resetMatch;
    return resetMatch;
  }
  
  /**
   * Create a finals match with specific round
   * @param round Round number (defaults to 1)
   * @returns Created finals match
   */
  protected createFinalsMatch(round: number = 1): TMatch {
    return {
      id: nanoid(),
      round,
      position: 1,
      matchType: "finals",
      team1Id: null,
      team2Id: null,
      team1Seed: null,
      team2Seed: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      winnerId: null,
      bracket_id: this.bracketId
    } as TMatch;
  }
}

/**
 * Finals generator specifically for playoff matches
 */
export class PlayoffFinalsGenerator extends FinalsGenerator<PlayoffMatch> {
  /**
   * Create a finals match with specific round
   * @param round Round number (defaults to 1)
   * @returns Created finals match
   */
  protected createFinalsMatch(round: number = 1): PlayoffMatch {
    return {
      id: nanoid(),
      round,
      position: 1,
      matchType: "finals",
      bracket_id: this.bracketId,
      team1Id: null,
      team2Id: null,
      team1Seed: null,
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      team1GameWins: null,
      team2GameWins: null,
      bestOf: 3,
      winnerId: null,
      loserId: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      status: "pending"
    };
  }
}
