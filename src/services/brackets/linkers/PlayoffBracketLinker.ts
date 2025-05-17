
import { nanoid } from "nanoid";
import { BracketMatch, PlayoffMatch, PlayoffMatchType } from "../types";
import { BaseBracketLinker } from "./BaseBracketLinker";
import { LinkingUtils } from "./utils/LinkingUtils";
import { BracketLinkingUtils } from "./utils/BracketLinkingUtils";
import { IFinalsGenerator } from "./types/MatchLinkingTypes";
import { PlayoffFinalsGenerator } from "./utils/FinalsGeneratorUtils";

/**
 * Specialized linker for playoff brackets that handles the complexities
 * of double elimination brackets with true finals format
 */
export class PlayoffBracketLinker extends BaseBracketLinker<PlayoffMatch> {
  private roundLabels: Record<string, string>;
  private finalsGenerator: IFinalsGenerator<PlayoffMatch>;
  
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
   * Link play-in matches to the main bracket
   * @param playInMatches - Array of play-in matches
   * @param firstRoundMatches - Array of first round matches in winners bracket
   */
  linkPlayInMatches(playInMatches: PlayoffMatch[], firstRoundMatches: PlayoffMatch[]): void {
    playInMatches.forEach(playInMatch => {
      const targetMatch = this.findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }
  
  /**
   * Find the target match for a play-in match
   * @param playInMatch - The play-in match
   * @param firstRoundMatches - Array of first round matches
   * @returns The target match or null
   */
  private findTargetMatchForPlayIn(
    playInMatch: PlayoffMatch, 
    firstRoundMatches: PlayoffMatch[]
  ): PlayoffMatch | null {
    return firstRoundMatches.find(m => 
      m.team1Id === `play-in-${playInMatch.position}` || 
      m.team2Id === `play-in-${playInMatch.position}`
    ) || null;
  }
  
  /**
   * Link all matches in the bracket
   * @param matches All bracket matches
   * @param rounds Number of rounds in winners bracket
   */
  linkMatches(matches: PlayoffMatch[], rounds: number): void {
    // Extract play-in matches and first round matches
    const playInMatches = matches.filter(m => m.matchType === "play-in" || m.matchType === "play-in-2");
    const firstRoundMatches = matches.filter(m => m.matchType === "winners" && m.round === 1);
    
    // Link play-in matches if any exist
    if (playInMatches.length > 0) {
      this.linkPlayInMatches(playInMatches, firstRoundMatches);
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
    // Organize matches by round
    const winnersByRound = LinkingUtils.organizeMatchesByRound('winners', matches);
    
    // Link each round to the next
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersByRound[round] || [];
      const nextRoundMatches = winnersByRound[round + 1] || [];
      
      BracketLinkingUtils.linkMatchesToNextRound(currentRoundMatches, nextRoundMatches);
      this.linkWinnersToLosers(currentRoundMatches, matches, round);
    }
    
    // Link final winners bracket match to grand finals
    BracketLinkingUtils.linkWinnersFinalToGrandFinals(matches, rounds);
  }
  
  /**
   * Link losers from winners bracket to losers bracket
   * @param winnersMatches - Matches from winners bracket
   * @param allMatches - All bracket matches
   * @param winnerRound - Current round number in winners bracket
   */
  private linkWinnersToLosers(
    winnersMatches: PlayoffMatch[], 
    allMatches: PlayoffMatch[],
    winnerRound: number
  ): void {
    winnersMatches.forEach(match => {
      const loserDestination = this.findLoserDestination(winnerRound, match.position, allMatches);
      if (loserDestination) {
        match.nextLoseMatchId = loserDestination.id;
      }
    });
  }
  
  /**
   * Find the appropriate losers bracket match for a winner's bracket loser
   * @param winnerRound - Round in winners bracket
   * @param position - Position in winners bracket round
   * @param matches - All bracket matches
   * @returns Destination match in losers bracket or null
   */
  private findLoserDestination(
    winnerRound: number, 
    position: number, 
    matches: PlayoffMatch[]
  ): PlayoffMatch | null {
    // Find appropriate losers bracket match based on round and position
    const loserMatches = matches.filter(m => m.matchType === 'losers');
    
    const loserRound = LinkingUtils.calculateLoserDestinationRound(winnerRound);
    const destinations = loserMatches.filter(m => m.round === loserRound);
    
    const loserPosition = LinkingUtils.calculateLoserDestinationPosition(position, winnerRound);
    
    return destinations.find(m => m.position === loserPosition) || null;
  }
  
  /**
   * Link losers bracket matches to next rounds
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const losersByRound = LinkingUtils.organizeMatchesByRound('losers', matches);
    
    // Calculate the maximum loser round
    const maxLoserRound = Math.max(
      ...Object.keys(losersByRound).map(Number),
      0 // Provide fallback if there are no losers rounds
    );
    
    // Link each round to the next
    for (let round = 1; round < maxLoserRound; round++) {
      const currentRoundMatches = losersByRound[round] || [];
      const nextRoundMatches = losersByRound[round + 1] || [];
      
      BracketLinkingUtils.linkMatchesToNextRound(currentRoundMatches, nextRoundMatches);
    }
    
    // Link the final losers bracket match to the grand finals
    BracketLinkingUtils.linkLosersFinalToGrandFinals(matches, maxLoserRound);
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
