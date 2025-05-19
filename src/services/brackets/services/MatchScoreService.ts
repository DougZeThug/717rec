
import { supabase } from "@/integrations/supabase/client";
import { matchResultService } from "./MatchResultService";

/**
 * Service for match score operations
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
    try {
      // Get the match first to identify team IDs
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      
      if (!matchData) {
        throw new Error("Match not found");
      }
      
      // Determine the winner based on game wins
      const winnerId = team1GameWins > team2GameWins 
        ? matchData.team1_id
        : matchData.team2_id;
      
      if (!winnerId) {
        throw new Error("Could not determine winner - team IDs not found");
      }
      
      // Update match using brackets-manager
      await matchResultService.updateMatchResult(matchId, winnerId, team1Score, team2Score);
      
      // Additionally store game-by-game results if needed
      if (games && games.length > 0) {
        for (let i = 0; i < games.length; i++) {
          await supabase.from('games').insert({
            match_id: matchId,
            game_number: i + 1,
            team1_score: games[i].team1Score,
            team2_score: games[i].team2Score
          });
        }
      }
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
}
