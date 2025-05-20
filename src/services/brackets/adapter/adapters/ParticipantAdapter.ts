
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
    return this.mutationService.insertParticipants(participants);
  }
  
  /**
   * Select participants from the database
   * @returns Array of participant records
   */
  async selectParticipants(filter?: ParticipantFilter): Promise<ParticipantRecord[]> {
    return this.queryService.selectParticipants(filter);
  }

  /**
   * Update a participant in the database
   * @returns Number of participants updated (1 or 0)
   */
  async updateParticipant(id: string, data: any): Promise<number> {
    return this.mutationService.updateParticipant(id, data);
  }
  
  /**
   * Delete participants from the database
   * @returns Number of participants deleted
   */
  async deleteParticipants(filter?: ParticipantFilter): Promise<number> {
    return this.mutationService.deleteParticipants(filter);
  }
}

/**
 * Simplified static version of the adapter for quick use
 */
export const ParticipantAdapterStatic = {
  async insert(bracketId: string, teamIds: string[]): Promise<number> {
    return ParticipantMutationServiceStatic.insert(bracketId, teamIds);
  },
};

// Re-export types for convenience
export type { 
  ParticipantFilter,
  ParticipantRecord,
  ParticipantInsertData
} from '../types/ParticipantTypes';
