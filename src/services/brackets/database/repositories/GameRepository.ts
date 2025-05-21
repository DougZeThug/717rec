
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame } from "../../types";
import { BaseRepository } from "./BaseRepository";
import { DatabaseOperationError, IGameRepository } from "../types/DatabaseTypes";
import { nanoid } from "nanoid";

/**
 * Repository for playoff games
 */
export class GameRepository extends BaseRepository implements IGameRepository {
  /**
   * Save playoff games to the database
   * @param games Games to save
   * @returns Number of games saved
   */
  async saveGames(games: PlayoffGame[]): Promise<number> {
    if (!games || games.length === 0) return 0;

    try {
      const dbGames = games.map(game => ({
        id: game.id || nanoid(),
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));

      return await this.executeOperation('saveGames', () => 
        supabase.from('playoff_games').insert(dbGames)
      );
    } catch (error) {
      console.error('Error saving playoff games:', error);
      return 0;
    }
  }

  /**
   * Get games for a specific match
   * @param matchId Match ID
   * @returns Array of games
   */
  async getMatchGames(matchId: string): Promise<PlayoffGame[]> {
    try {
      const data = await this.executeQuery<any[]>('getMatchGames', () =>
        supabase
          .from('playoff_games')
          .select('*')
          .eq('match_id', matchId)
          .order('game_number', { ascending: true })
      );
      
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
      return [];
    }
  }
}
