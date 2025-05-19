
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
   * Return number of inserted records to match brackets-manager interface
   */
  async insert(table: string, data: any): Promise<number> {
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
    
    return insertedCount;
  }
  
  /**
   * Select data from the specified table
   */
  async select(table: string, filter?: Record<string, any> | string): Promise<any[]> {
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
  }
  
  /**
   * Update data in the specified table
   * Return number of updated records to match brackets-manager interface
   */
  async update(table: string, id: string, data: any): Promise<number> {
    switch (table) {
      case 'matches':
        return this.matchAdapter.updateMatch(id, data);
      default:
        throw new Error(`Unsupported table update: ${table}`);
    }
  }
  
  /**
   * Delete data from the specified table
   * Return number of deleted records to match brackets-manager interface
   */
  async delete(table: string, filter?: Record<string, any>): Promise<number> {
    switch (table) {
      case 'matches':
        return this.matchAdapter.deleteMatches(filter);
      default:
        throw new Error(`Unsupported table delete: ${table}`);
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
