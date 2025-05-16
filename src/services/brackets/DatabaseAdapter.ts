
import { supabase } from "@/integrations/supabase/client";
import { BracketMatch } from "./types";
import { PlayoffDatabaseAdapter } from "./PlayoffDatabaseAdapter";

/**
 * Handles persistence of bracket data to the database
 */
export class DatabaseAdapter {
  /**
   * Save all matches to the database
   * @param matches Array of matches to save
   */
  static async saveBracketMatches(matches: BracketMatch[]): Promise<void> {
    // Convert to database format
    const dbMatches = matches.map(match => ({
      id: match.id,
      round_number: match.round,
      position: match.position,
      match_type: match.matchType === "play-in" ? "winners" : match.matchType, // Map play-in to winners for database compatibility
      team1_id: match.team1Id,
      team2_id: match.team2Id,
      next_match_id: match.nextWinMatchId,
      next_loser_match_id: match.nextLoseMatchId,
      winner_id: match.winnerId,
      bracket_id: match.bracket_id,
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
    }));

    try {
      const { error } = await supabase
        .from('matches')
        .insert(dbMatches);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving bracket matches:', error);
      throw error;
    }
  }
  
  /**
   * Update a match with a winner and advance to next rounds
   * @param matchId ID of the match to update
   * @param winnerId ID of the winning team
   * @param team1Score Score of team 1
   * @param team2Score Score of team 2
   */
  static async updateMatchResult(
    matchId: string, 
    winnerId: string | null, 
    team1Score: number, 
    team2Score: number
  ): Promise<void> {
    try {
      // Get the match to update
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();
      
      if (matchError) throw matchError;
      
      // Determine loser ID
      const loserId = match.team1_id === winnerId ? match.team2_id : match.team1_id;
      
      // Update the current match
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          loser_id: loserId,
          team1_score: team1Score,
          team2_score: team2Score,
          iscompleted: true
        })
        .eq('id', matchId);
      
      if (updateError) throw updateError;
      
      // Advance winner to next winners match if it exists
      if (match.next_match_id) {
        await this.advanceTeamToNextMatch(match.next_match_id, winnerId, true);
      }
      
      // Advance loser to next losers match if it exists
      if (match.next_loser_match_id) {
        await this.advanceTeamToNextMatch(match.next_loser_match_id, loserId, false);
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      throw error;
    }
  }
  
  /**
   * Advance a team to the next match
   * @param nextMatchId ID of the next match
   * @param teamId ID of the team to advance
   * @param isWinner Whether the team is a winner or loser
   */
  private static async advanceTeamToNextMatch(
    nextMatchId: string,
    teamId: string | null,
    isWinner: boolean
  ): Promise<void> {
    if (!teamId) return;
    
    try {
      // Get the next match
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw nextMatchError;
      
      // For simplicity, always assign to team1 if empty, otherwise team2
      // In a more complex implementation, you might want to consider seeding
      const updateData = !nextMatch.team1_id
        ? { team1_id: teamId }
        : { team2_id: teamId };
      
      const { error: updateError } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', nextMatchId);
      
      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error advancing team to next match:', error);
      throw error;
    }
  }
}
