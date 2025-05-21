
import { manager } from '../BracketsManagerInstance';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { Team } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Helper function to fetch team names from their IDs
 */
async function fetchTeamNames(teamIds: string[]) {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', teamIds);
  if (error) throw new Error(`team lookup – ${error.message}`);
  const map = new Map(data.map(t => [t.id, t.name!]));
  return teamIds.map(id => ({ id, name: map.get(id) ?? id }));
}

/**
 * Helper function to pad an array to the next power of 2 size
 * Fills remaining slots with null values for BYEs
 */
function padToPowerOfTwo<T>(arr: T[]): (T|null)[] {
  let size = 1; 
  while (size < arr.length) size <<= 1;
  return [...arr, ...Array(size - arr.length).fill(null)];
}

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
      
      // Fetch team names
      const teams = await fetchTeamNames(validTeamIds);
      
      // Let brackets-manager insert participants
      await manager.registerParticipants(
        teams.map((t, i) => ({
          id: t.id,
          name: t.name,
          tournament_id: bracketId,
          position: i + 1,
        }))
      );
      
      // Build seeding array (names only, BYEs = null)
      const seeding = padToPowerOfTwo(teams.map(t => t.name));
      
      try {
        // Create the stage (bracket structure)
        const stageId = uuidv4();
        await manager.createStage({
          id: stageId,
          name: `${format} Bracket`,
          type: manager.formatToStageType(format),
          seeding: seeding,
          settings: {
            seedOrdering: ['natural'], // Use natural seeding order
            grandFinal: 'double'       // For double elimination
          },
          tournamentId: bracketId,
          divisionId
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
