
import { v4 as uuidv4 } from 'uuid';
import { BracketFormat, BRACKET_FORMATS } from '@/constants/brackets';
import { supabase } from "@/integrations/supabase/client";
import { BracketValidationService } from '../validation/BracketValidationService';
import { isValidUUID } from '@/utils/validation';
import { manager } from '../BracketsManagerInstance';

export class SimpleBracketCreationService {
  static async createBracket(
    format: BracketFormat,
    name: string,
    divisionId: string,
    teamIds: string[]
  ): Promise<string> {
    console.log('SimpleBracketCreationService.createBracket called:', {
      format, name, divisionId, teamCount: teamIds.length
    });

    // Input validation
    if (!name?.trim()) {
      throw new Error('Bracket name is required');
    }

    if (!divisionId?.trim() || !isValidUUID(divisionId)) {
      throw new Error('Valid division ID is required');
    }

    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      throw new Error('At least 2 teams are required');
    }

    // Validate team IDs
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
      const teamNames = await this.fetchTeamNames(teamIds);
      const seeding = this.padToNextPowerOfTwo(teamNames);
      
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
      await supabase.from('brackets').delete().eq('id', bracketId);
      
      throw new Error(`Bracket creation failed: ${error.message}`);
    }
  }

  private static async fetchTeamNames(teamIds: string[]): Promise<string[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
      
    if (error || !data) {
      throw new Error(`Failed to fetch team names: ${error?.message}`);
    }
    
    const map = new Map(data.map(t => [t.id, t.name!]));
    return teamIds.map(id => map.get(id) ?? id);
  }

  private static padToNextPowerOfTwo<T>(arr: T[]): (T | null)[] {
    let size = 1;
    while (size < arr.length) size <<= 1;
    return [...arr, ...Array(size - arr.length).fill(null)];
  }
}
