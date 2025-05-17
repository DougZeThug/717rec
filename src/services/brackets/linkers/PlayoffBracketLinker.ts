
import { nanoid } from "nanoid";
import { PlayoffMatch, PlayoffMatchType } from "../types";

/**
 * Maps the connection points between different parts of a double elimination bracket
 */
interface BracketConnectionMap {
  winners: {[key: string]: string};
  losers: {[key: string]: string};
}

/**
 * Specialized linker for playoff brackets that handles the complexities
 * of double elimination brackets with true finals format
 */
export class PlayoffBracketLinker {
  private bracketId: string;
  private matchMap: Record<string, PlayoffMatch>;
  private roundLabels: Record<string, string>;
  
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
   * Link winners bracket matches to both next winners round and losers bracket
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkWinnersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const winnersByRound = this.organizeMatchesByRound('winners', matches);
    
    // Link each round to the next
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersByRound[round] || [];
      const nextRoundMatches = winnersByRound[round + 1] || [];
      
      this.linkMatchesToNextRound(currentRoundMatches, nextRoundMatches);
      this.linkWinnersToLosers(currentRoundMatches, matches, round);
    }
    
    // Link final winners bracket match to grand finals
    this.linkWinnersFinalsToGrandFinals(matches, rounds);
  }
  
  /**
   * Organize matches by round for a specific bracket type
   * @param matchType - Type of bracket (winners, losers)
   * @param matches - All matches
   * @returns Matches organized by round
   */
  private organizeMatchesByRound(
    matchType: PlayoffMatchType, 
    matches: PlayoffMatch[]
  ): Record<number, PlayoffMatch[]> {
    const matchesByRound: Record<number, PlayoffMatch[]> = {};
    
    matches
      .filter(m => m.matchType === matchType)
      .forEach(match => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });
      
    return matchesByRound;
  }
  
  /**
   * Link a set of matches to their next round
   * @param currentRoundMatches - Matches in current round
   * @param nextRoundMatches - Matches in next round
   */
  private linkMatchesToNextRound(
    currentRoundMatches: PlayoffMatch[], 
    nextRoundMatches: PlayoffMatch[]
  ): void {
    currentRoundMatches.forEach((match, idx) => {
      // Calculate next round position (integer division)
      const nextPos = Math.floor(idx / 2);
      
      // Link to next match if it exists
      if (nextPos < nextRoundMatches.length) {
        match.nextWinMatchId = nextRoundMatches[nextPos].id;
      }
    });
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
   * Link winners finals to grand finals
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  private linkWinnersFinalsToGrandFinals(matches: PlayoffMatch[], rounds: number): void {
    const winnersFinal = matches.find(m => 
      m.matchType === 'winners' && 
      m.round === rounds && 
      m.position === 1
    );
    
    const grandFinal = matches.find(m => m.matchType === 'finals' && m.round === 1);
    if (winnersFinal && grandFinal) {
      winnersFinal.nextWinMatchId = grandFinal.id;
    }
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
    
    // In a standard double elimination bracket, losers from winners round 1
    // go to losers round 1, losers from winners round 2 go to losers round 3, etc.
    const loserRound = winnerRound * 2 - 1;
    const destinations = loserMatches.filter(m => m.round === loserRound);
    
    // The position calculation depends on the bracket structure
    const loserPosition = Math.ceil(position / 2);
    
    return destinations.find(m => m.position === loserPosition) || null;
  }
  
  /**
   * Link losers bracket matches to next rounds
   * @param matches - All bracket matches
   * @param rounds - Number of rounds in winners bracket
   */
  linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const losersByRound = this.organizeMatchesByRound('losers', matches);
    
    // Calculate the maximum loser round
    const maxLoserRound = Math.max(
      ...Object.keys(losersByRound).map(Number),
      0 // Provide fallback if there are no losers rounds
    );
    
    // Link each round to the next
    for (let round = 1; round < maxLoserRound; round++) {
      const currentRoundMatches = losersByRound[round] || [];
      const nextRoundMatches = losersByRound[round + 1] || [];
      
      this.linkMatchesToNextRound(currentRoundMatches, nextRoundMatches);
    }
    
    // Link the final losers bracket match to the grand finals
    this.linkLosersFinalToGrandFinals(matches, maxLoserRound);
  }
  
  /**
   * Link losers bracket final to grand finals
   * @param matches - All bracket matches
   * @param maxLoserRound - Maximum round number in losers bracket
   */
  private linkLosersFinalToGrandFinals(matches: PlayoffMatch[], maxLoserRound: number): void {
    const losersFinal = matches.find(m => 
      m.matchType === 'losers' && 
      m.round === maxLoserRound
    );
    
    const grandFinal = matches.find(m => m.matchType === 'finals' && m.round === 1);
    if (losersFinal && grandFinal) {
      losersFinal.nextWinMatchId = grandFinal.id;
    }
  }
  
  /**
   * Generate the grand finals match(es)
   * @param matches - All bracket matches
   * @returns Updated array of matches
   */
  generateFinals(matches: PlayoffMatch[]): PlayoffMatch[] {
    const gf1 = this.createFinalsMatch(1);
    this.matchMap['finals-1'] = gf1;
    matches.push(gf1);
    
    return matches;
  }

  /**
   * Create a finals match with the specified round
   * @param round - Round number (1 for first grand final, 2 for reset match)
   * @returns Newly created finals match
   */
  private createFinalsMatch(round: number): PlayoffMatch {
    return {
      id: nanoid(),
      round,
      position: 1,
      matchType: 'finals',
      bracket_id: this.bracketId,
      team1Id: null, // Will be filled with appropriate champion
      team2Id: null, // Will be filled with appropriate champion
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
  
  /**
   * Create a reset match for the grand finals
   * @returns The reset match
   */
  createResetMatch(): PlayoffMatch {
    const gf2 = this.createFinalsMatch(2);
    this.matchMap['finals-2'] = gf2;
    return gf2;
  }
  
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, PlayoffMatch> {
    return this.matchMap;
  }
}
