
import { supabase } from "@/integrations/supabase/client";
import { StageFilter, StageRecord } from '../types/AdapterTypes';
import { AdapterOperationError } from '../errors/AdapterErrors';
import { QueryBuilderUtils } from '../utils/QueryBuilderUtils';
import { TableNameMapper } from '../interfaces/TableNameMapper';

/**
 * StageAdapter handles operations related to tournament stages (brackets)
 */
export class StageAdapter {
  private tableName = 'stage';
  private dbTableName: string;

  constructor() {
    this.dbTableName = TableNameMapper.toDbTableName(this.tableName);
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

      const { error } = await supabase
        .from(this.dbTableName)
        .insert([stageData]);

      if (error) throw error;
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
      let query = supabase.from(this.dbTableName).select('*');
      
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
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
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
      
      return await QueryBuilderUtils.executeUpdate(this.tableName, id, data);
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
      return await QueryBuilderUtils.executeDelete(this.tableName, filter);
    } catch (error) {
      return this.handleError('deleteStage', error);
    }
  }

  /**
   * Handle errors in a consistent way
   * @private
   */
  private handleError(operation: string, error: unknown): never {
    console.error(`Error in StageAdapter.${operation}:`, error);
    
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
