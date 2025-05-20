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
import { TableNameMapper } from './interfaces/TableNameMapper';

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
  private setTable(tableName: string): BracketTable {
    if (!tableName || !TableNameMapper.isValidTable(tableName)) {
      console.warn(`Invalid table name: ${tableName}, defaulting to 'match'`);
      this.currentTable = BracketTable.Match;
      return this.currentTable;
    }
    
    // Convert table name to BracketTable enum
    this.currentTable = this.determineTableTypeFromName(tableName);
    return this.currentTable;
  }

  /**
   * Helper to convert table name to enum
   * @private
   */
  private determineTableTypeFromName(tableName: string): BracketTable {
    const normalizedName = tableName.toLowerCase();
    
    if (normalizedName === 'match' || normalizedName === 'matches') {
      return BracketTable.Match;
    }
    
    if (normalizedName === 'participant' || normalizedName === 'participants') {
      return BracketTable.Participant;
    }
    
    if (normalizedName === 'stage' || normalizedName === 'brackets') {
      return BracketTable.Stage;
    }
    
    // Default to match if unknown
    console.warn(`Unknown table name: ${tableName}, defaulting to 'match'`);
    return BracketTable.Match;
  }

  /**
   * Insert data into the database
   * @param data Array of data to insert
   * @returns Number of records successfully inserted
   */
  async insert(data: any[]): Promise<number> {
    try {
      if (!data || data.length === 0) {
        console.warn('Insert called with empty data');
        return 0;
      }
      
      // If data includes a table property, use that to set the current table
      if (data[0] && 'table' in data[0]) {
        this.setTable(data[0].table as string);
        // Remove the table property from each item
        data = data.map(({ table, ...rest }) => rest);
      }

      // Choose the appropriate adapter based on the current table
      return await this.insertWithCurrentAdapter(data);
    } catch (error) {
      console.error('Error in insert operation:', error);
      return 0;
    }
  }

  /**
   * Helper method to route inserts to the right adapter
   * @private
   */
  private async insertWithCurrentAdapter(data: any[]): Promise<number> {
    switch (this.currentTable) {
      case BracketTable.Match:
        return await this.matchAdapter.insertMatches(data);
      
      case BracketTable.Participant:
        return await this.participantAdapter.insertParticipants(data);
      
      case BracketTable.Stage:
        // Stage adapter expects a single item
        return await this.stageAdapter.insertStage(data[0]);
      
      default:
        console.error(`Unknown table type for insert: ${this.currentTable}`);
        return 0;
    }
  }
  
  /**
   * This is a bridge method to support the original table-based API
   * It sets the table and forwards the call to the standard insert method
   * @returns Number of records successfully inserted
   */
  async insertIntoTable(table: string, data: any[]): Promise<number> {
    try {
      this.setTable(table);
      return this.insert(data);
    } catch (error) {
      console.error(`Error in insertIntoTable for ${table}:`, error);
      return 0;
    }
  }
  
  /**
   * Select data from the database
   * @param filter Filter criteria
   * @returns Array of records
   */
  async select(filter?: BracketFilter): Promise<BracketRecord[]> {
    try {
      // If filter includes a table property, use that to set the current table
      if (filter && 'table' in filter) {
        this.setTable(filter.table as string);
        // Remove the table property to avoid passing it to the adapter
        const { table, ...restFilter } = filter;
        filter = restFilter as BracketFilter;
      }
      
      // Choose the appropriate adapter based on the current table
      return await this.selectWithCurrentAdapter(filter);
    } catch (error) {
      console.error('Error in select operation:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Helper method to route selects to the right adapter
   * @private
   */
  private async selectWithCurrentAdapter(filter?: BracketFilter): Promise<BracketRecord[]> {
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
        console.error(`Unknown table type for select: ${this.currentTable}`);
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
      console.error(`Error in selectFromTable for ${table}:`, error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Update data in the database
   * @param id ID of the record to update
   * @param data Data to update
   * @returns Number of records updated
   */
  async update(id: string, data: any): Promise<number> {
    try {
      // If data includes a table property, use that to set the current table
      if (data && 'table' in data) {
        this.setTable(data.table as string);
        // Remove the table property to avoid passing it to the adapter
        const { table, ...restData } = data;
        data = restData;
      }
      
      // Choose the appropriate adapter based on the current table
      return await this.updateWithCurrentAdapter(id, data);
    } catch (error) {
      console.error('Error in update operation:', error);
      return 0;
    }
  }
  
  /**
   * Helper method to route updates to the right adapter
   * @private
   */
  private async updateWithCurrentAdapter(id: string, data: any): Promise<number> {
    switch (this.currentTable) {
      case BracketTable.Match:
        return this.matchAdapter.updateMatch(id, data);
      
      case BracketTable.Participant:
        return this.participantAdapter.updateParticipant(id, data);
      
      case BracketTable.Stage:
        return this.stageAdapter.updateStage(id, data);
      
      default:
        console.error(`Unknown table type for update: ${this.currentTable}`);
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
      console.error(`Error in updateInTable for ${table}:`, error);
      return 0;
    }
  }
  
  /**
   * Delete data from the database
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async delete(filter?: BracketFilter): Promise<number> {
    try {
      // If filter includes a table property, use that to set the current table
      if (filter && 'table' in filter) {
        this.setTable(filter.table as string);
        // Remove the table property to avoid passing it to the adapter
        const { table, ...restFilter } = filter;
        filter = restFilter as BracketFilter;
      }
      
      // Choose the appropriate adapter based on the current table
      return await this.deleteWithCurrentAdapter(filter);
    } catch (error) {
      console.error('Error in delete operation:', error);
      return 0;
    }
  }
  
  /**
   * Helper method to route deletes to the right adapter
   * @private
   */
  private async deleteWithCurrentAdapter(filter?: BracketFilter): Promise<number> {
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
        console.error(`Unknown table type for delete: ${this.currentTable}`);
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
      console.error(`Error in deleteFromTable for ${table}:`, error);
      return 0;
    }
  }

  /**
   * Centralized error handling for the adapter
   * @private
   */
  private handleError(operation: string, error: unknown): number {
    console.error(`Error in BracketsAdapter.${operation}:`, error);
    
    if (error instanceof AdapterOperationError) {
      throw error; // Re-throw our own error types
    }
    
    throw new AdapterOperationError(
      operation,
      `Failed to perform ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
