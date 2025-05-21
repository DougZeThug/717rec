
import { supabase } from "@/integrations/supabase/client";
import { PlayoffGame } from "@/types/playoffs";

export class GameRepository {
  async saveGames(games: PlayoffGame[]): Promise<void> {
    try {
      if (!games || games.length === 0) return;
      
      const gamesForDb = games.map(game => ({
        id: game.id,
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));
      
      const { error } = await supabase.from('playoff_games').insert(gamesForDb);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff games:', error);
      throw error;
    }
  }

  async getGamesByMatchId(matchId: string): Promise<PlayoffGame[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
      
      if (error) throw error;
      
      return data.map(game => ({
        id: game.id,
        matchId: game.match_id,
        gameNumber: game.game_number,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winnerId: game.winner_id
      }));
    } catch (error) {
      console.error('Error getting match games:', error);
      return [];
    }
  }
}
