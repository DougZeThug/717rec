
import { supabase } from "@/integrations/supabase/client";
import { BaseRepository } from "./BaseRepository";
import { IParticipantRepository, ParticipantData, ParticipantFilter } from "../types/DatabaseTypes";

/**
 * Repository for participant operations
 */
export class ParticipantRepository extends BaseRepository implements IParticipantRepository {
  /**
   * Create a new participant
   * @param participant Participant data
   * @returns ID of the created participant
   */
  async createParticipant(participant: ParticipantData): Promise<string> {
    try {
      const { error } = await supabase
        .from('participants')
        .insert({
          id: participant.id,
          tournament_id: participant.tournament_id,
          bracket_id: participant.tournament_id, // bracket_id is the same as tournament_id
          team_id: participant.id, // Use id as team_id for compatibility
          name: participant.name,
          seeding: participant.seeding ?? null,
          position: participant.position ?? null,
        });
      
      if (error) throw error;
      return participant.id;
    } catch (error) {
      console.error('Error creating participant:', error);
      throw error;
    }
  }

  /**
   * Select participants based on filters
   * @param filters Filter criteria
   * @returns Array of participants
   */
  async selectParticipants(filters?: ParticipantFilter): Promise<ParticipantData[]> {
    try {
      let query = supabase.from('participants').select('*');
      
      if (filters?.tournament_id) {
        query = query.eq('tournament_id', filters.tournament_id);
      }
      
      if (filters?.name) {
        query = query.eq('name', filters.name);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error selecting participants:', error);
        throw new Error(`Failed to select participants: ${error.message}`);
      }
      
      // Convert from DB format to application format
      return (data || []).map(p => ({
        id: p.id,
        name: p.name || '',
        tournament_id: p.tournament_id || p.bracket_id,
        position: p.position,
        seeding: p.seeding
      }));
    } catch (error) {
      console.error('Error selecting participants:', error);
      return [];
    }
  }
}
