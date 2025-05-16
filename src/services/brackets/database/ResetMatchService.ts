
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatchType } from "../types";
import { DatabaseOperationError, IResetMatchService } from "./types";

/**
 * Service for handling reset matches in playoffs
 */
export class ResetMatchService implements IResetMatchService {
  /**
   * Create a reset match when needed
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    try {
      const resetMatch: {
        bracket_id: string;
        round: number;
        position: number;
        match_type: PlayoffMatchType;
        team1_id: string;
        team2_id: string;
        status: "pending";
        best_of: number;
      } = {
        bracket_id: bracketId,
        round: 2, // Second finals round
        position: 1,
        match_type: 'finals',
        team1_id: team1Id,
        team2_id: team2Id,
        status: 'pending',
        best_of: 3
      };

      const { data, error } = await supabase
        .from('playoff_matches')
        .insert(resetMatch)
        .select()
        .single();
      
      if (error) throw new DatabaseOperationError('createResetMatch', `Failed to create reset match for bracket ${bracketId}`, error);
      
      return data.id;
    } catch (error) {
      console.error(`Error creating reset match for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('createResetMatch', `Failed to create reset match for bracket ${bracketId}`, error as Error);
    }
  }
}
