
import { bracketManager } from '../manager/BracketManager';

/**
 * Service for handling match results and updates
 */
export class MatchResultService {
  /**
   * Update a match result
   */
  async updateMatchResult(
    matchId: string,
    winnerId: string,
    team1Score: number,
    team2Score: number
  ): Promise<void> {
    // Get the match first
    const matches = await bracketManager.getMatches({ id: matchId });
    if (!matches || matches.length === 0) {
      throw new Error(`Match with ID ${matchId} not found`);
    }
    
    const match = matches[0];
    // Determine which opponent is which team
    const team1IsOpponent1 = match.opponent1?.id === winnerId || match.opponent2?.id !== winnerId;
    
    // Prepare the result object
    const resultObject = {
      opponent1: {
        score: team1IsOpponent1 ? team1Score : team2Score,
        result: team1IsOpponent1 ? 'win' : 'loss'
      },
      opponent2: {
        score: team1IsOpponent1 ? team2Score : team1Score, 
        result: team1IsOpponent1 ? 'loss' : 'win'
      },
      status: 'completed',
    };
    
    // Update the match
    await bracketManager.updateMatchResult(matchId, resultObject);
  }
}

// Singleton instance
export const matchResultService = new MatchResultService();
