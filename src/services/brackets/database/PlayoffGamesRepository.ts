
import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";
import { PlayoffGame } from "../types";
import { DatabaseOperationError, IPlayoffGamesRepository } from "./types";

/**
 * Repository implementation for playoff games
 */
export class PlayoffGamesRepository implements IPlayoffGamesRepository {
  /**
   * Save playoff games to the database
   */
  async saveGames(games: PlayoffGame[]): Promise<void> {
    if (!games || games.length === 0) return;

    try {
      const dbGames = games.map(game => ({
        id: game.id || nanoid(),
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));

      const { error } = await supabase
        .from('playoff_games')
        .insert(dbGames);
      
      if (error) throw new DatabaseOperationError('saveGames', 'Failed to save games', error);
    } catch (error) {
      console.error('Error saving playoff games:', error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('saveGames', 'Unexpected error', error as Error);
    }
  }

  /**
   * Get games for a specific match
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
      
      if (error) throw new DatabaseOperationError('getMatchGames', `Failed to get games for match ${matchId}`, error);
      
      return data.map(game => ({
        id: game.id,
        matchId: game.match_id,
        gameNumber: game.game_number,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winnerId: game.winner_id
      }));
    } catch (error) {
      console.error(`Error getting games for match ${matchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('getMatchGames', `Failed to get games for match ${matchId}`, error as Error);
    }
  }
}
