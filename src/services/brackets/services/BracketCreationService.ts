
import { manager } from '../BracketsManagerInstance';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Create a new bracket
 * @param format 'Single Elimination' or 'Double Elimination'
 * @param name Bracket name
 * @param divisionId Division ID
 * @param teamIds Array of team IDs
 * @returns Bracket ID
 */
export class BracketCreationService {
  /**
   * Create a new bracket
   * @param format 'Single Elimination' or 'Double Elimination'
   * @param name Bracket name
   * @param divisionId Division ID
   * @param teamIds Array of team IDs
   * @returns Bracket ID
   */
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    // Validate inputs
    if (!divisionId || divisionId === 'undefined') {
      throw new Error('Valid division ID is required');
    }
    
    // Validate team IDs
    const validTeamIds = teamIds.filter(id => id && id !== 'undefined' && id !== '');
    if (validTeamIds.length !== teamIds.length) {
      throw new Error('One or more teams missing IDs');
    }

    // Generate bracket ID
    const bracketId = uuidv4();
    console.log(`Creating bracket with ID ${bracketId}, format: ${format}, teams: ${validTeamIds.length}`);
    
    try {
      // Create the bracket record
      const bracket = {
        id: bracketId,
        name,
        format,
        divisionId
      };
      
      const createResult = await PlayoffDatabaseAdapter.createBracket(bracket);
      
      if (createResult.error) {
        console.error('Failed to create bracket:', createResult.error);
        throw new Error(`Failed to create bracket: ${createResult.error.message}`);
      }
      
      // --------------------------------------------
      // Build seeding array & create the stage
      // --------------------------------------------
      
      // Helper function to fetch team names from their IDs
      async function fetchTeamNames(ids: string[]) {
        const { data, error } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', ids);
        if (error) throw new Error(`team lookup – ${error.message}`);
        const map = new Map(data.map(t => [t.id, t.name!]));
        return ids.map(id => map.get(id) ?? id); // fallback to id text
      }
      
      // Pad to next power-of-2 (BYEs = null)
      function pad<T>(arr: T[]): (T | null)[] {
        let size = 1;
        while (size < arr.length) size <<= 1;
        return [...arr, ...Array(size - arr.length).fill(null)];
      }
      
      const teamNames = await fetchTeamNames(validTeamIds);
      const seeding = pad(teamNames);
      
      try {
        await manager.create({
          name: bracket.name,
          tournamentId: bracket.id,   // equals our brackets table PK
          type: format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination',
          seeding,
          settings: { grandFinal: 'double' }, // LB champ must win twice
        });
      } catch (err: any) {
        const errorMessage = `Bracket failed – ${err?.message ?? 'unknown'}`;
        toast({
          variant: "destructive",
          title: "Bracket Creation Error",
          description: errorMessage
        });
        throw err;  // Re-throw for logs
      }
      
      return bracketId;
    } catch (error: any) {
      console.error('Error in bracket creation process:', error);
      throw new Error(`Bracket creation failed: ${error.message || 'Unknown error'}`);
    }
  }
}
