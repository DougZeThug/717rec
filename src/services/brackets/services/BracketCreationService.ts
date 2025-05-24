
import { manager } from '../BracketsManagerInstance';
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateTeamIds, validateDivisionId, isValidUUID } from '@/utils/validation';

/**
 * Service for creating brackets
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
    console.log('BracketCreationService.createBracket called with:', {
      format,
      name,
      divisionId,
      teamIds: teamIds.length > 0 ? teamIds : 'EMPTY_ARRAY',
      teamIdsDetailed: teamIds.map((id, index) => ({ index, id, type: typeof id, isEmpty: id === '' }))
    });

    // Validate division ID
    const divisionValidation = validateDivisionId(divisionId);
    if (!divisionValidation.isValid) {
      console.error('Division validation failed:', divisionValidation.error);
      throw new Error(`Division validation failed: ${divisionValidation.error}`);
    }

    // Validate team IDs
    const teamValidation = validateTeamIds(teamIds);
    if (!teamValidation.isValid) {
      console.error('Team validation failed:', teamValidation.errors);
      throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
    }

    // Additional safety check - filter out any invalid team IDs
    const validTeamIds = teamIds.filter(id => {
      const isValid = isValidUUID(id) && id.trim() !== '';
      if (!isValid) {
        console.warn(`Filtering out invalid team ID: "${id}"`);
      }
      return isValid;
    });

    if (validTeamIds.length !== teamIds.length) {
      console.error(`Original team count: ${teamIds.length}, Valid team count: ${validTeamIds.length}`);
      throw new Error(`${teamIds.length - validTeamIds.length} team(s) have invalid IDs`);
    }

    if (validTeamIds.length < 2) {
      throw new Error('At least 2 valid teams are required');
    }

    // Generate bracket ID
    const bracketId = uuidv4();
    console.log(`Creating bracket with ID ${bracketId}, format: ${format}, teams: ${validTeamIds.length}`);
    
    try {
      // Verify teams exist in database before creating bracket
      console.log('Verifying teams exist in database...');
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', validTeamIds);
      
      if (teamsError) {
        console.error('Error verifying teams:', teamsError);
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      if (!existingTeams || existingTeams.length !== validTeamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = validTeamIds.filter(id => !foundIds.includes(id));
        console.error('Missing teams:', missingIds);
        throw new Error(`Teams not found: ${missingIds.join(', ')}`);
      }
      
      console.log('All teams verified successfully');

      // Verify division exists
      console.log('Verifying division exists...');
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name')
        .eq('id', divisionId)
        .single();
      
      if (divisionError || !division) {
        console.error('Division verification failed:', divisionError);
        throw new Error(`Division not found: ${divisionId}`);
      }
      
      console.log('Division verified:', division.name);
      
      // Create the bracket record
      const bracket = {
        id: bracketId,
        title: name,
        format,
        division_id: divisionId
      };
      
      console.log('Inserting bracket record:', bracket);
      const { error: bracketError } = await supabase
        .from('brackets')
        .insert(bracket);
      
      if (bracketError) {
        console.error('Failed to create bracket:', bracketError);
        throw new Error(`Failed to create bracket: ${bracketError.message}`);
      }
      
      console.log('Bracket record created successfully');
      
      // Build seeding array & create the stage
      console.log('Preparing tournament manager setup...');
      
      // Helper function to fetch team names from their IDs
      async function fetchTeamNames(ids: string[]) {
        console.log('Fetching team names for IDs:', ids);
        const { data, error } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', ids);
        if (error) {
          console.error('Error fetching team names:', error);
          throw new Error(`team lookup – ${error.message}`);
        }
        const map = new Map(data.map(t => [t.id, t.name!]));
        const names = ids.map(id => map.get(id) ?? id);
        console.log('Team names mapped:', names);
        return names;
      }
      
      // Pad to next power-of-2 (BYEs = null)
      function pad<T>(arr: T[]): (T | null)[] {
        let size = 1;
        while (size < arr.length) size <<= 1;
        console.log(`Padding array from ${arr.length} to ${size} entries`);
        return [...arr, ...Array(size - arr.length).fill(null)];
      }
      
      const teamNames = await fetchTeamNames(validTeamIds);
      const seeding = pad(teamNames);
      
      console.log('Creating tournament manager stage with seeding:', seeding);
      
      try {
        await manager.create({
          name: bracket.title,
          tournamentId: bracket.id,
          type: format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination',
          seeding,
          settings: { grandFinal: 'double' },
        });
        
        console.log('Tournament manager stage created successfully');
      } catch (err: any) {
        const errorMessage = `Bracket failed – ${err?.message ?? 'unknown'}`;
        console.error('Tournament manager error:', err);
        toast({
          variant: "destructive",
          title: "Bracket Creation Error",
          description: errorMessage
        });
        throw err;
      }
      
      console.log(`Bracket creation completed successfully: ${bracketId}`);
      return bracketId;
    } catch (error: any) {
      console.error('Error in bracket creation process:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Bracket creation failed: ${error.message || 'Unknown error'}`);
    }
  }
}
