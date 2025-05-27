
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { BracketValidationService } from '../validation/BracketValidationService';
import { isValidUUID } from '@/utils/validation';
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

    // Validation
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    if (!divisionId || !isValidUUID(divisionId)) {
      throw new Error('Valid division ID is required');
    }

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      throw new Error('At least 2 teams are required');
    }

    // Validate team IDs
    teamIds.forEach((teamId, index) => {
      if (!teamId || !isValidUUID(teamId)) {
        throw new Error(`Team ID at position ${index + 1} is invalid: ${teamId}`);
      }
    });

    const teamValidation = BracketValidationService.validateTeamSelection(teamIds);
    if (!teamValidation.isValid) {
      throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
    }

    const bracketId = uuidv4();
    
    try {
      // Verify teams exist
      const { data: existingTeams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, division_id')
        .in('id', teamIds);
      
      if (teamsError) {
        throw new Error(`Failed to verify teams: ${teamsError.message}`);
      }
      
      if (!existingTeams || existingTeams.length !== teamIds.length) {
        const foundIds = existingTeams?.map(t => t.id) || [];
        const missingIds = teamIds.filter(id => !foundIds.includes(id));
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
      
      // Create tournament stage
      const participantEntries = await this.fetchTeamParticipants(teamIds, bracketId);
      const seeding = this.padToNextPowerOfTwo(participantEntries);
      
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
      
      // Clean up bracket record
      try {
        await supabase.from('brackets').delete().eq('id', bracketId);
      } catch (cleanupError) {
        console.error('Failed to cleanup bracket record:', cleanupError);
      }
      
      throw new Error(`Bracket creation failed: ${error.message}`);
    }
  }

  private static async fetchTeamParticipants(teamIds: string[], bracketId: string): Promise<ParticipantEntry[]> {
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

  private static padToNextPowerOfTwo<T>(arr: T[]): (T | null)[] {
    let size = 1;
    while (size < arr.length) size <<= 1;
    return [...arr, ...Array(size - arr.length).fill(null)];
  }
}
