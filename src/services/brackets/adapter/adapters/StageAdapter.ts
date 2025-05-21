
import { StageFilter, StageRecord } from '../types/AdapterTypes';
import { AdapterOperationError } from '../errors/AdapterErrors';
import { QueryBuilderUtils } from '../utils/QueryBuilderUtils';
import { TableNameMapper } from '../interfaces/TableNameMapper';
import { Database } from "@/integrations/supabase/types";

/**
 * Represents a database bracket record
 */
type BracketDbRecord = Database['public']['Tables']['brackets']['Row'];

/**
 * StageAdapter handles operations related to tournament stages (brackets)
 */
export class StageAdapter {
  private logicalTableName = 'stage';
  private dbTableName: string;

  constructor() {
    // Ensure we have the correct table name mapping
    this.dbTableName = TableNameMapper.toDbTableName(this.logicalTableName) as string;
    console.log(`[StageAdapter] Initialized with logical table name: ${this.logicalTableName}, mapped to DB table: ${this.dbTableName}`);
  }

  /**
   * Insert a new stage record
   * @param stageData Stage data to insert
   * @returns Number of records inserted (1)
   */
  async insertStage(stageData: any): Promise<number> {
    try {
      if (!stageData || typeof stageData !== 'object') {
        throw new Error('Invalid stage data provided');
      }

      console.log(`[StageAdapter] Inserting stage record into table: ${this.dbTableName}`);
      
      // Use the QueryBuilderUtils to safely create a query
      const queryBuilder = QueryBuilderUtils.createQueryBuilder(this.logicalTableName);
      const { error } = await queryBuilder.insert([stageData]);

      if (error) throw error;
      console.log(`[StageAdapter] Successfully inserted stage record`);
      return 1; // Successfully inserted 1 record
    } catch (error) {
      return this.handleError('insertStage', error);
    }
  }

  /**
   * Select stage records based on filter criteria
   * @param filter Filter criteria
   * @returns Array of stage records
   */
  async selectStage(filter?: StageFilter): Promise<StageRecord[]> {
    try {
      console.log(`[StageAdapter] Selecting stage records from table: ${this.dbTableName}`);
      
      // Use the QueryBuilderUtils to safely create a query
      let query = QueryBuilderUtils.createQueryBuilder(this.logicalTableName).select('*');
      
      // Apply common filters (id, limit, offset, order)
      query = QueryBuilderUtils.applyCommonFilters(query, filter);
      
      // Apply stage-specific filters
      if (filter) {
        if (filter.name !== undefined) {
          query = query.ilike('title', `%${filter.name}%`);
        }
        
        if (filter.type !== undefined) {
          query = query.eq('format', filter.type);
        }
        
        // Filter by tournament_id if provided
        if (filter.tournament_id !== undefined) {
          query = query.eq('id', filter.tournament_id);
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      console.log(`[StageAdapter] Found ${data?.length || 0} stage records`);
      
      // Transform database records to StageRecord format
      return (data || []).map(this.transformDbRecordToStageRecord);
    } catch (error) {
      return this.handleError('selectStage', error);
    }
  }

  /**
   * Update an existing stage record
   * @param id Stage ID
   * @param data Updated stage data
   * @returns Number of records updated (1 or 0)
   */
  async updateStage(id: string, data: any): Promise<number> {
    try {
      if (!id) throw new Error('Stage ID is required for update');
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid stage data provided for update');
      }
      
      console.log(`[StageAdapter] Updating stage record with ID: ${id}`);
      return await QueryBuilderUtils.executeUpdate(this.logicalTableName, id, data);
    } catch (error) {
      return this.handleError('updateStage', error);
    }
  }

  /**
   * Delete stage records based on filter criteria
   * @param filter Filter criteria
   * @returns Number of records deleted
   */
  async deleteStage(filter?: StageFilter): Promise<number> {
    try {
      console.log(`[StageAdapter] Deleting stage records`);
      return await QueryBuilderUtils.executeDelete(this.logicalTableName, filter);
    } catch (error) {
      return this.handleError('deleteStage', error);
    }
  }

  /**
   * Transform database record to StageRecord format
   * @private
   */
  private transformDbRecordToStageRecord(dbRecord: BracketDbRecord): StageRecord {
    return {
      id: dbRecord.id,
      name: dbRecord.title,
      tournament_id: dbRecord.id, // In our implementation, stage id is the same as tournament id
      type: dbRecord.format || 'single_elimination',
      settings: {
        // Add default settings
        seedOrdering: [],
        size: 0,
        matchesChildCount: 0,
        consolationFinal: false,
        grandFinal: 'none',
      }
    };
  }

  /**
   * Handle errors in a consistent way
   * @private
   */
  private handleError(operation: string, error: unknown): never {
    console.error(`[StageAdapter] Error in ${operation}:`, error);
    
    if (error instanceof AdapterOperationError) {
      throw error; // Re-throw adapter errors
    }
    
    throw new AdapterOperationError(
      operation,
      `Failed to perform ${operation}: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
}
