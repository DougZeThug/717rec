/**
 * Service for inserting, updating and deleting participants
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ParticipantFilter, 
  ParticipantInsertData, 
  ParticipantOperationError,
  ParticipantOperationResult
} from '../types/ParticipantTypes';
import { validateParticipantBatch } from '../utils/ParticipantValidationUtils';
import { isValidUUID, isNotEmpty } from '@/utils/validation';

/**
 * Service for modifying participants in the database
 */
export class ParticipantMutationService {
  /**
   * Insert participants into the database with enhanced validation
   * @returns Number of participants successfully inserted
   */
  async insertParticipants(participants: ParticipantInsertData[]): Promise<number> {
    if (!participants || participants.length === 0) {
      console.log("No participants provided to insert");
      return 0;
    }
    
    try {
      console.log('ParticipantMutationService: Inserting participants with enhanced validation and UUID checks:', {
        count: participants.length,
        participants: participants.map((p, index) => ({
          index,
          bracket_id: p.bracket_id,
          team_id: p.team_id,
          position: p.position,
          bracket_id_valid: isValidUUID(p.bracket_id || ''),
          team_id_valid: isValidUUID(p.team_id || ''),
          bracket_id_type: typeof p.bracket_id,
          team_id_type: typeof p.team_id,
          bracket_id_empty: p.bracket_id === '',
          team_id_empty: p.team_id === '',
          bracket_id_undefined: p.bracket_id === 'undefined',
          team_id_undefined: p.team_id === 'undefined'
        }))
      });
      
      // Enhanced pre-validation: check for obvious issues before calling validateParticipantBatch
      const preValidationErrors: string[] = [];
      participants.forEach((p, index) => {
        // Check bracket_id
        if (!p.bracket_id || p.bracket_id === 'undefined' || p.bracket_id === 'null' || p.bracket_id.trim() === '') {
          preValidationErrors.push(`Participant ${index}: bracket_id is empty, undefined, or invalid`);
        } else if (!isValidUUID(p.bracket_id)) {
          preValidationErrors.push(`Participant ${index}: bracket_id "${p.bracket_id}" is not a valid UUID`);
        }
        
        // Check team_id
        if (!p.team_id || p.team_id === 'undefined' || p.team_id === 'null' || p.team_id.trim() === '') {
          preValidationErrors.push(`Participant ${index}: team_id is empty, undefined, or invalid`);
        } else if (!isValidUUID(p.team_id)) {
          preValidationErrors.push(`Participant ${index}: team_id "${p.team_id}" is not a valid UUID`);
        }
      });
      
      if (preValidationErrors.length > 0) {
        console.error('Pre-validation failed with UUID issues:', preValidationErrors);
        throw new ParticipantOperationError(
          `Pre-validation failed: ${preValidationErrors.join(', ')}`,
          { preValidationErrors }
        );
      }
      
      // Validate all participants using existing validation
      const validParticipants = validateParticipantBatch(participants);
      
      if (validParticipants.length === 0) {
        console.warn("No valid participants to insert after validation");
        return 0;
      }
      
      // Add name and tournament_id for each participant if not provided
      const enrichedParticipants = validParticipants.map((p, index) => {
        const enriched = {
          ...p,
          name: p.name || p.team_id, // Default to team_id if name is not provided
          tournament_id: p.tournament_id || p.bracket_id // Use bracket_id as tournament_id if not provided
        };
        
        // Final validation before database insert with detailed UUID logging
        console.log(`Final UUID validation for participant ${index}:`, {
          bracket_id: enriched.bracket_id,
          team_id: enriched.team_id,
          tournament_id: enriched.tournament_id,
          position: enriched.position,
          bracket_id_uuid_valid: isValidUUID(enriched.bracket_id),
          team_id_uuid_valid: isValidUUID(enriched.team_id),
          tournament_id_uuid_valid: isValidUUID(enriched.tournament_id)
        });
        
        if (!isValidUUID(enriched.bracket_id)) {
          throw new ParticipantOperationError(`Final validation failed: Invalid bracket_id UUID at index ${index}: "${enriched.bracket_id}"`);
        }
        if (!isValidUUID(enriched.team_id)) {
          throw new ParticipantOperationError(`Final validation failed: Invalid team_id UUID at index ${index}: "${enriched.team_id}"`);
        }
        if (!isValidUUID(enriched.tournament_id)) {
          throw new ParticipantOperationError(`Final validation failed: Invalid tournament_id UUID at index ${index}: "${enriched.tournament_id}"`);
        }
        
        return enriched;
      });
      
      console.log(`Inserting ${enrichedParticipants.length} fully validated participants with proper UUIDs`);
      const { error, data } = await supabase.from('participants').insert(enrichedParticipants)
        .select('id'); // Select IDs to count inserted rows
      
      if (error) {
        console.error("Database error inserting participants:", error);
        
        // Provide specific error messages for common UUID issues
        let enhancedErrorMessage = error.message;
        if (error.message.includes('invalid input syntax for type uuid')) {
          enhancedErrorMessage = 'Invalid UUID format detected in participant data - this should not happen after validation';
        } else if (error.message.includes('violates foreign key constraint')) {
          enhancedErrorMessage = 'Referenced teams or brackets no longer exist';
        } else if (error.message.includes('violates not-null constraint')) {
          enhancedErrorMessage = 'Required participant data is missing';
        }
        
        throw new ParticipantOperationError(`Participant insert failed: ${enhancedErrorMessage}`, error);
      }
      
      const insertedCount = data?.length || enrichedParticipants.length;
      console.log(`Successfully inserted ${insertedCount} participants with valid UUIDs`);
      return insertedCount;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error; // Re-throw our own error types
      }
      console.error("Unexpected error inserting participants:", error);
      throw new ParticipantOperationError(`Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: { position?: number; name?: string; tournament_id?: string; bracket_id?: string; seeding?: number }): Promise<number> {
    try {
      if (!id) {
        throw new ParticipantOperationError('Team ID is required for update');
      }
      
      const updateData: any = {};
      
      if (data.position !== undefined) {
        if (isNaN(data.position) || data.position < 0) {
          throw new ParticipantOperationError('Position must be a non-negative number');
        }
        updateData.position = data.position;
      }
      
      if (data.name) {
        updateData.name = data.name;
      }
      
      if (data.seeding !== undefined) {
        updateData.seeding = data.seeding;
      }
      
      if (Object.keys(updateData).length === 0) {
        console.warn("No data provided for participant update");
        return 0;
      }
      
      // Use tournament_id if provided, otherwise use bracket_id
      const tournamentId = data.tournament_id;
      const bracketId = data.bracket_id;
      
      if (!tournamentId && !bracketId) {
        throw new ParticipantOperationError('Tournament or bracket ID is required for update');
      }
      
      let query = supabase.from('participants').update(updateData).eq('team_id', id);
      
      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      } else if (bracketId) {
        query = query.eq('bracket_id', bracketId);
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error("Error updating participant:", error);
        throw new ParticipantOperationError(`Failed to update participant: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      console.error("Error updating participant:", error);
      throw new ParticipantOperationError(`Failed to update participant: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    try {
      let query = supabase.from('participants').delete();
      
      if (filter) {
        // Apply filters if provided
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            query = query.in('team_id', filter.id); // Map id to team_id
          } else {
            query = query.eq('team_id', filter.id); // Map id to team_id
          }
        }
        
        if (filter.bracket_id) {
          query = query.eq('bracket_id', filter.bracket_id);
        }
        
        if (filter.tournament_id) {
          query = query.eq('tournament_id', filter.tournament_id);
        }
        
        if (filter.team_id) {
          query = query.eq('team_id', filter.team_id);
        }
        
        if (filter.position !== undefined) {
          query = query.eq('position', filter.position);
        }
        
        if (filter.seeding !== undefined) {
          query = query.eq('seeding', filter.seeding);
        }
      }
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error("Error deleting participants:", error);
        throw new ParticipantOperationError(`Failed to delete participants: ${error.message}`, error);
      }
      
      return count || 0;
    } catch (error) {
      if (error instanceof ParticipantOperationError) {
        throw error;
      }
      console.error("Error deleting participants:", error);
      throw new ParticipantOperationError(`Failed to delete participants: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Enhanced static service for quick use with better UUID validation
 */
export const ParticipantMutationServiceStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    console.log('ParticipantMutationServiceStatic.insert called with enhanced UUID validation:', {
      bracketId,
      teamIds,
      bracketIdValid: isValidUUID(bracketId),
      bracketIdEmpty: bracketId === '',
      bracketIdUndefined: bracketId === 'undefined',
      teamIdsValid: teamIds.map(id => ({ 
        id, 
        valid: isValidUUID(id), 
        empty: id === '', 
        undefined: id === 'undefined',
        null: id === 'null',
        type: typeof id
      }))
    });
    
    if (!bracketId || !teamIds || teamIds.length === 0) {
      console.warn('Invalid parameters for participant insert - missing required data');
      return 0;
    }
    
    // Enhanced input validation with specific UUID checks
    if (bracketId === 'undefined' || bracketId === 'null' || bracketId.trim() === '') {
      throw new ParticipantOperationError(`Invalid bracket ID: "${bracketId}" - cannot be empty, undefined, or null`);
    }
    
    if (!isValidUUID(bracketId)) {
      throw new ParticipantOperationError(`Invalid bracket ID format: "${bracketId}" - must be a valid UUID`);
    }
    
    const invalidTeamIds = teamIds.filter(id => 
      !id || 
      id === 'undefined' || 
      id === 'null' || 
      id.trim() === '' || 
      !isValidUUID(id)
    );
    
    if (invalidTeamIds.length > 0) {
      throw new ParticipantOperationError(`Invalid team IDs detected: ${invalidTeamIds.map(id => `"${id}"`).join(', ')}`);
    }
    
    const service = new ParticipantMutationService();
    
    const rows = teamIds.map((teamId, i) => ({
      bracket_id: bracketId,
      tournament_id: bracketId, // Set tournament_id to bracket_id for compatibility with brackets-manager
      team_id: teamId,
      position: i + 1,
      name: teamId, // Use team_id as default name
      seeding: i + 1 // Set default seeding based on position
    }));
    
    return service.insertParticipants(rows);
  },
};
