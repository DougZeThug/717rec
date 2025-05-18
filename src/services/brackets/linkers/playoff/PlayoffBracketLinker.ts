import { PlayoffMatch, PlayoffMatchType } from "../../types";
import { MatchTypeAdapter } from "../../utils/TypeAdapter";
import { IBracketConnectionOperations, IMatchMapOperations } from "../interfaces/BracketLinkerInterfaces";
import { AbstractPlayoffBracketLinker } from "../base/AbstractPlayoffBracketLinker";
import { PlayoffFinalsGenerator } from "./utils/PlayoffFinalsGenerator";
import { PlayInLinker } from "./utils/PlayInLinker";
import { WinnersBracketLinker } from "./utils/WinnersBracketLinker";
import { LosersBracketLinker } from "./utils/LosersBracketLinker";

/**
 * Specialized linker for playoff brackets that handles the complexities
 * of double elimination brackets with true finals format
 */
export class PlayoffBracketLinker 
  extends AbstractPlayoffBracketLinker
  implements IMatchMapOperations<PlayoffMatch>, IBracketConnectionOperations<PlayoffMatch> {
  
  private roundLabels: Record<string, string>;
  private finalsGenerator: PlayoffFinalsGenerator;
  
  /**
   * Create a new PlayoffBracketLinker instance
   * @param bracketId - Unique identifier for the bracket
   * @param matchMap - Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, PlayoffMatch> = {}
  ) {
    super(bracketId, matchMap);
    this.roundLabels = this.generateRoundLabels();
    this.finalsGenerator = new PlayoffFinalsGenerator(bracketId, matchMap);
  }
  
  /**
   * Generate round labels for different bracket sections
   * @returns Record of round labels by section and round
   */
  private generateRoundLabels(): Record<string, string> {
    return {
      // Winners bracket
      'winners-1': 'WB-R1',
      'winners-2': 'WB-R2',
      'winners-3': 'WB-QF',
      'winners-4': 'WB-SF',
      'winners-5': 'WB-F',
      
      // Losers bracket
      'losers-1': 'LB-R1',
      'losers-2': 'LB-R2',
      'losers-3': 'LB-R3',
      'losers-4': 'LB-QF',
      'losers-5': 'LB-SF',
      'losers-6': 'LB-F',
      
      // Finals
      'finals-1': 'GF1',
      'finals-2': 'GF2',
    };
  }

  /**
   * Create a match key for the map
   * @param matchType Type of match
   * @param round Round number
   * @param position Position in the round
   */
  createMatchKey(matchType: string, round: number, position: number): string {
    // Simplify key for storage
    return `${matchType}-${round}`;
  }

  /**
   * Add a match to the match map
   * @param match Match to add
   * @param matchType Type of match
   * @param round Round number
   * @param position Position within the round
   */
  addMatchToMap(match: PlayoffMatch, matchType: string, round: number, position: number): void {
    const key = this.createMatchKey(matchType, round, position);
    this.matchMap[key] = match;
  }

  /**
   * Get a match from the map
   * @param matchType Type of match
   * @param round Round number
   * @param position Position within the round
   */
  getMatchFromMap(matchType: string, round: number, position: number): PlayoffMatch | undefined {
    const key = this.createMatchKey(matchType, round, position);
    return this.matchMap[key];
  }
  
  /**
   * Link play-in matches to the main bracket
   * @param matches All bracket matches
   */
  linkPlayInMatches(matches: PlayoffMatch[]): void {
    PlayInLinker.linkPlayInMatches(matches);
  }
  
  /**
   * Link all matches in the bracket
   * @param matches All bracket matches
   * @param rounds Number of rounds in winners bracket
   */
  linkMatches(matches: PlayoffMatch[], rounds: number): void {
    // Extract play-in matches
    const playInMatches = matches.filter(m => 
      m.matchType === "play-in" || m.matchType === "play-in-2"
    );
    
    // Link play-in matches if any exist
    if (playInMatches.length > 0) {
      this.linkPlayInMatches(matches);
    }
    
    // Link winners bracket
    this.linkWinnersBracket(matches, rounds);
    
    // Link losers bracket
    this.linkLosersBracket(matches, rounds);
  }
  
  /**
   * Link winners bracket matches to both next winners round and losers bracket
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkWinnersBracket(matches: PlayoffMatch[], rounds: number): void {
    WinnersBracketLinker.linkWinnersBracket(matches, rounds);
  }
  
  /**
   * Link losers bracket matches to next rounds
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    LosersBracketLinker.linkLosersBracket(matches, rounds);
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches All matches in the bracket
   */
  connectBracketSections(matches: PlayoffMatch[]): void {
    // This is a compatibility method that delegates to other methods
    const rounds = Math.log2(matches.filter(m => m.matchType === "winners" && m.round === 1).length * 2);
    
    // Link all sections
    this.linkMatches(matches, rounds);
  }
  
  /**
   * Generate the grand finals match(es)
   * @param matches - All bracket matches
   * @returns Updated array of matches
   */
  generateFinals(matches: PlayoffMatch[]): PlayoffMatch[] {
    return this.finalsGenerator.generateFinals(matches);
  }

  /**
   * Create a reset match for the grand finals
   * @returns The reset match
   */
  createResetMatch(): PlayoffMatch {
    return this.finalsGenerator.createResetMatch();
  }
}
