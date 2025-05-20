import { StorageAdapter, BaseFilter } from './interfaces/StorageAdapter';
import { MatchAdapter } from './adapters/MatchAdapter';
import { ParticipantAdapter } from './adapters/ParticipantAdapter';
import { StageAdapter } from './adapters/StageAdapter';
import { 
  BracketRecord, 
  BracketFilter,
  BracketTable,
  MatchFilter,
  ParticipantFilter,
  StageFilter
} from './types/AdapterTypes';
import { AdapterOperationError } from './errors/AdapterErrors';
import { filterUtils } from './utils/FilterUtils';

/**
 * The BracketsAdapter implements the Storage interface from brackets-manager
 * to bridge between brackets-manager operations and our database
 */
export class BracketsAdapter implements StorageAdapter<BracketRecord, BracketFilter, any> {
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
        throw new AdapterOperationError('setTable', `Unknown table: ${table}`);
    }
    return this.currentTable;
  }

  /**
   * Insert data into the database
   * @param data Array of data to insert
   * @returns Boolean indicating success
   */
  async insert(data: any[]): Promise<boolean> {
    if (!data || data.length === 0) {
      console.warn('Insert called with empty data');
      return true; // No data to insert is considered success
    }
    
    // If data includes a table property, use that to set the current table
    if (data[0] && 'table' in data[0]) {
      this.setTable(data[0].table as string);
      // Remove the table property from each item
      data = data.map(({ table, ...rest }) => rest);
    }

    try {
      // Choose the appropriate adapter based on the current table
      let insertCount = 0;
      
      switch (this.currentTable) {
        case BracketTable.Match:
          insertCount = await this.matchAdapter.insertMatches(data);
          break;
        case BracketTable.Participant:
          insertCount = await this.participantAdapter.insertParticipants(data);
          break;
        case BracketTable.Stage:
          // Stage adapter expects a single item
          insertCount = await this.stageAdapter.insertStage(data[0]);
          break;
        default:
          throw new AdapterOperationError('insert', `Unknown table: ${this.currentTable}`);
      }
      
      // Return success boolean as expected by brackets-manager
      return insertCount > 0;
    } catch (error) {
      console.error(`Error inserting into ${this.currentTable}:`, error);
      return false; // Return false on error
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard insert method
   */
  async insertIntoTable(table: string, data: any | any[]): Promise<boolean> {
    try {
      this.setTable(table);
      const dataArray = Array.isArray(data) ? data : [data];
      return this.insert(dataArray);
    } catch (error) {
      console.error(`Error in insertIntoTable (${table}):`, error);
      return false;
    }
  }
  
  /**
   * Select data from the database
   * @param filter Filter criteria
   * @returns Array of records
   */
  async select(filter?: BracketFilter): Promise<BracketRecord[]> {
    // If filter includes a table property, use that to set the current table
    if (filter && 'table' in filter) {
      this.setTable(filter.table as string);
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
          // Convert to a safe StageFilter to avoid type issues
          const stageFilter = filterUtils.toStageFilter(filter);
          return this.stageAdapter.selectStage(stageFilter);
        default:
          throw new AdapterOperationError('select', `Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error selecting from ${this.currentTable}:`, error);
      return [];
    }
  }

  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard select method
   */
  async selectFromTable(table: string, filter?: BaseFilter): Promise<BracketRecord[]> {
    try {
      this.setTable(table);
      return this.select({...filter, table});
    } catch (error) {
      console.error(`Error in selectFromTable (${table}):`, error);
      return [];
    }
  }
  
  /**
   * Update data in the database
   * @param id ID of the record to update
   * @param data Data to update
   * @returns Number of records updated
   */
  async update(id: string, data: any): Promise<number> {
    // If data includes a table property, use that to set the current table
    if (data && 'table' in data) {
      this.setTable(data.table as string);
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
          throw new AdapterOperationError('update', `Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error updating ${this.currentTable}:`, error);
      return 0;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard update method
   */
  async updateInTable(table: string, id: string, data: any): Promise<number> {
    try {
      this.setTable(table);
      return this.update(id, {...data, table});
    } catch (error) {
      console.error(`Error in updateInTable (${table}):`, error);
      return 0;
    }
  }
  
  /**
   * Delete data from the database
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async delete(filter?: BracketFilter): Promise<number> {
    // If filter includes a table property, use that to set the current table
    if (filter && 'table' in filter) {
      this.setTable(filter.table as string);
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
          // Convert to a safe StageFilter to avoid type issues
          const stageFilter = filterUtils.toStageFilter(filter);
          return this.stageAdapter.deleteStage(stageFilter);
        default:
          throw new AdapterOperationError('delete', `Unknown table: ${this.currentTable}`);
      }
    } catch (error) {
      console.error(`Error deleting from ${this.currentTable}:`, error);
      return 0;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard delete method
   */
  async deleteFromTable(table: string, filter?: BaseFilter): Promise<number> {
    try {
      this.setTable(table);
      return this.delete({...filter, table});
    } catch (error) {
      console.error(`Error in deleteFromTable (${table}):`, error);
      return 0;
    }
  }
}
