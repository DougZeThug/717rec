
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
 * Table names supported by the adapter
 */
enum BracketTable {
  Match = 'match',
  Participant = 'participant',
  Stage = 'stage'
}

/**
 * The BracketsAdapter implements the Storage interface from brackets-manager
 * to bridge between brackets-manager operations and our database
 */
export class BracketsAdapter implements StorageAdapter<BracketRecord, BracketFilter, BracketInsertData> {
  private matchAdapter: MatchAdapter;
  private participantAdapter: ParticipantAdapter;
  private stageAdapter: StageAdapter;
  private currentTable: BracketTable = BracketTable.Match;
  
  constructor() {
    this.matchAdapter = new MatchAdapter();
    this.participantAdapter = new ParticipantAdapter();
    this.stageAdapter = new StageAdapter();
  }

  /**
   * Set the current table for operations
   * @private
   */
  private setTable(table: string): BracketTable {
    switch(table) {
      case 'match':
        this.currentTable = BracketTable.Match;
        break;
      case 'participant':
        this.currentTable = BracketTable.Participant;
        break;
      case 'stage':
        this.currentTable = BracketTable.Stage;
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }
    return this.currentTable;
  }

  /**
   * Insert data into the database
   * @param data Array of data to insert
   * @returns Number of records inserted
   */
  async insert(data: BracketInsertData[]): Promise<number> {
    // If data includes a table property, use that to set the current table
    if (data?.length > 0 && 'table' in data[0]) {
      this.setTable(data[0].table);
      // Remove the table property from each item
      data = data.map(({ table, ...rest }) => rest);
    }

    try {
      // Choose the appropriate adapter based on the current table
      switch (this.currentTable) {
        case BracketTable.Match:
          return this.matchAdapter.insertMatches(data);
        case BracketTable.Participant:
          return this.participantAdapter.insertParticipants(data);
        case BracketTable.Stage:
          // Stage adapter expects a single item
          return this.stageAdapter.insertStage(data[0]);
        default:
          throw new Error(`Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error inserting into ${this.currentTable}:`, error);
      throw error;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard insert method
   */
  async insertIntoTable(table: string, data: any | any[]): Promise<number> {
    this.setTable(table);
    const dataArray = Array.isArray(data) ? data : [data];
    return this.insert(dataArray);
  }
  
  /**
   * Select data from the database
   * @param filter Filter criteria
   * @returns Array of records
   */
  async select(filter?: BracketFilter): Promise<BracketRecord[]> {
    // If filter includes a table property, use that to set the current table
    if (filter && 'table' in filter) {
      this.setTable(filter.table);
      // Remove the table property to avoid passing it to the adapter
      const { table, ...restFilter } = filter;
      filter = restFilter as BracketFilter;
    }
    
    try {
      // Choose the appropriate adapter based on the current table
      switch (this.currentTable) {
        case BracketTable.Match:
          return this.matchAdapter.selectMatches(filter as MatchFilter);
        case BracketTable.Participant:
          return this.participantAdapter.selectParticipants(filter as ParticipantFilter);
        case BracketTable.Stage:
          return this.stageAdapter.selectStage(filter as StageFilter);
        default:
          throw new Error(`Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error selecting from ${this.currentTable}:`, error);
      throw error;
    }
  }

  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard select method
   */
  async selectFromTable(table: string, filter?: BaseFilter): Promise<BracketRecord[]> {
    this.setTable(table);
    return this.select({...filter, table});
  }
  
  /**
   * Update data in the database
   * @param id ID of the record to update
   * @param data Data to update
   * @returns Number of records updated
   */
  async update(id: string, data: Partial<BracketInsertData>): Promise<number> {
    // If data includes a table property, use that to set the current table
    if (data && 'table' in data) {
      this.setTable(data.table);
      // Remove the table property to avoid passing it to the adapter
      const { table, ...restData } = data;
      data = restData;
    }
    
    try {
      // Choose the appropriate adapter based on the current table
      switch (this.currentTable) {
        case BracketTable.Match:
          return this.matchAdapter.updateMatch(id, data);
        case BracketTable.Participant:
          return this.participantAdapter.updateParticipant(id, data);
        case BracketTable.Stage:
          return this.stageAdapter.updateStage(id, data);
        default:
          throw new Error(`Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error updating ${this.currentTable}:`, error);
      throw error;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard update method
   */
  async updateInTable(table: string, id: string, data: any): Promise<number> {
    this.setTable(table);
    return this.update(id, {...data, table});
  }
  
  /**
   * Delete data from the database
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async delete(filter?: BracketFilter): Promise<number> {
    // If filter includes a table property, use that to set the current table
    if (filter && 'table' in filter) {
      this.setTable(filter.table);
      // Remove the table property to avoid passing it to the adapter
      const { table, ...restFilter } = filter;
      filter = restFilter as BracketFilter;
    }
    
    try {
      // Choose the appropriate adapter based on the current table
      switch (this.currentTable) {
        case BracketTable.Match:
          return this.matchAdapter.deleteMatches(filter as MatchFilter);
        case BracketTable.Participant:
          return this.participantAdapter.deleteParticipants(filter as ParticipantFilter);
        case BracketTable.Stage:
          return this.stageAdapter.deleteStage(filter as StageFilter);
        default:
          throw new Error(`Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error deleting from ${this.currentTable}:`, error);
      throw error;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard delete method
   */
  async deleteFromTable(table: string, filter?: BaseFilter): Promise<number> {
    this.setTable(table);
    return this.delete({...filter, table});
  }
}
