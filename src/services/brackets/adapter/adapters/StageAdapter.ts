
import { supabase } from "@/integrations/supabase/client";
import { BracketFormat } from '@/constants/brackets';

/**
 * Filter type for stage queries
 * Explicitly defining filter object properties to avoid recursive typing
 */
interface StageFilter {
  id?: string;
  tournament_id?: string;
  name?: string;
  type?: string;
  [key: string]: any; // Allow additional properties but with controlled depth
}

type StageRecord = {
  id: string;
  name: string;
  tournament_id: string;
  type: 'single_elimination' | 'double_elimination';
  settings: {
    size: number;
    grandFinal?: 'simple';
    seedOrdering: string[]; // Added seedOrdering as required
  };
};

/**
 * Adapter to manage stages (brackets) in the database
 */
export class StageAdapter {
  /**
   * Insert a stage into the database
   * @returns Number of stages inserted (1 or 0)
   */
  async insertStage(stage: any): Promise<number> {
    try {
      // Validate stage data
      if (!stage || !stage.id || stage.id === 'undefined') {
        console.error("Invalid stage data - missing ID:", stage);
        throw new Error("Stage ID is required and must be valid");
      }
      
      if (!stage.name || typeof stage.name !== 'string') {
        console.error("Invalid stage name:", stage.name);
        throw new Error("Stage name is required");
      }
      
      if (!stage.type || (stage.type !== 'single_elimination' && stage.type !== 'double_elimination')) {
        console.error("Invalid stage type:", stage.type);
        throw new Error("Stage type must be 'single_elimination' or 'double_elimination'");
      }

      // Validate settings
      if (!stage.settings || !stage.settings.seedOrdering || !Array.isArray(stage.settings.seedOrdering)) {
        console.error("Missing or invalid seedOrdering in settings:", stage.settings);
        // Default to ['natural'] if missing
        if (!stage.settings) stage.settings = {};
        stage.settings.seedOrdering = ['natural'];
      }
      
      console.log(`Inserting stage: ${stage.id}, name=${stage.name}, type=${stage.type}`);
      
      // Convert type to our format
      const format: BracketFormat = stage.type === 'single_elimination' 
        ? 'Single Elimination' 
        : 'Double Elimination';
      
      // Check if the bracket already exists
      const { data: existing, error: checkError } = await supabase
        .from('brackets')
        .select('id')
        .eq('id', stage.id)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking for existing bracket:", checkError);
        throw checkError;
      }
      
      // If it exists, we don't need to insert it
      if (existing) {
        console.log(`Bracket ${stage.id} already exists, skipping insert`);
        return 0;
      }
      
      // Insert the bracket
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: stage.id,
          title: stage.name,
          format: format,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error("Error inserting stage:", error);
        throw error;
      }
      
      console.log(`Stage ${stage.id} inserted successfully`);
      return 1;
    } catch (error) {
      console.error("Error inserting stage:", error);
      throw error;
    }
  }
  
  /**
   * Select stages from the database
   */
  async selectStage(filter?: StageFilter): Promise<StageRecord[]> {
    try {
      // Validate filter
      if (filter?.id === 'undefined' || filter?.tournament_id === 'undefined') {
        console.error("Invalid filter with 'undefined' string:", filter);
        throw new Error("Filter contains 'undefined' string value");
      }
      
      console.log("Selecting stages with filter:", filter);
      
      // Create a base query without chaining methods that cause deep type instantiation
      const baseQuery = supabase.from('brackets');
      
      // First get the raw data with minimal filtering
      let { data, error } = await this.applyFilters(baseQuery, filter);
      
      if (error) {
        console.error("Error selecting stage:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log("No stages found with filter:", filter);
        return [];
      }
      
      console.log(`Found ${data.length} stages`);
      
      // Convert to brackets-manager stage format with explicit typing
      return data.map(bracket => ({
        id: bracket.id,
        name: bracket.title,
        tournament_id: bracket.id, // Use bracket_id as tournament_id
        type: bracket.format === 'Single Elimination' ? 'single_elimination' : 'double_elimination',
        settings: {
          size: 0, // Would need to count participants
          grandFinal: 'simple',
          seedOrdering: ['natural'] // Default seed ordering
        }
      }));
    } catch (error) {
      console.error("Error selecting stage:", error);
      throw error;
    }
  }
  
  /**
   * Apply filters to query without causing deep type instantiation
   * Helper method to simplify the query building process
   */
  private async applyFilters(baseQuery: any, filter?: StageFilter) {
    // Start with a simple select
    let query = baseQuery.select('*');
    
    if (!filter) {
      console.log("No filter provided for stage query");
      return await query;
    }
    
    // Debug the filter being applied
    console.log("Applying filter to stages query:", filter);
    
    // Handle tournament_id filter specially
    if (filter.tournament_id && filter.tournament_id !== 'undefined') {
      console.log(`Filtering stages by tournament_id=${filter.tournament_id}`);
      return await query.eq('id', filter.tournament_id);
    }
    
    // For other filters, build a simple match object
    const simpleFilters: Record<string, any> = {};
    
    // Add each filter to the object instead of chaining, skipping any undefined values
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== 'undefined') {
        simpleFilters[key] = value;
      }
    });
    
    // Apply all filters at once if any exist
    if (Object.keys(simpleFilters).length > 0) {
      console.log(`Applying ${Object.keys(simpleFilters).length} filters:`, simpleFilters);
      return await query.match(simpleFilters);
    }
    
    // Return the base query if no filters applied
    return await query;
  }
  
  /**
   * Update a stage in the database
   * @returns Number of stages updated (1 or 0)
   */
  async updateStage(id: string, stage: any): Promise<number> {
    try {
      // Validate ID
      if (!id || id === 'undefined') {
        console.error("Invalid stage ID for update:", id);
        throw new Error("Valid stage ID is required for update");
      }
      
      if (!stage || !stage.name) {
        console.error("Invalid stage data for update:", stage);
        throw new Error("Valid stage data is required for update");
      }
      
      console.log(`Updating stage ${id} with data:`, stage);
      
      const { error } = await supabase
        .from('brackets')
        .update({
          title: stage.name,
          format: stage.type === 'single_elimination' ? 'Single Elimination' : 'Double Elimination'
        })
        .eq('id', id);
      
      if (error) {
        console.error("Error updating stage:", error);
        throw error;
      }
      
      console.log(`Stage ${id} updated successfully`);
      return 1;
    } catch (error) {
      console.error("Error updating stage:", error);
      throw error;
    }
  }
  
  /**
   * Delete a stage from the database
   * @returns Number of stages deleted
   */
  async deleteStage(filter?: StageFilter): Promise<number> {
    try {
      if (!filter || !filter.id || filter.id === 'undefined') {
        console.error("Invalid or missing ID in filter for stage deletion:", filter);
        throw new Error("Stage ID is required for deletion");
      }
      
      console.log(`Deleting stage with ID ${filter.id}`);
      
      const { error, count } = await supabase
        .from('brackets')
        .delete()
        .eq('id', filter.id)
        .select('count');
      
      if (error) {
        console.error("Error deleting stage:", error);
        throw error;
      }
      
      console.log(`Deleted ${count || 0} stages`);
      return count || 0;
    } catch (error) {
      console.error("Error deleting stage:", error);
      throw error;
    }
  }
}
