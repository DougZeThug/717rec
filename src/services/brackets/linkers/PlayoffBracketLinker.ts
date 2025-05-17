
import { nanoid } from "nanoid";
import { PlayoffMatch, PlayoffMatchType } from "../types";

/**
 * Specialized linker for playoff brackets that handles the complexities
 * of double elimination brackets with true finals format
 */
export class PlayoffBracketLinker {
  private bracketId: string;
  private matchMap: Record<string, PlayoffMatch>;
  private roundLabels: Record<string, string>;
  
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
   */
  linkPlayInMatches(playInMatches: PlayoffMatch[], firstRoundMatches: PlayoffMatch[]): void {
    playInMatches.forEach(playInMatch => {
      // Find first round match that has a placeholder team ID matching this play-in
      const targetMatch = firstRoundMatches.find(m => 
        m.team1Id === `play-in-${playInMatch.position}` || 
        m.team2Id === `play-in-${playInMatch.position}`
      );
      
      if (targetMatch) {
        playInMatch.nextWinMatchId = targetMatch.id;
      }
    });
  }
  
  /**
   * Link winners bracket matches to both next winners round and losers bracket
   */
  linkWinnersBracket(matches: PlayoffMatch[], rounds: number): void {
    // First, organize matches by round
    const winnersByRound: Record<number, PlayoffMatch[]> = {};
    matches
      .filter(m => m.matchType === 'winners')
      .forEach(match => {
        if (!winnersByRound[match.round]) {
          winnersByRound[match.round] = [];
        }
        winnersByRound[match.round].push(match);
      });
    
    // For each round, link to next round
    for (let round = 1; round < rounds; round++) {
      const currentRoundMatches = winnersByRound[round] || [];
      const nextRoundMatches = winnersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match, idx) => {
        // Calculate next round position (integer division)
        const nextPos = Math.floor(idx / 2);
        
        // Link to next winners match if it exists
        if (nextPos < nextRoundMatches.length) {
          match.nextWinMatchId = nextRoundMatches[nextPos].id;
        }
        
        // Link losers to losers bracket (specific mapping logic)
        const loserDestination = this.findLoserDestination(round, match.position);
        if (loserDestination) {
          match.nextLoseMatchId = loserDestination.id;
        }
      });
    }
    
    // Link the final winners bracket match to the grand finals
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
   */
  private findLoserDestination(winnerRound: number, position: number): PlayoffMatch | null {
    // Find appropriate losers bracket match based on round and position
    // This mapping varies by bracket size and structure
    
    // Simple example mapping - in a real implementation this would be much more sophisticated
    // and would take into account the bracket size and other factors
    const loserMatches = Object.values(this.matchMap)
      .filter(m => m.matchType === 'losers');
    
    // In a standard double elimination bracket, losers from winners round 1
    // go to losers round 1, losers from winners round 2 go to losers round 3, etc.
    const loserRound = winnerRound * 2 - 1;
    const destinations = loserMatches.filter(m => m.round === loserRound);
    
    // The position calculation depends on the bracket structure
    // This is a simplified version
    const loserPosition = Math.ceil(position / 2);
    
    return destinations.find(m => m.position === loserPosition) || null;
  }
  
  /**
   * Link losers bracket matches to next rounds
   */
  linkLosersBracket(matches: PlayoffMatch[], rounds: number): void {
    // Organize matches by round
    const losersByRound: Record<number, PlayoffMatch[]> = {};
    matches
      .filter(m => m.matchType === 'losers')
      .forEach(match => {
        if (!losersByRound[match.round]) {
          losersByRound[match.round] = [];
        }
        losersByRound[match.round].push(match);
      });
    
    // For each round, link to next round
    const maxLoserRound = Math.max(...Object.keys(losersByRound).map(Number));
    
    for (let round = 1; round < maxLoserRound; round++) {
      const currentRoundMatches = losersByRound[round] || [];
      const nextRoundMatches = losersByRound[round + 1] || [];
      
      currentRoundMatches.forEach((match, idx) => {
        // Calculate next round position
        const nextPos = Math.floor(idx / 2);
        
        // Link to next losers match if it exists
        if (nextPos < nextRoundMatches.length) {
          match.nextWinMatchId = nextRoundMatches[nextPos].id;
        }
      });
    }
    
    // Link the final losers bracket match to the grand finals
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
   */
  generateFinals(matches: PlayoffMatch[]): PlayoffMatch[] {
    // Create the first grand final match
    const gf1: PlayoffMatch = {
      id: nanoid(),
      round: 1,
      position: 1,
      matchType: 'finals',
      bracket_id: this.bracketId,
      team1Id: null, // Will be filled with winners bracket champion
      team2Id: null, // Will be filled with losers bracket champion
      team1Seed: null,
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      bestOf: 3,
      winnerId: null,
      loserId: null,
      nextWinMatchId: null, // May link to GF2 if needed
      nextLoseMatchId: null,
      status: "pending"
    };
    
    this.matchMap['finals-1'] = gf1;
    matches.push(gf1);
    
    // If this is a true double elimination, we might need a second grand final
    // We don't create it yet - it's conditionally created if the losers bracket champion
    // wins the first grand final
    
    return matches;
  }
  
  /**
   * Create a reset match for the grand finals
   */
  createResetMatch(): PlayoffMatch {
    // Create the second grand final match (reset match)
    const gf2: PlayoffMatch = {
      id: nanoid(),
      round: 2,
      position: 1,
      matchType: 'finals',
      bracket_id: this.bracketId,
      team1Id: null, // Will be filled with GF1 winner
      team2Id: null, // Will be filled with GF1 loser
      team1Seed: null,
      team2Seed: null,
      team1Score: null,
      team2Score: null,
      bestOf: 3,
      winnerId: null,
      loserId: null,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      status: "pending"
    };
    
    this.matchMap['finals-2'] = gf2;
    return gf2;
  }
  
  /**
   * Get the map of all matches by their key
   */
  getMatchMap(): Record<string, PlayoffMatch> {
    return this.matchMap;
  }
}
