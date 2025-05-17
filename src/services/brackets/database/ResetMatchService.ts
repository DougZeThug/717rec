
import { supabase } from "@/integrations/supabase/client";
import { PlayoffMatchType } from "../types";
import { DatabaseOperationError, IResetMatchService } from "./types";

/**
 * Service for handling reset matches in playoffs
 */
export class ResetMatchService implements IResetMatchService {
  /**
   * Create a reset match when needed
   * @param bracketId ID of the tournament bracket
   * @param team1Id ID of the team that won the first grand finals match 
   * @param team2Id ID of the team that lost the first grand finals match
   * @returns ID of the newly created reset match
   */
  async createResetMatch(bracketId: string, team1Id: string, team2Id: string): Promise<string> {
    try {
      // Check if a reset match already exists for this bracket
      const { data: existingMatches, error: checkError } = await supabase
        .from('playoff_matches')
        .select('id')
        .eq('bracket_id', bracketId)
        .eq('round', 2)
        .eq('match_type', 'finals');
      
      if (checkError) throw new DatabaseOperationError('createResetMatch', `Failed to check for existing reset match in bracket ${bracketId}`, checkError);
      
      // If a reset match already exists, don't create another one
      if (existingMatches && existingMatches.length > 0) {
        console.log(`Reset match already exists for bracket ${bracketId}, id: ${existingMatches[0].id}`);
        return existingMatches[0].id;
      }
      
      // Create the reset match with appropriate teams
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
        match_type: 'finals' as PlayoffMatchType, // Type cast to ensure correct type
        team1_id: team1Id, // Winner of GF1 (usually the loser's bracket champion)
        team2_id: team2Id, // Loser of GF1 (usually the winner's bracket champion) 
        status: 'pending',
        best_of: 3
      };

      const { data, error } = await supabase
        .from('playoff_matches')
        .insert(resetMatch)
        .select()
        .single();
      
      if (error) throw new DatabaseOperationError('createResetMatch', `Failed to create reset match for bracket ${bracketId}`, error);
      
      console.log(`Successfully created reset match for bracket ${bracketId}, id: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error(`Error creating reset match for bracket ${bracketId}:`, error);
      throw error instanceof DatabaseOperationError 
        ? error 
        : new DatabaseOperationError('createResetMatch', `Failed to create reset match for bracket ${bracketId}`, error as Error);
    }
  }
}
