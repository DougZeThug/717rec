
import { supabase } from "@/integrations/supabase/client";
import { BracketFormat } from '@/constants/brackets';
import { StageFilter, StageRecord } from '../types/AdapterTypes';
import { AdapterOperationError } from '../errors/AdapterErrors';
import { TableNameMapper } from '../interfaces/TableNameMapper';
import { QueryBuilderUtils } from '../utils/QueryBuilderUtils';

/**
 * Database response type for brackets table
 */
interface BracketDbRecord {
  id: string;
  title: string;
  format: string;
  division_id?: string;
  created_at?: string;
}

/**
 * Adapter to manage stages (brackets) in the database
 */
export class StageAdapter {
  private readonly tableName = 'brackets';

  /**
   * Insert a stage into the database
   * @returns Number of stages inserted (1 or 0)
   */
  async insertStage(stage: any): Promise<number> {
    try {
      // Validate the stage data before proceeding
      if (!this.validateStage(stage)) {
        return 0; // Validation failed, return 0 inserted
      }
      
      // Check if the bracket already exists
      const { data: existing } = await this.getBracketById(stage.id);
      
      // If it exists, we don't need to insert it
      if (existing) {
        console.log(`Bracket ${stage.id} already exists, skipping insert`);
        return 0;
      }
      
      // Convert type to our format
      const format: BracketFormat = this.convertTypeToFormat(stage.type);
      
      // Insert the bracket
      const { error } = await supabase
        .from(this.tableName)
        .insert({
          id: stage.id,
          title: stage.name,
          format: format,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        throw new AdapterOperationError('insertStage', error.message, error);
      }
      
      console.log(`Stage ${stage.id} inserted successfully`);
      return 1;
    } catch (error) {
      this.logError('insertStage', error);
      return 0; // Return 0 to indicate failure after error has been logged
    }
  }
  
  /**
   * Select stages from the database based on filter criteria
   */
  async selectStage(filter?: StageFilter): Promise<StageRecord[]> {
    try {
      if (this.isInvalidFilter(filter)) {
        return [];
      }
      
      console.log("Selecting stages with filter:", filter);
      
      const { data, error } = await this.buildStageQuery(filter);
      
      if (error) {
        throw new AdapterOperationError('selectStage', error.message, error);
      }
      
      if (!data || data.length === 0) {
        console.log("No stages found with filter:", filter);
        return [];
      }
      
      console.log(`Found ${data.length} stages`);
      
      // Convert to brackets-manager stage format
      return this.convertToStageRecords(data);
    } catch (error) {
      this.logError('selectStage', error);
      return [];
    }
  }
  
  /**
   * Update a stage in the database
   * @returns Number of stages updated (1 or 0)
   */
  async updateStage(id: string, stage: any): Promise<number> {
    try {
      this.validateUpdateParams(id, stage);
      
      console.log(`Updating stage ${id} with data:`, stage);
      
      const { error } = await supabase
        .from(this.tableName)
        .update({
          title: stage.name,
          format: this.convertTypeToFormat(stage.type)
        })
        .eq('id', id);
      
      if (error) {
        throw new AdapterOperationError('updateStage', error.message, error);
      }
      
      console.log(`Stage ${id} updated successfully`);
      return 1;
    } catch (error) {
      this.logError('updateStage', error);
      return 0;
    }
  }
  
  /**
   * Delete a stage from the database
   * @returns Number of stages deleted
   */
  async deleteStage(filter?: StageFilter): Promise<number> {
    try {
      if (!filter?.id) {
        throw new AdapterOperationError('deleteStage', 'Stage ID is required for deletion');
      }
      
      console.log(`Deleting stage with ID ${filter.id}`);
      
      const { error, count } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', filter.id)
        .select('count');
      
      if (error) {
        throw new AdapterOperationError('deleteStage', error.message, error);
      }
      
      console.log(`Deleted ${count || 0} stages`);
      return count || 0;
    } catch (error) {
      this.logError('deleteStage', error);
      return 0;
    }
  }

  /**
   * Helper method to check if a filter is invalid
   * @private
   */
  private isInvalidFilter(filter?: StageFilter): boolean {
    if (!filter) return false;
    
    return (
      (filter.id && filter.id === 'undefined') || 
      (filter.tournament_id && filter.tournament_id === 'undefined')
    );
  }

  /**
   * Helper method to validate stage data before insertion
   * @private
   */
  private validateStage(stage: any): boolean {
    try {
      if (!stage || !stage.id || stage.id === 'undefined') {
        throw new AdapterOperationError('validateStage', 'Stage ID is required and must be valid');
      }
      
      if (!stage.name || typeof stage.name !== 'string') {
        throw new AdapterOperationError('validateStage', 'Stage name is required');
      }
      
      if (!stage.type || (stage.type !== 'single_elimination' && stage.type !== 'double_elimination')) {
        throw new AdapterOperationError('validateStage', "Stage type must be 'single_elimination' or 'double_elimination'");
      }

      // Validate settings
      if (!stage.settings || !stage.settings.seedOrdering || !Array.isArray(stage.settings.seedOrdering)) {
        console.warn("Missing or invalid seedOrdering in settings:", stage.settings);
        // Default to ['natural'] if missing
        if (!stage.settings) stage.settings = {};
        stage.settings.seedOrdering = ['natural'];
      }
      
      console.log(`Validated stage: ${stage.id}, name=${stage.name}, type=${stage.type}`);
      return true;
    } catch (error) {
      this.logError('validateStage', error);
      return false;
    }
  }

  /**
   * Helper method to validate update parameters
   * @private
   */
  private validateUpdateParams(id: string, stage: any): void {
    if (!id || id === 'undefined') {
      throw new AdapterOperationError('updateStage', 'Valid stage ID is required for update');
    }
    
    if (!stage || !stage.name) {
      throw new AdapterOperationError('updateStage', 'Stage data with name is required for update');
    }
  }

  /**
   * Helper method to build the stage query
   * @private
   */
  private async buildStageQuery(filter?: StageFilter) {
    // Create a base query
    let query = QueryBuilderUtils.createQueryBuilder<BracketDbRecord>(this.tableName);
    
    if (!filter) {
      return await query;
    }
    
    // Handle tournament_id filter specially
    if (filter.tournament_id && filter.tournament_id !== 'undefined') {
      return await query.eq('id', filter.tournament_id);
    }
    
    // For other specific filters
    if (filter.id && filter.id !== 'undefined') {
      query = query.eq('id', filter.id);
    }
    
    if (filter.name && filter.name !== 'undefined') {
      query = query.eq('title', filter.name);
    }
    
    if (filter.type && filter.type !== 'undefined') {
      const format = this.getFormatFromType(filter.type);
      query = query.eq('format', format);
    }
    
    // Return the query with applied filters
    return await query;
  }

  /**
   * Helper method to get bracket by ID
   * @private
   */
  private async getBracketById(id: string) {
    return await supabase
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .maybeSingle();
  }
  
  /**
   * Helper method to convert database records to StageRecord format
   * @private 
   */
  private convertToStageRecords(data: BracketDbRecord[]): StageRecord[] {
    return data.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      tournament_id: bracket.id, // Use bracket_id as tournament_id
      type: this.getTypeFromFormat(bracket.format),
      settings: {
        size: 0, // Would need to count participants
        grandFinal: 'simple',
        seedOrdering: ['natural'] // Default seed ordering
      }
    }));
  }
  
  /**
   * Helper to convert format to type
   * @private
   */
  private getTypeFromFormat(format: string): 'single_elimination' | 'double_elimination' {
    return format === 'Single Elimination' ? 'single_elimination' : 'double_elimination';
  }
  
  /**
   * Helper to convert type to format
   * @private
   */
  private getFormatFromType(type: string): BracketFormat {
    return type === 'single_elimination' 
      ? 'Single Elimination' 
      : 'Double Elimination';
  }

  /**
   * Convert internal type representation to our format
   * @private
   */
  private convertTypeToFormat(type: string): BracketFormat {
    return this.getFormatFromType(type);
  }

  /**
   * Centralized error logging function
   * This replaces the previous handleError method to avoid issues with the 'never' return type
   * @private
   */
  private logError(operation: string, error: unknown): void {
    console.error(`Error in StageAdapter.${operation}:`, error);
  }
}
