
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { BracketValidationService } from '../validation/BracketValidationService';
import { isValidUUID } from '@/utils/validation';
import { assertValidUuid, validateUuidArray } from '@/utils/uuidValidation';
import { manager } from '../BracketsManagerInstance';

export class SimpleBracketCreationService {
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    console.log('SimpleBracketCreationService.createBracket called:', {
      format, name, divisionId, teamCount: teamIds.length, teamIds
    });

    // Move bracketId declaration outside try block for proper scope
    const bracketId = uuidv4();

    try {
      // Simplified validation
      if (!name?.trim()) {
        throw new Error('Bracket name is required');
      }

      if (!divisionId?.trim()) {
        throw new Error('Division ID is required');
      }

      if (!Array.isArray(teamIds) || teamIds.length < 2) {
        throw new Error('At least 2 teams are required');
      }

      // Filter out any invalid team IDs
      const validTeamIds = teamIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
      
      if (validTeamIds.length < 2) {
        throw new Error('At least 2 valid teams are required');
      }

      console.log('Using valid team IDs:', validTeamIds);
      
      // Verify teams exist and get their data
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id')
        .in('id', validTeamIds);
      
      if (teamsError) {
        console.error('Teams query error:', teamsError);
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      if (!existingTeams || existingTeams.length !== validTeamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = validTeamIds.filter(id => !foundIds.includes(id));
        console.error('Missing teams:', missingIds);
        throw new Error(`Teams not found: ${missingIds.join(', ')}`);
      }
      
      // Verify division exists
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name')
        .eq('id', divisionId)
        .single();
      
      if (divisionError || !division) {
        console.error('Division query error:', divisionError);
        throw new Error(`Division not found: ${divisionId}`);
      }
      
      console.log('Validation passed, creating bracket...');
      
      // Create bracket record first
      const { error: bracketError } = await supabase
        .from('brackets')
        .insert({
          id: bracketId,
          title: name.trim(),
          format,
          division_id: divisionId
        });
      
      if (bracketError) {
        console.error('Bracket creation error:', bracketError);
        throw new Error(`Failed to create bracket: ${bracketError.message}`);
      }
      
      console.log('Bracket record created successfully');
      
      // Create participants using simple string array (team names only)
      const participants = existingTeams.map(team => team.name);
      
      console.log('Creating tournament with participants:', participants);
      
      // Create tournament using brackets-manager with simplified seeding
      await manager.create({
        name: name.trim(),
        tournamentId: bracketId,
        type: format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination',
        seeding: participants, // Use simple string array
        settings: { 
          grandFinal: format === BRACKET_FORMATS.DOUBLE ? 'double' : 'simple',
          skipFirstRound: false
        },
      });
      
      console.log(`Tournament created successfully with brackets-manager`);
      
      // Skip match synchronization for now to avoid API issues
      console.log('Bracket created successfully, match synchronization will be handled by adapter');
      
      console.log(`Bracket created successfully: ${bracketId}`);
      return bracketId;
      
    } catch (error: any) {
      console.error('Bracket creation failed:', error);
      
      // Clean up bracket record if it was created (bracketId now in scope)
      try {
        await supabase.from('brackets').delete().eq('id', bracketId);
        console.log('Cleaned up bracket record after error');
      } catch (cleanupError) {
        console.error('Failed to cleanup bracket record:', cleanupError);
      }
      
      throw new Error(`Bracket creation failed: ${error.message}`);
    }
  }

  private static determineMatchType(match: any, format: BracketFormat): string {
    // Simple logic to determine match type based on brackets-manager data
    if (format === BRACKET_FORMATS.SINGLE) {
      return 'winners';
    }
    
    // For double elimination, we'd need more sophisticated logic
    // For now, default to winners bracket
    return 'winners';
  }
}
