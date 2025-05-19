
import { supabase } from "@/integrations/supabase/client";

/**
 * Service for managing match scores
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
      // Get match details
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      // Determine winner based on game wins
      const winnerId = team1GameWins > team2GameWins ? match.team1_id : match.team2_id;
      const loserId = winnerId === match.team1_id ? match.team2_id : match.team1_id;
      
      // Start a transaction for updating the match and games
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          team1_game_wins: team1GameWins,
          team2_game_wins: team2GameWins,
          winner_id: winnerId,
          loser_id: loserId,
          iscompleted: true
        })
        .eq('id', matchId);
      
      if (updateError) throw updateError;
      
      // Store individual game results if provided
      if (games && games.length > 0) {
        // Delete existing games first
        const { error: deleteError } = await supabase
          .from('playoff_games')
          .delete()
          .eq('match_id', matchId);
          
        if (deleteError) throw deleteError;
        
        // Insert new games
        const gamesWithIds = games.map((game, index) => ({
          match_id: matchId,
          game_number: index + 1,
          team1_score: game.team1Score,
          team2_score: game.team2Score,
          winner_id: game.team1Score > game.team2Score ? match.team1_id : match.team2_id
        }));
        
        const { error: gamesError } = await supabase
          .from('playoff_games')
          .insert(gamesWithIds);
          
        if (gamesError) throw gamesError;
      }
      
      // Now update bracket progression
      await this.advanceTeamInBracket(matchId, winnerId, loserId);
    } catch (error) {
      console.error("Error updating match score:", error);
      throw error;
    }
  }
  
  /**
   * Advance team in bracket based on match result
   */
  private static async advanceTeamInBracket(
    matchId: string,
    winnerId: string,
    loserId: string
  ): Promise<void> {
    try {
      // Get match details including next match references
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('next_match_id, next_loser_match_id, bracket_id')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      
      // Advance winner to next match if available
      if (match.next_match_id) {
        await this.placeTeamInNextMatch(match.next_match_id, winnerId);
      }
      
      // Advance loser to loser's bracket if available
      if (match.next_loser_match_id) {
        await this.placeTeamInNextMatch(match.next_loser_match_id, loserId);
      }
      
      // Check if bracket is complete
      await this.checkBracketCompletion(match.bracket_id);
    } catch (error) {
      console.error("Error advancing team in bracket:", error);
      throw error;
    }
  }
  
  /**
   * Place team in the next match
   */
  private static async placeTeamInNextMatch(
    nextMatchId: string,
    teamId: string
  ): Promise<void> {
    try {
      // Get the next match
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw nextMatchError;
      
      // Place team in the appropriate slot
      const updateData = !nextMatch.team1_id
        ? { team1_id: teamId }
        : { team2_id: teamId };
      
      const { error: updateError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', nextMatchId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error placing team in next match:", error);
      throw error;
    }
  }
  
  /**
   * Check if bracket is complete and update bracket state
   */
  private static async checkBracketCompletion(
    bracketId: string
  ): Promise<void> {
    try {
      // Count matches with no winner set
      const { data: pendingMatches, error: countError } = await supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('bracket_id', bracketId)
        .is('winner_id', null);
      
      if (countError) throw countError;
      
      // If no more pending matches, bracket is complete
      if (pendingMatches?.length === 0) {
        // Find final match and get winner
        const { data: finalMatch, error: finalError } = await supabase
          .from('matches')
          .select('winner_id')
          .eq('bracket_id', bracketId)
          .eq('match_type', 'finals')
          .order('round_number', { ascending: false })
          .limit(1)
          .single();
        
        if (finalError && finalError.code !== 'PGRST116') throw finalError; // Ignore not found
        
        // Update bracket state if we found a final match
        if (finalMatch) {
          const { error: updateError } = await supabase
            .from('brackets')
            .update({ state: 'complete' })
            .eq('id', bracketId);
          
          if (updateError) throw updateError;
        }
      }
    } catch (error) {
      console.error("Error checking bracket completion:", error);
      // Don't throw here, as this is a secondary operation
    }
  }
}
