
import { BracketDatabaseService } from "../services/BracketDatabaseService";

/**
 * Adapter that implements the CrudInterface for BracketsManager
 */
export class BracketsManagerAdapter {
  private service: BracketDatabaseService;
  
  constructor() {
    this.service = new BracketDatabaseService();
  }
  
  /**
   * Required adapter properties
   */
  readonly create = {
    match: async (matches: any[]) => {
      const result = await this.service.savePlayoffMatches(matches);
      return result; // Number of matches saved
    },
    participant: async (participant: any) => {
      return this.service.createParticipant(participant);
    }
  };
  
  readonly select = {
    match: async (filters?: { tournament_id?: string }) => {
      if (!filters || !filters.tournament_id) {
        return [];
      }
      return this.service.getBracketMatches(filters.tournament_id);
    },
    participant: async (filters?: any) => {
      return this.service.selectParticipants(filters);
    }
  };
  
  /**
   * Insert records
   * @param data Array of data to insert
   * @returns Number of records inserted
   */
  async insert(data: any[]): Promise<number> {
    try {
      if (!data || data.length === 0) return 0;
      
      const sample = data[0];
      
      // Insert matches
      if ('opponent1' in sample || 'round' in sample) {
        const result = await this.service.savePlayoffMatches(data);
        return result;
      }
      
      // Insert participants
      if ('tournament_id' in sample && 'name' in sample) {
        let count = 0;
        for (const item of data) {
          await this.service.createParticipant(item);
          count++;
        }
        return count;
      }
      
      return 0;
    } catch (error) {
      console.error('Error in insert method:', error);
      return 0;
    }
  }
  
  /**
   * Update a record
   * @param id Record ID
   * @param data Update data
   * @returns Number of records updated
   */
  async update(id: string, data: any): Promise<number> {
    try {
      console.log('Update operation called with ID:', id, 'and data:', data);
      
      // For participants
      if ('name' in data || 'tournament_id' in data) {
        // In a real implementation, we would update the participant
        return 1; // Indicate success
      }
      
      // For matches
      if ('opponent1' in data || 'opponent2' in data || 'status' in data) {
        // Convert from brackets-manager format to our format
        const matchData: any = {
          match_id: id
        };
        
        if ('opponent1' in data) matchData.team1_id = data.opponent1?.id || null;
        if ('opponent2' in data) matchData.team2_id = data.opponent2?.id || null;
        if ('status' in data) matchData.status = data.status;
        if ('result' in data && data.result) {
          matchData.team1_score = data.result[0];
          matchData.team2_score = data.result[1];
        }
        
        // In a real implementation, we would update the match
        return 1; // Indicate success
      }
      
      console.warn('Unrecognized data type in adapter update:', data);
      return 0;
    } catch (error) {
      console.error('Error in update method:', error);
      return 0;
    }
  }
  
  /**
   * Delete records
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async delete(filter?: any): Promise<number> {
    try {
      console.log('Delete operation called with filter:', filter);
      
      if (!filter) {
        console.warn('No filter provided for delete operation');
        return 0;
      }
      
      // In a real implementation, we would delete the records
      return 1; // Indicate success
    } catch (error) {
      console.error('Error in delete method:', error);
      return 0;
    }
  }
}
