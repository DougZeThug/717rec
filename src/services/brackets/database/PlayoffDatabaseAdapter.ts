
import { supabase } from "@/integrations/supabase/client";
import { MatchResult, PlayoffGame } from "../types";
import { MatchResultService } from "./MatchResultService";
import { DatabaseMatchResult } from "./types";

/**
 * Adapter for playoff bracket database operations
 */
export class PlayoffDatabaseAdapter {
  /**
   * Convert app MatchResult to database DatabaseMatchResult
   */
  static convertToDbMatchResult(matchResult: MatchResult): DatabaseMatchResult {
    return {
      match_id: matchResult.matchId,
      winner_id: matchResult.winnerId,
      loser_id: matchResult.loserId,
      team1_score: matchResult.team1Score,
      team2_score: matchResult.team2Score,
      team1_game_wins: matchResult.games?.filter(g => g.winnerId === 'team1Id').length || 0,
      team2_game_wins: matchResult.games?.filter(g => g.winnerId === 'team2Id').length || 0,
      completed: true,
      games: matchResult.games
    };
  }

  /**
   * Submit a match result and handle bracket advancement
   */
  static async submitMatchResult(matchResult: MatchResult): Promise<void> {
    try {
      console.log("Submitting match result:", matchResult);
      
      // Convert to database format
      const dbMatchResult = this.convertToDbMatchResult(matchResult);
      
      // Save the match result using the service
      const matchResultService = new MatchResultService();
      await matchResultService.recordMatchResult(dbMatchResult);
      
      // Save individual games if they exist
      if (matchResult.games && matchResult.games.length > 0) {
        await this.savePlayoffGames(matchResult.games);
      }
      
      console.log("Match result submitted successfully");
    } catch (error) {
      console.error("Error submitting match result:", error);
      throw error;
    }
  }
  
  /**
   * Save playoff games to the database
   */
  private static async savePlayoffGames(games: PlayoffGame[]): Promise<void> {
    try {
      // Prepare games for database insert
      const gamesToInsert = games.map(game => ({
        id: game.id.startsWith('temp-') ? undefined : game.id, // Use undefined to generate new UUID
        match_id: game.matchId,
        game_number: game.gameNumber,
        team1_score: game.team1Score,
        team2_score: game.team2Score,
        winner_id: game.winnerId
      }));
      
      // Insert games into database
      const { error } = await supabase
        .from('playoff_games')
        .upsert(gamesToInsert, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving playoff games:", error);
      throw error;
    }
  }
  
  /**
   * Load playoff games for a specific match
   */
  static async loadPlayoffGames(matchId: string): Promise<PlayoffGame[]> {
    try {
      const { data, error } = await supabase
        .from('playoff_games')
        .select('*')
        .eq('match_id', matchId)
        .order('game_number', { ascending: true });
        
      if (error) throw error;
      
      // Convert to app format
      return (data || []).map(game => ({
        id: game.id,
        matchId: game.match_id,
        gameNumber: game.game_number,
        team1Score: game.team1_score,
        team2Score: game.team2_score,
        winnerId: game.winner_id
      }));
    } catch (error) {
      console.error("Error loading playoff games:", error);
      return [];
    }
  }
}
