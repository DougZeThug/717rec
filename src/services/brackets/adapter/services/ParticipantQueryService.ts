
/**
 * Service for querying participants from the database
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  ParticipantFilter, 
  ParticipantDbRecord,
  ParticipantRecord,
  ParticipantOperationError 
} from '../types/ParticipantTypes';
import { mapParticipantDbRecords } from '../utils/ParticipantMapperUtils';

/**
 * Service for querying participants from the database
 */
export class ParticipantQueryService {
  /**
   * Select participants from the database
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<ParticipantRecord[]> {
    try {
      // Build query with all necessary fields including name and tournament_id
      let query = supabase.from('participants').select(`
        id,
        team_id,
        bracket_id,
        tournament_id,
        position,
        seeding,
        name,
        teams:team_id (name)
      `);
      
      // Apply filters if provided
      if (filter) {
        this.applyFilters(query, filter);
      }
      
      // Execute query and handle response
      const { data, error } = await query;
      
      if (error) {
        console.error("Error selecting participants:", error);
        throw new ParticipantOperationError(`Failed to select participants: ${error.message}`, error);
      }
      
      // Transform the result to match expected format
      return mapParticipantDbRecords(data as ParticipantDbRecord[]);
    } catch (error) {
      console.error("Error in selectParticipants:", error);
      throw new ParticipantOperationError(`Participant selection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply filters to the query
   */
  private applyFilters(query: any, filter: ParticipantFilter): void {
    if (filter.id) {
      if (Array.isArray(filter.id)) {
        query = query.in('id', filter.id);
      } else {
        query = query.eq('id', filter.id);
      }
    }
    
    if (filter.bracket_id) {
      query = query.eq('bracket_id', filter.bracket_id);
    }
    
    if (filter.tournament_id) {
      // Try to match on tournament_id directly
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
}
