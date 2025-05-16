
import { supabase } from "@/integrations/supabase/client";
import { DatabaseOperationError, ITeamAdvancementService } from "./types";

/**
 * Service for managing team advancement through brackets
 */
export class TeamAdvancementService implements ITeamAdvancementService {
  /**
   * Advance a team to the next match
   */
  async advanceTeam(nextMatchId: string, teamId: string, isWinner: boolean): Promise<void> {
    try {
      // Get the next match to determine which slot to fill
      const { data: nextMatch, error: nextMatchError } = await supabase
        .from('playoff_matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatchId)
        .single();
      
      if (nextMatchError) throw new DatabaseOperationError('advanceTeam', `Failed to get next match ${nextMatchId}`, nextMatchError);
      
      // For simplicity, always assign to team1 if empty, otherwise team2
      // In a more complex implementation, you might want to consider seeding or bracket position
      const updateData = !nextMatch.team1_id
        ? { team1_id: teamId }
        : { team2_id: teamId };
      
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
}
