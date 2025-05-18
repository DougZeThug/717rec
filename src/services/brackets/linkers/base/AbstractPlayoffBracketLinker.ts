
import { PlayoffMatch, BracketMatch, MatchType } from "../../types";
import { BaseBracketLinker } from "../BaseBracketLinker";

/**
 * Abstract base class for playoff bracket linkers
 * Provides the foundation for different playoff bracket linking strategies
 */
export abstract class AbstractPlayoffBracketLinker extends BaseBracketLinker<PlayoffMatch> {
  /**
   * Create a new AbstractPlayoffBracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, PlayoffMatch> = {}
  ) {
    super(bracketId, matchMap);
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches All matches in the bracket
   */
  abstract connectBracketSections(matches: PlayoffMatch[]): void;
  
  /**
   * Link play-in matches to the main bracket
   * @param matches All bracket matches
   */
  abstract linkPlayInMatches(matches: PlayoffMatch[]): void;
  
  /**
   * Link winners bracket matches to both next winners round and losers bracket
   * @param matches All bracket matches
   * @param rounds Number of rounds in winners bracket
   */
  abstract linkWinnersBracket(matches: PlayoffMatch[], rounds: number): void;
  
  /**
   * Link losers bracket matches to next rounds
   * @param matches All bracket matches
   * @param rounds Number of rounds in winners bracket
   */
  abstract linkLosersBracket(matches: PlayoffMatch[], rounds: number): void;
  
  /**
   * Adapt a PlayoffMatch to satisfy BaseBracketMatch constraints
   * @param match The match to adapt
   * @returns The match with required properties ensured
   */
  protected adaptMatchToBaseBracketMatch(match: PlayoffMatch): BracketMatch {
    return {
      ...match,
      team1Id: match.team1Id || null,
      team2Id: match.team2Id || null,
      team1Seed: match.team1Seed || null,
      team2Seed: match.team2Seed || null,
      nextWinMatchId: match.nextWinMatchId || null,
      nextLoseMatchId: match.nextLoseMatchId || null,
      bracket_id: match.bracket_id
    } as BracketMatch;
  }
}
