
import { bracketManager } from '../manager/BracketManager';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { MatchResult } from '@/hooks/matches/types/matchSubmissionTypes';
import { v4 as uuidv4 } from 'uuid';

export class MatchScoreService {
  /**
   * Update a match score
   */
  static async updateMatchScore(
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ): Promise<void> {
    try {
      // Fetch the match to get team IDs
      const matches = await bracketManager.getMatches({ id: matchId });
      if (!matches || matches.length === 0) {
        throw new Error(`Match with ID ${matchId} not found`);
      }
      
      const match = matches[0];
      const team1Id = match.opponent1?.id;
      const team2Id = match.opponent2?.id;
      
      if (!team1Id || !team2Id) {
        throw new Error("Cannot update match score: one or both teams are missing");
      }
      
      // Determine the winner
      const winnerId = team1Score > team2Score ? team1Id : team2Id;
      const loserId = winnerId === team1Id ? team2Id : team1Id;
      
      // Convert games to PlayoffGame format
      const playoffGames = games.map((game, index) => ({
        id: uuidv4(),
        matchId,
        gameNumber: index + 1,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        winnerId: game.team1Score > game.team2Score ? team1Id : team2Id
      }));
      
      // Create a match result object
      const matchResult: MatchResult = {
        matchId,
        winnerId,
        loserId,
        team1Score,
        team2Score,
        games: playoffGames
      };
      
      // Update in brackets-manager
      await bracketManager.updateMatchResult(matchId, {
        opponent1: {
          id: team1Id,
          score: team1Score,
          result: team1Id === winnerId ? 'win' : 'loss'
        },
        opponent2: {
          id: team2Id,
          score: team2Score,
          result: team2Id === winnerId ? 'win' : 'loss'
        },
        status: 'completed'
      });
      
      // Update in our database
      await PlayoffDatabaseAdapter.recordMatchResult(matchId, {
        winnerId,
        loserId,
        team1Score,
        team2Score,
        team1GameWins,
        team2GameWins,
        games: playoffGames
      });
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
}
