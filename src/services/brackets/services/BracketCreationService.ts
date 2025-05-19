
import { supabase } from "@/integrations/supabase/client";
import { Team } from "@/types";
import { BracketFormat } from "@/constants/brackets";
import { bracketManager } from "../manager/BracketManager";
import { bracketCreationService as existingService } from "./BracketCreationService";

/**
 * Service for bracket creation operations
 */
export class BracketCreationService {
  /**
   * Create a new bracket
   */
  static async createBracket(
    name: string,
    format: BracketFormat,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    try {
      // Get the teams to include in the bracket
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, seed, image_url, logo_url')
        .in('id', teamIds);
      
      if (teamsError) throw teamsError;
      
      // Create the tournament bracket using brackets-manager
      // Only support Single and Double Elimination formats (no Round Robin)
      if (format !== 'Single Elimination' && format !== 'Double Elimination') {
        throw new Error(`Unsupported bracket format: ${format}`);
      }
      
      const bracketId = await existingService.createTournamentBracket(
        format, 
        name, 
        divisionId, 
        teams
      );
      
      return bracketId;
    } catch (error) {
      console.error("Error creating bracket:", error);
      throw error;
    }
  }
}
