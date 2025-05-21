
import { bracketManager } from '../manager/BracketManager';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffGame } from "@/types/playoffs";

/**
 * Service for updating match scores
 */
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
      
      // Validate game counts against best-of setting
      const bestOf = match.best_of || 3;
      const totalGameWins = team1GameWins + team2GameWins;
      
      if (totalGameWins > bestOf) {
        throw new Error(`Total game wins (${totalGameWins}) exceeds the best-of ${bestOf} setting`);
      }
      
      // Make sure scores match the winner
      if ((team1Score > team2Score && team1GameWins <= team2GameWins) || 
          (team2Score > team1Score && team2GameWins <= team1GameWins)) {
        throw new Error("Match score doesn't align with game wins");
      }
      
      // Determine the winner
      const winnerId = team1Score > team2Score ? team1Id : team2Id;
      const loserId = winnerId === team1Id ? team2Id : team1Id;
      
      // Convert games to PlayoffGame format
      const playoffGames: PlayoffGame[] = games.map((game, index) => ({
        id: uuidv4(),
        matchId,
        gameNumber: index + 1,
        team1Score: game.team1Score,
        team2Score: game.team2Score,
        winnerId: game.team1Score > game.team2Score ? team1Id : team2Id
      }));
      
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
      
      // Update in our database directly
      const { error } = await supabase
        .from('playoff_matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          team1_game_wins: team1GameWins,
          team2_game_wins: team2GameWins,
          winner_id: winnerId,
          loser_id: loserId,
          status: 'completed'
        })
        .eq('id', matchId);
      
      if (error) {
        throw new Error(`Failed to update match in database: ${error.message}`);
      }
      
      // Insert the games
      const { error: gamesError } = await supabase
        .from('playoff_games')
        .insert(playoffGames.map(game => ({
          id: game.id,
          match_id: game.matchId,
          game_number: game.gameNumber,
          team1_score: game.team1Score,
          team2_score: game.team2Score,
          winner_id: game.winnerId
        })));
      
      if (gamesError) {
        throw new Error(`Failed to insert games: ${gamesError.message}`);
      }
      
      // Log the result for debugging purposes
      console.log(`Match ${matchId} updated with result: Team ${winnerId} (${team1Id === winnerId ? 'team1' : 'team2'}) 
        defeated Team ${loserId} (${team1Id === loserId ? 'team1' : 'team2'}) with scores 
        ${team1Score}-${team2Score} (games: ${team1GameWins}-${team2GameWins})`);
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
}
