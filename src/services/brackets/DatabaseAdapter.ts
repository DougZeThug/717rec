
import { supabase } from "@/integrations/supabase/client";
import { BracketMatch, MatchResult, PlayoffGame, PlayoffMatch, MatchType } from "./types";
import { DatabasePlayoffMatch, MatchResultDTO, DatabaseMatchResult } from "./database/types";

/**
 * Handles database operations for standard brackets
 */
export class DatabaseAdapter {
  /**
   * Save bracket matches to the database
   */
  static async saveBracketMatches(matches: BracketMatch[]): Promise<void> {
    try {
      // Convert to database format
      // Map play-in and play-in-2 to winners for database compatibility
      const dbMatches = matches.map(match => ({
        id: match.id,
        round_number: match.round,
        position: match.position,
        match_type: this.convertMatchTypeForDB(match.matchType),
        team1_id: match.team1Id,
        team2_id: match.team2Id,
        next_match_id: match.nextWinMatchId,
        next_loser_match_id: match.nextLoseMatchId,
        winner_id: match.winnerId,
        bracket_id: match.bracket_id,
        // Store team seeds in the metadata field
        metadata: {
          team1_seed: match.team1Seed,
          team2_seed: match.team2Seed
        }
      }));

      console.log(`Saving ${dbMatches.length} standard bracket matches to matches table`);

      const { error } = await supabase
        .from('matches')
        .insert(dbMatches);
      
      if (error) {
        console.error('Error saving bracket matches:', error);
        throw error;
      }
      
      console.log('Successfully saved standard bracket matches');
    } catch (error) {
      console.error('Error saving bracket matches:', error);
      throw error;
    }
  }
  
  /**
   * Convert match type for database compatibility
   * Maps play-in and play-in-2 to winners for database storage
   */
  private static convertMatchTypeForDB(matchType: MatchType): "winners" | "losers" | "finals" {
    if (matchType === "play-in" || matchType === "play-in-2") {
      return "winners";
    }
    return matchType as "winners" | "losers" | "finals";
  }
  
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
      team1_game_wins: matchResult.games?.filter(g => g.winnerId === matchResult.winnerId).length || 0,
      team2_game_wins: matchResult.games?.filter(g => g.winnerId !== matchResult.winnerId).length || 0,
      completed: true,
      games: matchResult.games
    };
  }

  /**
   * Convert database DatabaseMatchResult to app MatchResult
   */
  static convertToAppMatchResult(dbResult: DatabaseMatchResult): MatchResult {
    return {
      matchId: dbResult.match_id,
      winnerId: dbResult.winner_id,
      loserId: dbResult.loser_id,
      team1Score: dbResult.team1_score,
      team2Score: dbResult.team2_score,
      games: dbResult.games || []
    };
  }
  
  /**
   * Update a match with a result and advance teams
   */
  static async updateMatchResult(
    matchId: string,
    winnerId: string,
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
        await DatabaseAdapter.advanceTeamToNextMatch(match.next_match_id, winnerId, true);
      }
      
      // Advance loser to next losers match if it exists
      if (match.next_loser_match_id) {
        await DatabaseAdapter.advanceTeamToNextMatch(match.next_loser_match_id, loserId, false);
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      throw error;
    }
  }
  
  /**
   * Advance a team to the next match
   */
  private static async advanceTeamToNextMatch(
    nextMatchId: string,
    teamId: string,
    isWinner: boolean
  ): Promise<void> {
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
