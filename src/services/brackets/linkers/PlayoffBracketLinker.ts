
import { nanoid } from "nanoid";
import { BracketMatch, PlayoffMatch, PlayoffMatchType } from "../types";
import { MatchTypeAdapter } from "../utils/TypeAdapter";
import { IBracketConnectionOperations, IMatchMapOperations } from "./interfaces/BracketLinkerInterfaces";
import { IFinalsGenerator } from "./types/MatchLinkingTypes";
import { PlayoffFinalsGenerator } from "./utils/FinalsGeneratorUtils";
import { ConnectionCalculator, MatchOrganizer, PositionResolver } from "./utils/BracketLinkingUtilities";

/**
 * Specialized linker for playoff brackets that handles the complexities
 * of double elimination brackets with true finals format
 */
export class PlayoffBracketLinker 
  implements IMatchMapOperations<PlayoffMatch>, IBracketConnectionOperations<PlayoffMatch> {
  private roundLabels: Record<string, string>;
  private finalsGenerator: IFinalsGenerator<PlayoffMatch>;
  private bracketId: string;
  private matchMap: Record<string, PlayoffMatch>;
  
  /**
   * Create a new PlayoffBracketLinker instance
   * @param bracketId - Unique identifier for the bracket
   * @param matchMap - Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, PlayoffMatch> = {}
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
    this.roundLabels = this.generateRoundLabels();
    this.finalsGenerator = new PlayoffFinalsGenerator(bracketId, matchMap);
  }

  /**
   * Get the map of all matches
   * @returns Match map
   */
  getMatchMap(): Record<string, PlayoffMatch> {
    return this.matchMap;
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
    // Convert PlayoffMatchType to MatchType if needed
    const standardType = MatchTypeAdapter.toStandardMatchType(matchType as PlayoffMatchType);
    return `${standardType}-${round}`;
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
    // Extract play-in matches and first round matches
    const playInMatches = matches.filter(m => 
      m.matchType === "play-in" || m.matchType === "play-in-2"
    );
    
    const firstRoundMatches = matches.filter(m => 
      m.matchType === "winners" && m.round === 1
    );
    
    // Link each play-in match to its target match in first round
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
    const playInMatches = matches.filter(m => 
      m.matchType === "play-in" || m.matchType === "play-in-2"
    );
    
    const firstRoundMatches = matches.filter(m => 
      m.matchType === "winners" && m.round === 1
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
    // Organize matches by round
    const winnersByRound = MatchOrganizer.organizeByRound('winners', matches);
    
    // Link each round to the next
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersByRound[round] || [];
      const nextRoundMatches = winnersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match, idx) => {
        // Link to next round
        const nextPos = PositionResolver.calculateNextRoundPosition(match.position);
        const nextMatch = nextRoundMatches.find(m => m.position === nextPos);
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
        
        // Link to losers bracket
        this.linkWinnerMatchToLosersBracket(match, matches, round);
      });
    }
    
    // Link final winners bracket match to grand finals
    this.linkWinnersFinalToGrandFinals(matches, rounds);
  }
  
  /**
   * Link a winner's bracket match loser to losers bracket
   */
  private linkWinnerMatchToLosersBracket(
    winnerMatch: PlayoffMatch,
    allMatches: PlayoffMatch[],
    round: number
  ): void {
    const loserRound = ConnectionCalculator.calculateLoserDestinationRound(round);
    const loserPosition = ConnectionCalculator.calculateLoserDestinationPosition(
      winnerMatch.position, round
    );
    
    const loserMatches = allMatches.filter(m => 
      m.matchType === 'losers' && m.round === loserRound
    );
    
    const destination = loserMatches.find(m => m.position === loserPosition);
    
    if (destination) {
      winnerMatch.nextLoseMatchId = destination.id;
    }
  }
  
  /**
   * Link winners final to grand finals
   */
  private linkWinnersFinalToGrandFinals(
    matches: PlayoffMatch[],
    rounds: number
  ): void {
    const winnersFinal = matches.find(m => 
      m.matchType === 'winners' && m.round === rounds && m.position === 1
    );
    
    const grandFinal = matches.find(m => 
      m.matchType === 'finals' && m.round === 1 && m.position === 1
    );
    
    if (winnersFinal && grandFinal) {
      winnersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Link losers from winners bracket to losers bracket
   * @param winnersMatches - Matches from winners bracket
   * @param allMatches - All bracket matches
   * @param winnerRound - Current round number in winners bracket
   */
  private findLoserDestination(
    winnerRound: number, 
    position: number, 
    matches: PlayoffMatch[]
  ): PlayoffMatch | null {
    // Find appropriate losers bracket match based on round and position
    const loserMatches = matches.filter(m => m.matchType === 'losers');
    
    const loserRound = ConnectionCalculator.calculateLoserDestinationRound(winnerRound);
    const destinations = loserMatches.filter(m => m.round === loserRound);
    
    const loserPosition = ConnectionCalculator.calculateLoserDestinationPosition(position, winnerRound);
    
    return destinations.find(m => m.position === loserPosition) || null;
  }
  
  /**
   * Link losers bracket matches to next rounds
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const losersByRound = MatchOrganizer.organizeByRound('losers', matches);
    
    // Calculate the maximum loser round
    const maxLoserRound = Math.max(
      ...Object.keys(losersByRound).map(Number),
      0 // Provide fallback if there are no losers rounds
    );
    
    // Link each round to the next
    for (let round = 1; round < maxLoserRound; round++) {
      const currentRoundMatches = losersByRound[round] || [];
      const nextRoundMatches = losersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match, idx) => {
        // Link to next round
        const nextPos = PositionResolver.calculateNextRoundPosition(match.position);
        const nextMatch = nextRoundMatches.find(m => m.position === nextPos);
        
        if (nextMatch) {
          match.nextWinMatchId = nextMatch.id;
        }
      });
    }
    
    // Link the final losers bracket match to the grand finals
    this.linkLosersFinalToGrandFinals(matches, maxLoserRound);
  }

  /**
   * Link losers final to grand finals
   */
  private linkLosersFinalToGrandFinals(
    matches: PlayoffMatch[],
    maxLoserRound: number
  ): void {
    const losersFinal = matches.find(m => 
      m.matchType === 'losers' && m.round === maxLoserRound && m.position === 1
    );
    
    const grandFinal = matches.find(m => 
      m.matchType === 'finals' && m.round === 1 && m.position === 1
    );
    
    if (losersFinal && grandFinal) {
      losersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Connect different sections of the bracket
   * @param matches All matches in the bracket
   */
  connectBracketSections(matches: PlayoffMatch[]): void {
    // This is a compatibility method that delegates to other methods
    const rounds = Math.log2(matches.filter(m => m.matchType === "winners" && m.round === 1).length * 2);
    
    // Link winners bracket matches to next round and losers bracket
    this.linkWinnersBracket(matches, rounds);
    
    // Link losers bracket matches to next round
    this.linkLosersBracket(matches, rounds);
    
    // Link play-in matches if they exist
    const playInMatches = matches.filter(m => m.matchType === "play-in" || m.matchType === "play-in-2");
    
    if (playInMatches.length > 0) {
      this.linkPlayInMatches(matches);
    }
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
