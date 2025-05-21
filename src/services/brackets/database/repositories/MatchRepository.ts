
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatch } from "@/types/playoffs";
import { DatabasePlayoffMatch, MatchResultDTO } from "../types/DatabaseTypes";
import { toRow, toRuntime } from "../mappers/MatchMapper";

export class MatchRepository {
  async saveMatches(matches: DatabasePlayoffMatch[]): Promise<void> {
    try {
      if (!matches || matches.length === 0) return;

      const { error } = await supabase.from('playoff_matches').insert(matches);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving playoff matches:', error);
      throw error;
    }
  }

  async updateMatch(matchId: string, result: MatchResultDTO): Promise<void> {
    try {
      const { error } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: result.winnerId,
          loser_id: result.loserId,
          team1_score: result.team1Score,
          team2_score: result.team2Score,
          team1_game_wins: result.team1GameWins || 0,
          team2_game_wins: result.team2GameWins || 0,
          status: 'completed'
        })
        .eq('id', matchId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating match:', error);
      throw error;
    }
  }

  async getMatchById(matchId: string): Promise<PlayoffMatch | null> {
    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return toRuntime(data as DatabasePlayoffMatch);
    } catch (error) {
      console.error('Error getting match:', error);
      return null;
    }
  }
}
