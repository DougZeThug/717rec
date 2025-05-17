
import { nanoid } from "nanoid";
import { BracketMatch, MatchType } from "./types";

/**
 * Interface for bracket connection maps
 */
interface BracketConnectionMap {
  winners: {[key: string]: string};
  losers: {[key: string]: string};
}

/**
 * Handles linking of matches between different parts of a bracket
 * This is a base class that provides common functionality for all bracket types
 */
export class BracketLinker {
  protected bracketId: string;
  protected matchMap: Record<string, BracketMatch>;
  
  /**
   * Create a new BracketLinker
   * @param bracketId The unique identifier for the bracket
   * @param matchMap Optional pre-existing map of matches
   */
  constructor(
    bracketId: string,
    matchMap: Record<string, BracketMatch> = {}
  ) {
    this.bracketId = bracketId;
    this.matchMap = matchMap;
  }
  
  /**
   * Link play-in matches to the first round of the winners bracket
   * @param matches Array of all bracket matches
   */
  linkPlayInMatches(matches: BracketMatch[]): void {
    const playInMatches = matches.filter(m => m.matchType === "play-in");
    const firstRoundMatches = matches.filter(m => m.matchType === "winners" && m.round === 1);
    
    playInMatches.forEach(playInMatch => {
      // Find first round match that has a placeholder team ID matching this play-in
      const targetMatch = this.findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }

  /**
   * Find the target match for a play-in match
   * @param playInMatch The play-in match
   * @param firstRoundMatches Array of first round matches
   * @returns The target match or null
   */
  protected findTargetMatchForPlayIn(
    playInMatch: BracketMatch, 
    firstRoundMatches: BracketMatch[]
  ): BracketMatch | null {
    return firstRoundMatches.find(m => 
      m.team1Id === `play-in-${playInMatch.position}` || 
      m.team2Id === `play-in-${playInMatch.position}`
    ) || null;
  }

  /**
   * Connect winners bracket to losers bracket and finals
   * @param matches Array of all bracket matches
   */
  connectBrackets(matches: BracketMatch[]): void {
    // Organize matches by type and round
    const matchesByType = this.organizeMatchesByType(matches);
    
    // Connect winners bracket matches
    this.connectWinnersBracket(matchesByType);
    
    // Connect losers bracket matches
    this.connectLosersBracket(matchesByType);
    
    // Connect finals
    this.connectFinals(matchesByType);
  }
  
  /**
   * Organize matches by their type (winners, losers, finals)
   * @param matches All bracket matches
   * @returns Object with matches grouped by type and round
   */
  protected organizeMatchesByType(matches: BracketMatch[]): Record<MatchType, Record<number, BracketMatch[]>> {
    const result: Record<MatchType, Record<number, BracketMatch[]>> = {
      'winners': {},
      'losers': {},
      'finals': {},
      'play-in': {}
    };
    
    matches.forEach(match => {
      if (!result[match.matchType][match.round]) {
        result[match.matchType][match.round] = [];
      }
      result[match.matchType][match.round].push(match);
    });
    
    return result;
  }
  
  /**
   * Connect matches within the winners bracket
   * @param matchesByType Matches organized by type and round
   */
  protected connectWinnersBracket(
    matchesByType: Record<MatchType, Record<number, BracketMatch[]>>
  ): void {
    const winnersMatches = matchesByType['winners'];
    const rounds = Object.keys(winnersMatches).map(Number).sort();
    
    // For each round except the last one
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];
      
      winnersMatches[currentRound].forEach((match, idx) => {
        // Calculate next round position (integer division)
        const nextPos = Math.floor(idx / 2);
        
        // Link to next match if it exists
        if (nextPos < winnersMatches[nextRound].length) {
          match.nextWinMatchId = winnersMatches[nextRound][nextPos].id;
        }
        
        // Link losers to losers bracket
        const loserRound = this.calculateLoserDestinationRound(currentRound);
        if (matchesByType['losers'][loserRound] && loserRound > 0) {
          const loserPosition = this.calculateLoserDestinationPosition(idx, currentRound);
          const loserMatches = matchesByType['losers'][loserRound];
          
          if (loserPosition < loserMatches?.length) {
            match.nextLoseMatchId = loserMatches[loserPosition].id;
          }
        }
      });
    }
    
    // Link winners final to grand finals if it exists
    const lastRound = rounds[rounds.length - 1];
    if (winnersMatches[lastRound]?.length === 1 && 
        matchesByType['finals'][1]?.length === 1) {
      winnersMatches[lastRound][0].nextWinMatchId = matchesByType['finals'][1][0].id;
    }
  }
  
  /**
   * Connect matches within the losers bracket
   * @param matchesByType Matches organized by type and round
   */
  protected connectLosersBracket(
    matchesByType: Record<MatchType, Record<number, BracketMatch[]>>
  ): void {
    const losersMatches = matchesByType['losers'];
    const rounds = Object.keys(losersMatches).map(Number).sort();
    
    // For each round except the last one
    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];
      
      losersMatches[currentRound].forEach((match, idx) => {
        // Calculate next round position
        const nextPos = Math.floor(idx / 2);
        
        // Link to next match if it exists
        if (nextPos < losersMatches[nextRound].length) {
          match.nextWinMatchId = losersMatches[nextRound][nextPos].id;
        }
      });
    }
    
    // Link losers final to grand finals if it exists
    const lastRound = rounds[rounds.length - 1];
    if (losersMatches[lastRound]?.length === 1 && 
        matchesByType['finals'][1]?.length === 1) {
      losersMatches[lastRound][0].nextWinMatchId = matchesByType['finals'][1][0].id;
    }
  }
  
  /**
   * Connect finals matches
   * @param matchesByType Matches organized by type and round
   */
  protected connectFinals(
    matchesByType: Record<MatchType, Record<number, BracketMatch[]>>
  ): void {
    // For standard double elimination with bracket reset
    const finalsMatches = matchesByType['finals'];
    
    if (finalsMatches[1]?.length === 1 && finalsMatches[2]?.length === 1) {
      // Link GF1 to GF2 (reset match)
      finalsMatches[1][0].nextWinMatchId = finalsMatches[2][0].id;
    }
  }
  
  /**
   * Calculate the appropriate losers bracket round for a loser from winners bracket
   * @param winnersRound The round in winners bracket
   * @returns The corresponding round in losers bracket
   */
  protected calculateLoserDestinationRound(winnersRound: number): number {
    // Standard DE bracket maps losers from winners round 1 to losers round 1,
    // losers from winners round 2 to losers round 3, etc.
    return winnersRound * 2 - 1;
  }
  
  /**
   * Calculate the position in the losers bracket for a winner's bracket loser
   * @param position Position in the winners bracket
   * @param round Round in the winners bracket
   * @returns Position in the losers bracket
   */
  protected calculateLoserDestinationPosition(position: number, round: number): number {
    // This is a simplification - actual position calculation depends on bracket size
    return Math.floor(position / 2);
  }
  
  /**
   * Get the map of all matches by their key
   * @returns Match map
   */
  getMatchMap(): Record<string, BracketMatch> {
    return this.matchMap;
  }
}
