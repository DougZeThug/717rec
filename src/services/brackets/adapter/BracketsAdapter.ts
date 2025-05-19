
import { ParticipantAdapter } from './adapters/ParticipantAdapter';
import { MatchAdapter } from './adapters/MatchAdapter';
import { StageAdapter } from './adapters/StageAdapter';
import { StorageAdapter } from './interfaces/StorageAdapter';

/**
 * Adapter to connect Supabase with the brackets-manager library
 * Implements the interface required by brackets-manager
 */
export class BracketsAdapter implements StorageAdapter {
  private participantAdapter: ParticipantAdapter;
  private matchAdapter: MatchAdapter;
  private stageAdapter: StageAdapter;
  
  constructor() {
    this.participantAdapter = new ParticipantAdapter();
    this.matchAdapter = new MatchAdapter();
    this.stageAdapter = new StageAdapter();
  }
  
  /**
   * Insert data into the specified table
   * Return boolean for compatibility with brackets-manager
   */
  async insert(table: string, data: any): Promise<boolean> {
    try {
      let insertedCount = 0;
      
      switch (table) {
        case 'participants':
          insertedCount = await this.participantAdapter.insertParticipants(Array.isArray(data) ? data : [data]);
          break;
        case 'matches':
          insertedCount = await this.matchAdapter.insertMatches(Array.isArray(data) ? data : [data]);
          break;
        case 'stages':
          insertedCount = await this.stageAdapter.insertStage(data);
          break;
        default:
          throw new Error(`Table not supported: ${table}`);
      }
      
      return insertedCount > 0; // Convert to boolean for brackets-manager compatibility
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Select data from the specified table
   */
  async select(table: string, filter?: Record<string, any> | string): Promise<any[]> {
    try {
      // Handle the case where filter is an ID
      const filterObj = typeof filter === 'string' ? { id: filter } : filter;
        
      switch (table) {
        case 'participants':
          return this.participantAdapter.selectParticipants(filterObj);
        case 'matches':
          return this.matchAdapter.selectMatches(filterObj);
        case 'stages':
          return this.stageAdapter.selectStages(filterObj);
        default:
          throw new Error(`Table not supported: ${table}`);
      }
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Update data in the specified table
   * Return boolean for compatibility with brackets-manager
   */
  async update(table: string, id: string, data: any): Promise<boolean> {
    try {
      let updatedCount = 0;
      
      switch (table) {
        case 'matches':
          updatedCount = await this.matchAdapter.updateMatch(id, data);
          break;
        default:
          throw new Error(`Unsupported table update: ${table}`);
      }
      
      return updatedCount > 0; // Convert to boolean for brackets-manager compatibility
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete data from the specified table
   * Return boolean for compatibility with brackets-manager
   */
  async delete(table: string, filter?: Record<string, any>): Promise<boolean> {
    try {
      let deletedCount = 0;
      
      switch (table) {
        case 'matches':
          deletedCount = await this.matchAdapter.deleteMatches(filter);
          break;
        default:
          throw new Error(`Unsupported table delete: ${table}`);
      }
      
      return deletedCount > 0; // Convert to boolean for brackets-manager compatibility
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }
  
  // Stub methods required by brackets-manager library
  async selectFirst(): Promise<any> {
    throw new Error('Method not implemented');
  }
  
  async selectLast(): Promise<any> {
    throw new Error('Method not implemented');
  }
  
  // Convenience methods for direct access
  insertParticipants(participants: any[]): Promise<number> {
    return this.participantAdapter.insertParticipants(participants);
  }
  
  selectParticipants(filter?: Record<string, any>): Promise<any[]> {
    return this.participantAdapter.selectParticipants(filter);
  }
  
  insertMatches(matches: any[]): Promise<number> {
    return this.matchAdapter.insertMatches(matches);
  }
  
  selectMatches(filter?: Record<string, any>): Promise<any[]> {
    return this.matchAdapter.selectMatches(filter);
  }
  
  updateMatch(id: string, match: any): Promise<number> {
    return this.matchAdapter.updateMatch(id, match);
  }
  
  deleteMatches(filter?: Record<string, any>): Promise<number> {
    return this.matchAdapter.deleteMatches(filter);
  }
  
  insertStage(stage: any): Promise<number> {
    return this.stageAdapter.insertStage(stage);
  }
  
  selectStages(filter?: Record<string, any>): Promise<any[]> {
    return this.stageAdapter.selectStages(filter);
  }
}
