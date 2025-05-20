
import { StorageAdapter, BaseFilter } from './interfaces/StorageAdapter';
import { MatchAdapter, MatchFilter } from './adapters/MatchAdapter';
import { ParticipantAdapter, ParticipantFilter } from './adapters/ParticipantAdapter';
import { StageAdapter, StageFilter } from './adapters/StageAdapter';

// Define a union type for all possible data record types
type BracketRecord = any;

// Define a union type for all possible filter types
type BracketFilter = MatchFilter | ParticipantFilter | StageFilter | BaseFilter;

// Define a union type for all possible insert data types
type BracketInsertData = any;

/**
 * The BracketsAdapter implements the Storage interface from brackets-manager
 * to bridge between brackets-manager operations and our database
 */
export class BracketsAdapter implements StorageAdapter<BracketRecord, BracketFilter, BracketInsertData> {
  private matchAdapter: MatchAdapter;
  private participantAdapter: ParticipantAdapter;
  private stageAdapter: StageAdapter;
  
  constructor() {
    this.matchAdapter = new MatchAdapter();
    this.participantAdapter = new ParticipantAdapter();
    this.stageAdapter = new StageAdapter();
  }
  
  /**
   * Insert data into the appropriate table
   */
  async insert(table: string, data: any | any[]): Promise<number> {
    try {
      // Choose the appropriate adapter based on the table
      switch (table) {
        case 'match':
          return this.matchAdapter.insertMatches(Array.isArray(data) ? data : [data]);
        case 'participant':
          return this.participantAdapter.insertParticipants(Array.isArray(data) ? data : [data]);
        case 'stage':
          return this.stageAdapter.insertStage(data);
        default:
          throw new Error(`Unknown table: ${table}`);
      }
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Select data from the appropriate table
   */
  async select(table: string, filter?: BaseFilter): Promise<any[]> {
    try {
      // Choose the appropriate adapter based on the table
      switch (table) {
        case 'match':
          return this.matchAdapter.selectMatches(filter as MatchFilter);
        case 'participant':
          return this.participantAdapter.selectParticipants(filter as ParticipantFilter);
        case 'stage':
          return this.stageAdapter.selectStage(filter as StageFilter);
        default:
          throw new Error(`Unknown table: ${table}`);
      }
    } catch (error) {
      console.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Update data in the appropriate table
   */
  async update(table: string, id: string, data: any): Promise<number> {
    try {
      // Choose the appropriate adapter based on the table
      switch (table) {
        case 'match':
          return this.matchAdapter.updateMatch(id, data);
        case 'participant':
          return this.participantAdapter.updateParticipant(id, data);
        case 'stage':
          return this.stageAdapter.updateStage(id, data);
        default:
          throw new Error(`Unknown table: ${table}`);
      }
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete data from the appropriate table
   */
  async delete(table: string, filter?: BaseFilter): Promise<number> {
    try {
      // Choose the appropriate adapter based on the table
      switch (table) {
        case 'match':
          return this.matchAdapter.deleteMatches(filter as MatchFilter);
        case 'participant':
          return this.participantAdapter.deleteParticipants(filter as ParticipantFilter);
        case 'stage':
          return this.stageAdapter.deleteStage(filter as StageFilter);
        default:
          throw new Error(`Unknown table: ${table}`);
      }
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }
}
