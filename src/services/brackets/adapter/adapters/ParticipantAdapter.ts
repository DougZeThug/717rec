
import { 
  ParticipantFilter,
  ParticipantRecord,
  ParticipantInsertData
} from '../types/ParticipantTypes';
import { ParticipantQueryService } from '../services/ParticipantQueryService';
import { 
  ParticipantMutationService,
  ParticipantMutationServiceStatic
} from '../services/ParticipantMutationService';
import { AdapterOperationError } from '../errors/AdapterErrors';

/**
 * Adapter to handle participants (teams) in the database
 */
export class ParticipantAdapter {
  private queryService: ParticipantQueryService;
  private mutationService: ParticipantMutationService;
  
  constructor() {
    this.queryService = new ParticipantQueryService();
    this.mutationService = new ParticipantMutationService();
  }

  /**
   * Insert participants into the database
   * @returns Number of participants successfully inserted
   */
  async insertParticipants(participants: ParticipantInsertData[]): Promise<number> {
    try {
      if (!participants?.length) {
        return 0;
      }
      
      return await this.mutationService.insertParticipants(participants);
    } catch (error) {
      console.error("Error inserting participants:", error);
      throw new AdapterOperationError(
        'insertParticipants', 
        `Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`, 
        error
      );
    }
  }
  
  /**
   * Select participants from the database
   * @returns Array of participant records
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<ParticipantRecord[]> {
    try {
      return await this.queryService.selectParticipants(filter);
    } catch (error) {
      console.error("Error selecting participants:", error);
      throw new AdapterOperationError(
        'selectParticipants', 
        `Failed to select participants: ${error instanceof Error ? error.message : String(error)}`, 
        error
      );
    }
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: any): Promise<number> {
    try {
      return await this.mutationService.updateParticipant(id, data);
    } catch (error) {
      console.error("Error updating participant:", error);
      throw new AdapterOperationError(
        'updateParticipant', 
        `Failed to update participant: ${error instanceof Error ? error.message : String(error)}`, 
        error
      );
    }
  }
  
  /**
   * Delete participants from the database
   * @returns Number of participants deleted
   */
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    try {
      return await this.mutationService.deleteParticipants(filter);
    } catch (error) {
      console.error("Error deleting participants:", error);
      throw new AdapterOperationError(
        'deleteParticipants', 
        `Failed to delete participants: ${error instanceof Error ? error.message : String(error)}`, 
        error
      );
    }
  }

  /**
   * Get participant by team ID
   * @returns Participant record or null if not found
   */
  async getParticipantByTeamId(bracketId: string, teamId: string): Promise<ParticipantRecord | null> {
    try {
      const participants = await this.queryService.selectParticipants({
        bracket_id: bracketId,
        team_id: teamId
      });
      
      return participants.length > 0 ? participants[0] : null;
    } catch (error) {
      console.error("Error getting participant by team ID:", error);
      throw new AdapterOperationError(
        'getParticipantByTeamId',
        `Failed to get participant: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }
}

/**
 * Simplified static version of the adapter for quick use
 */
export const ParticipantAdapterStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    try {
      return await ParticipantMutationServiceStatic.insert(bracketId, teamIds);
    } catch (error) {
      console.error("Error in static participant insert:", error);
      throw new AdapterOperationError(
        'staticInsert',
        `Failed to insert participants: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  },
};

// Re-export types for convenience
export type { 
  ParticipantFilter,
  ParticipantRecord,
  ParticipantInsertData
} from '../types/ParticipantTypes';
