
/**
 * Service for updating match scores
 */
export class MatchScoreService {
  /**
   * Update a match's score
   */
  static async updateMatchScore(
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ): Promise<void> {
    // Determine the winner based on game wins
    const winnerId = team1GameWins > team2GameWins 
      ? matchId.split('-')[0]  // team1Id is first part of matchId
      : matchId.split('-')[1]; // team2Id is second part of matchId
      
    // Create a simplified match update structure for brackets-manager
    const matchData = {
      id: matchId,
      status: "completed",
      opponent1: {
        id: matchId.split('-')[0],
        score: team1Score,
        result: team1GameWins > team2GameWins ? "win" : "loss"
      },
      opponent2: {
        id: matchId.split('-')[1],
        score: team2Score,
        result: team2GameWins > team1GameWins ? "win" : "loss"
      }
    };
    
    try {
      // Import the manager from BracketsManagerInstance
      const { manager } = await import('../BracketsManagerInstance');
      
      // Update the match
      await manager.update.match(matchId, matchData);
      
      console.log(`Match ${matchId} updated with scores: ${team1Score}-${team2Score}`);
    } catch (error) {
      console.error('Error updating match score:', error);
      throw new Error(`Failed to update match score: ${error}`);
    }
  }
}
