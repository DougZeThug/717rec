
import { manager } from '../BracketsManagerInstance';
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateTeamIds, validateDivisionId, isValidUUID } from '@/utils/validation';

/**
 * Service for creating brackets with enhanced validation and error handling
 */
export class BracketCreationService {
  /**
   * Create a new bracket with comprehensive validation and transaction safety
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
      teamIdsDetailed: teamIds.map((id, index) => ({ 
        index, 
        id, 
        type: typeof id, 
        isEmpty: id === '', 
        isUndefined: id === 'undefined',
        isNull: id === 'null',
        isValidUUID: isValidUUID(id)
      }))
    });

    // Input validation with detailed error reporting
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Bracket name is required and cannot be empty');
    }

    if (!divisionId || typeof divisionId !== 'string' || divisionId.trim() === '') {
      throw new Error('Division ID is required and cannot be empty');
    }

    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      throw new Error('Team IDs array is required and cannot be empty');
    }

    // Validate division ID format
    const divisionValidation = validateDivisionId(divisionId);
    if (!divisionValidation.isValid) {
      console.error('Division validation failed:', divisionValidation.error);
      throw new Error(`Division validation failed: ${divisionValidation.error}`);
    }

    // Validate team IDs format and content
    const teamValidation = validateTeamIds(teamIds);
    if (!teamValidation.isValid) {
      console.error('Team validation failed:', teamValidation.errors);
      throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
    }

    // Enhanced team ID filtering with detailed logging
    const originalTeamCount = teamIds.length;
    const validTeamIds = teamIds.filter((id, index) => {
      const isValid = id && 
                     typeof id === 'string' && 
                     id.trim() !== '' && 
                     id !== 'undefined' && 
                     id !== 'null' &&
                     isValidUUID(id);
      
      if (!isValid) {
        console.warn(`Filtering out invalid team ID at index ${index}: "${id}" (type: ${typeof id})`);
      }
      return isValid;
    });

    if (validTeamIds.length !== originalTeamCount) {
      const invalidCount = originalTeamCount - validTeamIds.length;
      console.error(`Filtered out ${invalidCount} invalid team IDs from ${originalTeamCount} total`);
      throw new Error(`${invalidCount} team(s) have invalid IDs and cannot be used in the bracket`);
    }

    if (validTeamIds.length < 2) {
      throw new Error('At least 2 valid teams are required to create a bracket');
    }

    // Generate bracket ID
    const bracketId = uuidv4();
    console.log(`Creating bracket with ID ${bracketId}, format: ${format}, teams: ${validTeamIds.length}`);
    
    try {
      // Start a transaction-like operation by validating all external dependencies first
      console.log('Step 1: Verifying teams exist in database...');
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id')
        .in('id', validTeamIds);
      
      if (teamsError) {
        console.error('Error verifying teams:', teamsError);
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      if (!existingTeams || existingTeams.length !== validTeamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = validTeamIds.filter(id => !foundIds.includes(id));
        console.error('Missing teams:', missingIds);
        throw new Error(`Teams not found in database: ${missingIds.join(', ')}`);
      }
      
      // Verify all teams belong to the specified division
      const wrongDivisionTeams = existingTeams.filter(team => team.division_id !== divisionId);
      if (wrongDivisionTeams.length > 0) {
        console.error('Teams in wrong division:', wrongDivisionTeams);
        throw new Error(`${wrongDivisionTeams.length} team(s) do not belong to the selected division`);
      }
      
      console.log('All teams verified successfully');

      console.log('Step 2: Verifying division exists...');
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
      
      // Create the bracket record with validated data
      const bracket = {
        id: bracketId,
        title: name.trim(),
        format,
        division_id: divisionId
      };
      
      console.log('Step 3: Inserting bracket record:', bracket);
      const { error: bracketError } = await supabase
        .from('brackets')
        .insert(bracket);
      
      if (bracketError) {
        console.error('Failed to create bracket:', bracketError);
        throw new Error(`Failed to create bracket: ${bracketError.message}`);
      }
      
      console.log('Bracket record created successfully');
      
      // Build seeding array & create the stage
      console.log('Step 4: Preparing tournament manager setup...');
      
      // Helper function to fetch team names from their IDs with validation
      async function fetchTeamNames(ids: string[]): Promise<string[]> {
        console.log('Fetching team names for validated IDs:', ids);
        
        // Double-check all IDs are still valid UUIDs
        const invalidIds = ids.filter(id => !isValidUUID(id));
        if (invalidIds.length > 0) {
          throw new Error(`Invalid team IDs detected: ${invalidIds.join(', ')}`);
        }
        
        const { data, error } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', ids);
          
        if (error) {
          console.error('Error fetching team names:', error);
          throw new Error(`Team lookup failed: ${error.message}`);
        }
        
        if (!data || data.length !== ids.length) {
          const foundIds = data?.map(t => t.id) || [];
          const missingIds = ids.filter(id => !foundIds.includes(id));
          throw new Error(`Teams disappeared during bracket creation: ${missingIds.join(', ')}`);
        }
        
        const map = new Map(data.map(t => [t.id, t.name!]));
        const names = ids.map(id => map.get(id) ?? id);
        console.log('Team names mapped successfully:', names);
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
      
      console.log('Step 5: Creating tournament manager stage with seeding:', seeding);
      
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
        const errorMessage = `Tournament bracket creation failed: ${err?.message ?? 'unknown error'}`;
        console.error('Tournament manager error:', err);
        
        // Clean up the bracket record since tournament creation failed
        console.log('Cleaning up bracket record due to tournament creation failure...');
        await supabase.from('brackets').delete().eq('id', bracketId);
        
        throw new Error(errorMessage);
      }
      
      console.log(`Bracket creation completed successfully: ${bracketId}`);
      return bracketId;
      
    } catch (error: any) {
      console.error('Error in bracket creation process:', error);
      console.error('Error stack:', error.stack);
      
      // Enhanced error message for common issues
      let enhancedMessage = error.message;
      if (error.message.includes('invalid input syntax for type uuid')) {
        enhancedMessage = 'Invalid data format detected. Please refresh the page and try again.';
      } else if (error.message.includes('violates foreign key constraint')) {
        enhancedMessage = 'Selected teams or division no longer exist. Please refresh and try again.';
      }
      
      throw new Error(`Bracket creation failed: ${enhancedMessage}`);
    }
  }
}
