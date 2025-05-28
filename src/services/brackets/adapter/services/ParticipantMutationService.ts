
import { supabase } from "@/integrations/supabase/client";
import { 
  ParticipantFilter, 
  ParticipantInsertData, 
  ParticipantOperationError,
  ParticipantOperationResult
} from '../types/ParticipantTypes';
import { validateParticipantBatch } from '../utils/ParticipantValidationUtils';
import { isValidUUID } from '@/utils/validation';
import { assertValidUuidOrNull } from '@/utils/uuidValidation';

/**
 * Service for modifying participants in the database
 */
export class ParticipantMutationService {
  /**
   * Insert participants into the database with validation
   */
  async insertParticipants(participants: ParticipantInsertData[]): Promise<number> {
    if (!participants || participants.length === 0) {
      return 0;
    }
    
    try {
      // Validate participants
      const validationErrors = this.validateParticipants(participants);
      if (validationErrors.length > 0) {
        throw new ParticipantOperationError(`Validation failed: ${validationErrors.join(', ')}`);
      }
      
      const validParticipants = validateParticipantBatch(participants);
      
      if (validParticipants.length === 0) {
        return 0;
      }
      
      // Enrich participants with defaults - FIXED: use null-safe logic for tournament_id
      const enrichedParticipants = validParticipants.map(p => {
        // FIXED: Ensure tournament_id is either a valid UUID or null
        const tournamentId = p.tournament_id || p.bracket_id || null;
        assertValidUuidOrNull(tournamentId, 'tournament_id');
        
        return {
          ...p,
          name: p.name || p.team_id,
          tournament_id: tournamentId
        };
      });
      
      const { error, data } = await supabase
        .from('participants')
        .insert(enrichedParticipants)
        .select('id');
      
      if (error) {
        throw new ParticipantOperationError(`Insert failed: ${error.message}`, error);
      }
      
      return data?.length || enrichedParticipants.length;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      throw new ParticipantOperationError(`Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private validateParticipants(participants: ParticipantInsertData[]): string[] {
    const errors: string[] = [];
    
    participants.forEach((p, index) => {
      if (!p.bracket_id || !isValidUUID(p.bracket_id)) {
        errors.push(`Participant ${index}: invalid bracket_id`);
      }
      if (!p.team_id || !isValidUUID(p.team_id)) {
        errors.push(`Participant ${index}: invalid team_id`);
      }
      if (typeof p.position !== 'number' || p.position < 0) {
        errors.push(`Participant ${index}: invalid position`);
      }
    });
    
    return errors;
  }

  async updateParticipant(id: string, data: { position?: number; name?: string; tournament_id?: string; bracket_id?: string; seeding?: number }): Promise<number> {
    try {
      if (!id || !isValidUUID(id)) {
        throw new ParticipantOperationError('Valid team ID is required for update');
      }
      
      const updateData: any = {};
      
      if (data.position !== undefined) {
        if (isNaN(data.position) || data.position < 0) {
          throw new ParticipantOperationError('Position must be a non-negative number');
        }
        updateData.position = data.position;
      }
      
      if (data.name) updateData.name = data.name;
      if (data.seeding !== undefined) updateData.seeding = data.seeding;
      
      if (Object.keys(updateData).length === 0) {
        return 0;
      }
      
      // FIXED: Use null-safe logic for tournament_id
      const tournamentId = data.tournament_id || data.bracket_id || null;
      if (!tournamentId) {
        throw new ParticipantOperationError('Tournament or bracket ID is required for update');
      }
      
      let query = supabase.from('participants').update(updateData).eq('team_id', id);
      
      if (data.tournament_id) {
        query = query.eq('tournament_id', data.tournament_id);
      } else if (data.bracket_id) {
        query = query.eq('bracket_id', data.bracket_id);
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        throw new ParticipantOperationError(`Update failed: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      throw new ParticipantOperationError(`Failed to update participant: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    try {
      let query = supabase.from('participants').delete();
      
      if (filter) {
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            query = query.in('team_id', filter.id);
          } else {
            query = query.eq('team_id', filter.id);
          }
        }
        
        if (filter.bracket_id) query = query.eq('bracket_id', filter.bracket_id);
        if (filter.tournament_id) query = query.eq('tournament_id', filter.tournament_id);
        if (filter.team_id) query = query.eq('team_id', filter.team_id);
        if (filter.position !== undefined) query = query.eq('position', filter.position);
        if (filter.seeding !== undefined) query = query.eq('seeding', filter.seeding);
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        throw new ParticipantOperationError(`Delete failed: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      throw new ParticipantOperationError(`Failed to delete participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Static service for quick use
 */
export const ParticipantMutationServiceStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    if (!bracketId || !teamIds || teamIds.length === 0) {
      return 0;
    }
    
    if (!isValidUUID(bracketId)) {
      throw new ParticipantOperationError(`Invalid bracket ID: ${bracketId}`);
    }
    
    const invalidTeamIds = teamIds.filter(id => !id || !isValidUUID(id));
    if (invalidTeamIds.length > 0) {
      throw new ParticipantOperationError(`Invalid team IDs: ${invalidTeamIds.join(', ')}`);
    }
    
    const service = new ParticipantMutationService();
    
    const rows = teamIds.map((teamId, i) => ({
      bracket_id: bracketId,
      tournament_id: bracketId,
      team_id: teamId,
      position: i + 1,
      name: teamId,
      seeding: i + 1
    }));
    
    return service.insertParticipants(rows);
  },
};
