
import { PlayoffMatch, SeedTeam } from "../types";

/**
 * Utility for testing various bracket scenarios
 */
export class BracketScenarioTester {
  private matches: PlayoffMatch[];
  private teams: SeedTeam[];
  
  /**
   * Create a new bracket scenario tester
   * @param matches The matches in the bracket
   * @param teams The teams in the bracket
   */
  constructor(matches: PlayoffMatch[], teams: SeedTeam[]) {
    this.matches = [...matches];
    this.teams = [...teams];
  }
  
  /**
   * Test scenario where winners bracket champion wins finals in first match
   * @returns Updated matches array with completed bracket
   */
  testWinnersBracketChampionWins(): PlayoffMatch[] {
    let updatedMatches = [...this.matches];
    
    // Complete each round in the winners bracket
    updatedMatches = this.completeWinnersBracket(updatedMatches);
    
    // Complete each round in the losers bracket
    updatedMatches = this.completeLosersBracket(updatedMatches);
    
    // Get the finals match
    const finalsMatch = updatedMatches.find(m => m.matchType === 'finals' && m.round === 1);
    if (!finalsMatch) throw new Error('Finals match not found');
    
    // Get the winners bracket champion
    const winnersBracketFinal = updatedMatches.find(
      m => m.matchType === 'winners' && !m.nextWinMatchId
    );
    if (!winnersBracketFinal || !winnersBracketFinal.winnerId) {
      throw new Error('Winners bracket champion not found');
    }
    
    // Complete the finals match with winners bracket champion winning
    finalsMatch.team1Id = winnersBracketFinal.winnerId;
    finalsMatch.team2Id = this.findLosersBracketChampion(updatedMatches);
    finalsMatch.team1Score = 2;
    finalsMatch.team2Score = 0;
    finalsMatch.team1GameWins = 2;
    finalsMatch.team2GameWins = 0;
    finalsMatch.winnerId = finalsMatch.team1Id;
    finalsMatch.loserId = finalsMatch.team2Id;
    finalsMatch.status = 'completed';
    
    return updatedMatches;
  }
  
  /**
   * Test scenario where losers bracket champion wins first finals, but winners bracket champion wins reset match
   * @returns Updated matches array with completed bracket
   */
  testResetMatchWinnersBracketChampionWins(): PlayoffMatch[] {
    let updatedMatches = [...this.matches];
    
    // Complete winners and losers brackets
    updatedMatches = this.completeWinnersBracket(updatedMatches);
    updatedMatches = this.completeLosersBracket(updatedMatches);
    
    // Get the finals match
    const finalsMatch = updatedMatches.find(m => m.matchType === 'finals' && m.round === 1);
    if (!finalsMatch) throw new Error('Finals match not found');
    
    // Get the winners bracket champion
    const winnersBracketFinal = updatedMatches.find(
      m => m.matchType === 'winners' && !m.nextWinMatchId
    );
    if (!winnersBracketFinal || !winnersBracketFinal.winnerId) {
      throw new Error('Winners bracket champion not found');
    }
    
    // Get the losers bracket champion
    const losersBracketChampionId = this.findLosersBracketChampion(updatedMatches);
    
    // Losers bracket champion wins first finals match
    finalsMatch.team1Id = winnersBracketFinal.winnerId;
    finalsMatch.team2Id = losersBracketChampionId;
    finalsMatch.team1Score = 0;
    finalsMatch.team2Score = 2;
    finalsMatch.team1GameWins = 0;
    finalsMatch.team2GameWins = 2;
    finalsMatch.winnerId = finalsMatch.team2Id;
    finalsMatch.loserId = finalsMatch.team1Id;
    finalsMatch.status = 'completed';
    
    // Create reset match
    const resetMatch: PlayoffMatch = {
      id: 'reset-match',
      round: 2,
      position: 1,
      matchType: 'finals',
      bracket_id: finalsMatch.bracket_id,
      team1Id: finalsMatch.team2Id, // Losers bracket champion (who won first match)
      team2Id: finalsMatch.team1Id, // Winners bracket champion (who lost first match)
      team1Score: 0,
      team2Score: 2,
      team1GameWins: 0,
      team2GameWins: 2,
      team1Seed: null,
      team2Seed: null,
      bestOf: 3,
      winnerId: finalsMatch.team1Id, // Winners bracket champion wins reset match
      loserId: finalsMatch.team2Id,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      status: 'completed'
    };
    
    updatedMatches.push(resetMatch);
    
    return updatedMatches;
  }
  
  /**
   * Test scenario where losers bracket champion wins both finals matches
   * @returns Updated matches array with completed bracket
   */
  testLosersBracketChampionWinsBoth(): PlayoffMatch[] {
    let updatedMatches = [...this.matches];
    
    // Complete winners and losers brackets
    updatedMatches = this.completeWinnersBracket(updatedMatches);
    updatedMatches = this.completeLosersBracket(updatedMatches);
    
    // Get the finals match
    const finalsMatch = updatedMatches.find(m => m.matchType === 'finals' && m.round === 1);
    if (!finalsMatch) throw new Error('Finals match not found');
    
    // Get the winners bracket champion
    const winnersBracketFinal = updatedMatches.find(
      m => m.matchType === 'winners' && !m.nextWinMatchId
    );
    if (!winnersBracketFinal || !winnersBracketFinal.winnerId) {
      throw new Error('Winners bracket champion not found');
    }
    
    // Get the losers bracket champion
    const losersBracketChampionId = this.findLosersBracketChampion(updatedMatches);
    
    // Losers bracket champion wins first finals match
    finalsMatch.team1Id = winnersBracketFinal.winnerId;
    finalsMatch.team2Id = losersBracketChampionId;
    finalsMatch.team1Score = 0;
    finalsMatch.team2Score = 2;
    finalsMatch.team1GameWins = 0;
    finalsMatch.team2GameWins = 2;
    finalsMatch.winnerId = finalsMatch.team2Id;
    finalsMatch.loserId = finalsMatch.team1Id;
    finalsMatch.status = 'completed';
    
    // Create reset match
    const resetMatch: PlayoffMatch = {
      id: 'reset-match',
      round: 2,
      position: 1,
      matchType: 'finals',
      bracket_id: finalsMatch.bracket_id,
      team1Id: finalsMatch.team2Id, // Losers bracket champion (who won first match)
      team2Id: finalsMatch.team1Id, // Winners bracket champion (who lost first match)
      team1Score: 2,
      team2Score: 0,
      team1GameWins: 2,
      team2GameWins: 0,
      team1Seed: null,
      team2Seed: null,
      bestOf: 3,
      winnerId: finalsMatch.team2Id, // Losers bracket champion wins reset match too
      loserId: finalsMatch.team1Id,
      nextWinMatchId: null,
      nextLoseMatchId: null,
      status: 'completed'
    };
    
    updatedMatches.push(resetMatch);
    
    return updatedMatches;
  }
  
  /**
   * Get the state of the bracket
   * @param matches The current matches
   * @returns Bracket state object
   */
  getBracketState(matches: PlayoffMatch[]) {
    const winnersBracketComplete = this.isWinnersBracketComplete(matches);
    const losersBracketComplete = this.isLosersBracketComplete(matches);
    
    const winnersBracketChampionId = this.findWinnersBracketChampion(matches);
    const losersBracketChampionId = this.findLosersBracketChampion(matches);
    
    const finalsMatches = matches.filter(m => m.matchType === 'finals');
    const isResetMatchNeeded = finalsMatches.length === 1 && 
      finalsMatches[0].winnerId === losersBracketChampionId;
    
    let isComplete = false;
    let championId: string | null = null;
    
    if (finalsMatches.length === 1 && 
        finalsMatches[0].winnerId === winnersBracketChampionId) {
      // Winner bracket champion won first finals
      isComplete = true;
      championId = winnersBracketChampionId;
    } else if (finalsMatches.length === 2 && finalsMatches[1].winnerId) {
      // Reset match completed
      isComplete = true;
      championId = finalsMatches[1].winnerId;
    }
    
    return {
      isWinnersBracketComplete: winnersBracketComplete,
      isLosersBracketComplete: losersBracketComplete,
      isResetMatchNeeded,
      isComplete,
      winnersBracketChampionId,
      losersBracketChampionId,
      championId
    };
  }
  
  /**
   * Helper methods for bracket simulation
   */
  private completeWinnersBracket(matches: PlayoffMatch[]): PlayoffMatch[] {
    const winnersMatches = matches.filter(m => m.matchType === 'winners')
      .sort((a, b) => a.round - b.round || a.position - b.position);
    
    // Go through each match in order
    for (const match of winnersMatches) {
      if (!match.team1Id && !match.team2Id) {
        const previousRoundMatches = winnersMatches.filter(
          m => m.round === match.round - 1 && m.nextWinMatchId === match.id
        );
        
        if (previousRoundMatches.length > 0) {
          // Take winners from previous round
          if (previousRoundMatches[0] && previousRoundMatches[0].winnerId) {
            match.team1Id = previousRoundMatches[0].winnerId;
          }
          
          if (previousRoundMatches[1] && previousRoundMatches[1].winnerId) {
            match.team2Id = previousRoundMatches[1].winnerId;
          }
        } else if (match.round === 1) {
          // First round, assign teams
          const availableTeams = this.teams.filter(
            t => !winnersMatches.some(m => m.winnerId === t.id)
          );
          
          if (availableTeams.length >= 2) {
            match.team1Id = availableTeams[0].id;
            match.team2Id = availableTeams[1].id;
          }
        }
      }
      
      // Complete the match if both teams are assigned
      if (match.team1Id && match.team2Id) {
        // Team 1 always wins for simplicity in this test
        match.team1Score = 2;
        match.team2Score = 0;
        match.team1GameWins = 2;
        match.team2GameWins = 0;
        match.winnerId = match.team1Id;
        match.loserId = match.team2Id;
        match.status = 'completed';
      }
    }
    
    return matches;
  }
  
  private completeLosersBracket(matches: PlayoffMatch[]): PlayoffMatch[] {
    const losersMatches = matches.filter(m => m.matchType === 'losers')
      .sort((a, b) => a.round - b.round || a.position - b.position);
    
    // First, assign losers from winners bracket
    for (const match of losersMatches) {
      if (!match.team1Id || !match.team2Id) {
        // Find matches from winners bracket that feed into this losers match
        const winnersMatches = matches.filter(
          m => m.matchType === 'winners' && m.nextLoseMatchId === match.id
        );
        
        // Assign teams from winners bracket losers
        if (winnersMatches.length > 0 && winnersMatches[0].loserId) {
          if (!match.team1Id) {
            match.team1Id = winnersMatches[0].loserId;
          } else if (!match.team2Id) {
            match.team2Id = winnersMatches[0].loserId;
          }
        }
        
        // Find previous losers matches that feed into this one
        const previousLosersMatches = losersMatches.filter(
          m => m.nextWinMatchId === match.id
        );
        
        if (previousLosersMatches.length > 0 && previousLosersMatches[0].winnerId) {
          if (!match.team1Id) {
            match.team1Id = previousLosersMatches[0].winnerId;
          } else if (!match.team2Id) {
            match.team2Id = previousLosersMatches[0].winnerId;
          }
        }
      }
      
      // Complete the match if both teams are assigned
      if (match.team1Id && match.team2Id) {
        // Team 1 always wins for simplicity in this test
        match.team1Score = 2;
        match.team2Score = 0;
        match.team1GameWins = 2;
        match.team2GameWins = 0;
        match.winnerId = match.team1Id;
        match.loserId = match.team2Id;
        match.status = 'completed';
      }
    }
    
    return matches;
  }
  
  private isWinnersBracketComplete(matches: PlayoffMatch[]): boolean {
    const winnersMatches = matches.filter(m => m.matchType === 'winners');
    return winnersMatches.every(m => m.status === 'completed');
  }
  
  private isLosersBracketComplete(matches: PlayoffMatch[]): boolean {
    const losersMatches = matches.filter(m => m.matchType === 'losers');
    return losersMatches.every(m => m.status === 'completed');
  }
  
  private findWinnersBracketChampion(matches: PlayoffMatch[]): string | null {
    const winnersBracketFinal = matches.find(
      m => m.matchType === 'winners' && !m.nextWinMatchId && m.round > 1
    );
    
    return winnersBracketFinal?.winnerId || null;
  }
  
  private findLosersBracketChampion(matches: PlayoffMatch[]): string | null {
    const losersBracketFinal = matches.find(
      m => m.matchType === 'losers' && !m.nextWinMatchId && m.round > 1
    );
    
    return losersBracketFinal?.winnerId || null;
  }
}
