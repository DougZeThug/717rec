
import { supabase } from "@/integrations/supabase/client";
import { DatabaseOperationError, ITeamAdvancementService } from "./types";

/**
 * Service for managing team advancement through brackets
 */
export class TeamAdvancementService implements ITeamAdvancementService {
  /**
   * Advance a team to the next match
   * @param nextMatchId ID of the next match to advance to
   * @param teamId ID of the team to advance
   * @param isWinner Whether the team is advancing as a winner (true) or loser (false)
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    try {
      // Get the next match to determine which slot to fill
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('playoff_matches')
        .select('team1_id, team2_id, match_type')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw new DatabaseOperationError('advanceTeam', `Failed to get next match ${nextMatchId}`, nextMatchError);
      
      // Determine which slot to place the team in based on match type and existing teams
      let updateData: { team1_id?: string, team2_id?: string };
      
      if (nextMatch.match_type === 'finals') {
        // For finals matches, winners bracket winner goes to team1, losers bracket winner goes to team2
        if (isWinner) {
          updateData = { team1_id: teamId };
        } else {
          updateData = { team2_id: teamId };
        }
      } else {
        // For other match types, fill team1 slot first, then team2
        updateData = !nextMatch.team1_id
          ? { team1_id: teamId }
          : { team2_id: teamId };
      }
      
      const { error: updateError } = await supabase
        .from('playoff_matches')
        .update(updateData)
        .eq('id', nextMatchId);
      
      if (updateError) throw new DatabaseOperationError('advanceTeam', `Failed to advance team to next match ${nextMatchId}`, updateError);
    } catch (error) {
      console.error(`Error advancing team to next match ${nextMatchId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('advanceTeam', `Failed to advance team to next match ${nextMatchId}`, error as Error);
    }
  }
  
  /**
   * Handle special case for grand finals reset scenario
   * @param bracketId ID of the tournament bracket
   * @param winnersBracketChampionId ID of the winners bracket champion
   * @param losersBracketChampionId ID of the losers bracket champion
   * @param gf1WinnerId ID of the team that won the first grand finals match
   */
  async handleGrandFinalsReset(
    bracketId: string, 
    winnersBracketChampionId: string,
    losersBracketChampionId: string,
    gf1WinnerId: string
  ): Promise<string> {
    try {
      // If the losers bracket champion won GF1, we need a reset match
      if (gf1WinnerId === losersBracketChampionId) {
        // Create the reset match (Grand Finals 2)
        const resetMatch = {
          bracket_id: bracketId,
          round: 2,
          position: 1,
          match_type: 'finals',
          team1_id: losersBracketChampionId, // GF1 winner
          team2_id: winnersBracketChampionId, // GF1 loser
          status: 'pending',
          best_of: 3
        };
        
        const { data, error } = await supabase
          .from('playoff_matches')
          .insert(resetMatch)
          .select()
          .single();
        
        if (error) throw new DatabaseOperationError('handleGrandFinalsReset', `Failed to create reset match for bracket ${bracketId}`, error);
        
        return data.id;
      }
      
      // If winners bracket champion won GF1, tournament is over
      return '';
    } catch (error) {
      console.error(`Error handling grand finals reset for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('handleGrandFinalsReset', `Failed to handle reset for bracket ${bracketId}`, error as Error);
    }
  }
}
