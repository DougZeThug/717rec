
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { BracketValidationService } from '../validation/BracketValidationService';
import { isValidUUID } from '@/utils/validation';
import { manager } from '../BracketsManagerInstance';

// Define participant structure for seeding
interface ParticipantEntry {
  id: string;
  name: string;
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

    // Enhanced input validation with specific error messages
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    // Explicit validation for divisionId to prevent empty strings
    if (!divisionId) {
      throw new Error('Division ID is required and cannot be undefined');
    }

    if (typeof divisionId !== 'string') {
      throw new Error('Division ID must be a string');
    }

    if (divisionId === '' || divisionId.trim() === '') {
      throw new Error('Division ID cannot be empty or whitespace');
    }

    if (!isValidUUID(divisionId)) {
      throw new Error(`Division ID has invalid UUID format: "${divisionId}"`);
    }

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      throw new Error('At least 2 teams are required');
    }

    // Enhanced team validation - check for empty strings explicitly
    teamIds.forEach((teamId, index) => {
      if (!teamId || typeof teamId !== 'string') {
        throw new Error(`Team ID at position ${index + 1} is invalid: ${teamId}`);
      }
      if (teamId === '' || teamId.trim() === '') {
        throw new Error(`Team ID at position ${index + 1} cannot be empty`);
      }
      if (!isValidUUID(teamId)) {
        throw new Error(`Team ID at position ${index + 1} has invalid UUID format: "${teamId}"`);
      }
    });

    // Validate team IDs with detailed error reporting
    const teamValidation = BracketValidationService.validateTeamSelection(teamIds);
    if (!teamValidation.isValid) {
      console.error('Team validation failed:', teamValidation);
      throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
    }

    const bracketId = uuidv4();
    console.log('Generated bracket ID:', bracketId);
    
    try {
      // Verify teams exist with detailed logging
      console.log('Verifying teams exist for IDs:', teamIds);
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id')
        .in('id', teamIds);
      
      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      console.log('Found teams:', existingTeams);
      
      if (!existingTeams || existingTeams.length !== teamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = teamIds.filter(id => !foundIds.includes(id));
        console.error('Missing teams:', missingIds);
        throw new Error(`Teams not found: ${missingIds.join(', ')}`);
      }
      
      // Verify division with detailed logging
      console.log('Verifying division exists for ID:', divisionId);
      const { data: division, error: divisionError } = await supabase
        .from('divisions')
        .select('id, name')
        .eq('id', divisionId)
        .single();
      
      if (divisionError || !division) {
        console.error('Division verification failed:', { divisionError, division });
        throw new Error(`Division not found: ${divisionId}`);
      }
      
      console.log('Found division:', division);
      
      // Create bracket with detailed logging
      console.log('Creating bracket record:', { bracketId, name: name.trim(), format, divisionId });
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
      
      // Create tournament stage with participant objects containing UUIDs
      const participantEntries = await this.fetchTeamParticipants(teamIds);
      const seeding = this.padToNextPowerOfTwo(participantEntries);
      
      console.log('Creating tournament with manager using participant objects:', { 
        name: name.trim(), 
        tournamentId: bracketId, 
        seedingCount: seeding.length,
        seeding: seeding.map(p => p ? { id: p.id, name: p.name } : null)
      });
      
      await manager.create({
        name: name.trim(),
        tournamentId: bracketId,
        type: format === BRACKET_FORMATS.DOUBLE ? 'double_elimination' : 'single_elimination',
        seeding,
        settings: { grandFinal: 'double' },
      });
      
      console.log(`Bracket created successfully: ${bracketId}`);
      return bracketId;
      
    } catch (error: any) {
      console.error('Bracket creation failed:', error);
      
      // Clean up bracket record if tournament creation failed
      try {
        await supabase.from('brackets').delete().eq('id', bracketId);
        console.log('Cleaned up bracket record after failure');
      } catch (cleanupError) {
        console.error('Failed to cleanup bracket record:', cleanupError);
      }
      
      throw new Error(`Bracket creation failed: ${error.message}`);
    }
  }

  private static async fetchTeamParticipants(teamIds: string[]): Promise<ParticipantEntry[]> {
    console.log('Fetching team participants for IDs:', teamIds);
    
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
      
    if (error || !data) {
      throw new Error(`Failed to fetch team participants: ${error?.message}`);
    }
    
    // Ensure we maintain the original order and validate UUIDs
    const participantMap = new Map(data.map(t => [t.id, t.name!]));
    const participants = teamIds.map(id => {
      const name = participantMap.get(id);
      if (!name) {
        throw new Error(`Team not found for ID: ${id}`);
      }
      if (!isValidUUID(id)) {
        throw new Error(`Invalid team UUID: ${id}`);
      }
      return { id, name };
    });
    
    console.log('Created participant entries:', participants);
    return participants;
  }

  private static padToNextPowerOfTwo<T>(arr: T[]): (T | null)[] {
    let size = 1;
    while (size < arr.length) size <<= 1;
    const padded = [...arr, ...Array(size - arr.length).fill(null)];
    console.log(`Padded array from ${arr.length} to ${size} entries`);
    return padded;
  }
}
