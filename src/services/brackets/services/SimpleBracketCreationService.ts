
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { BracketValidationService } from '../validation/BracketValidationService';
import { isValidUUID } from '@/utils/validation';
import { assertValidUuid, validateUuidArray } from '@/utils/uuidValidation';
import { manager } from '../BracketsManagerInstance';

// Define participant structure that's compatible with brackets-manager
interface ParticipantEntry extends Record<string, unknown> {
  id: string;
  name: string;
  tournament_id: string;
}

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

    try {
      // Validation with enhanced UUID checking
      if (!name?.trim()) {
        throw new Error('Bracket name is required');
      }

      // Validate division ID
      assertValidUuid(divisionId, 'divisionId');

      if (!Array.isArray(teamIds) || teamIds.length < 2) {
        throw new Error('At least 2 teams are required');
      }

      // Validate all team IDs
      const validatedTeamIds = validateUuidArray(teamIds, 'teamIds');

      // Additional business logic validation
      const teamValidation = BracketValidationService.validateTeamSelection(validatedTeamIds);
      if (!teamValidation.isValid) {
        throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
      }

      const bracketId = uuidv4();
      
      // Verify teams exist
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id')
        .in('id', validatedTeamIds);
      
      if (teamsError) {
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      if (!existingTeams || existingTeams.length !== validatedTeamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = validatedTeamIds.filter(id => !foundIds.includes(id));
        throw new Error(`Teams not found: ${missingIds.join(', ')}`);
      }
      
      // Verify division
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name')
        .eq('id', divisionId)
        .single();
      
      if (divisionError || !division) {
        throw new Error(`Division not found: ${divisionId}`);
      }
      
      // Create bracket
      const { error: bracketError } = await supabase
        .from('brackets')
        .insert({
          id: bracketId,
          title: name.trim(),
          format,
          division_id: divisionId
        });
      
      if (bracketError) {
        throw new Error(`Failed to create bracket: ${bracketError.message}`);
      }
      
      // Create tournament stage with validated participants only
      const participantEntries = await this.fetchTeamParticipants(validatedTeamIds, bracketId);
      console.log('Raw participant entries:', participantEntries);
      
      // Filter out null values and validate participants before creating tournament
      const validParticipants = this.validateAndFilterParticipants(participantEntries);
      console.log('Valid participants for tournament:', validParticipants);
      
      if (validParticipants.length === 0) {
        throw new Error('No valid participants found for tournament creation');
      }
      
      await manager.create({
        name: name.trim(),
        tournamentId: bracketId,
        type: format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination',
        seeding: validParticipants,
        settings: { grandFinal: 'double' },
      });
      
      console.log(`Bracket created successfully: ${bracketId}`);
      return bracketId;
      
    } catch (error: any) {
      console.error('Bracket creation failed:', error);
      
      // Clean up bracket record if it was created
      try {
        const bracketId = error.bracketId || uuidv4(); // Use the bracketId if available
        await supabase.from('brackets').delete().eq('id', bracketId);
      } catch (cleanupError) {
        console.error('Failed to cleanup bracket record:', cleanupError);
      }
      
      throw new Error(`Bracket creation failed: ${error.message}`);
    }
  }

  private static async fetchTeamParticipants(teamIds: string[], bracketId: string): Promise<ParticipantEntry[]> {
    // Validate inputs before proceeding
    assertValidUuid(bracketId, 'bracketId');
    validateUuidArray(teamIds, 'teamIds');
    
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
      
    if (error || !data) {
      throw new Error(`Failed to fetch team participants: ${error?.message}`);
    }
    
    const participantMap = new Map(data.map(t => [t.id, t.name!]));
    const participants = teamIds.map(id => {
      const name = participantMap.get(id);
      if (!name) {
        throw new Error(`Team not found for ID: ${id}`);
      }
      return { 
        id, 
        name, 
        tournament_id: bracketId
      } as ParticipantEntry;
    });
    
    return participants;
  }

  private static validateAndFilterParticipants(participants: ParticipantEntry[]): ParticipantEntry[] {
    console.log('Validating participants:', participants);
    
    const validParticipants = participants.filter(participant => {
      // Check for null or undefined
      if (!participant) {
        console.warn('Skipping null/undefined participant');
        return false;
      }
      
      // Validate required properties using our new validation functions
      try {
        assertValidUuid(participant.id, 'participant.id');
        assertValidUuid(participant.tournament_id, 'participant.tournament_id');
        
        if (!participant.name || typeof participant.name !== 'string') {
          console.warn('Skipping participant with invalid name:', participant);
          return false;
        }
        
        return true;
      } catch (error) {
        console.warn('Skipping invalid participant:', error instanceof Error ? error.message : String(error));
        return false;
      }
    });
    
    console.log(`Filtered ${participants.length} participants down to ${validParticipants.length} valid ones`);
    return validParticipants;
  }
}
