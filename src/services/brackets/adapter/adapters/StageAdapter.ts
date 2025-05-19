
import { supabase } from "@/integrations/supabase/client";
import { BracketFormat } from '@/constants/brackets';

type StageRecord = {
  id: string;
  name: string;
  tournament_id: string;
  type: 'single_elimination' | 'double_elimination';
  settings: {
    size: number;
    grandFinal?: 'simple';
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
      
      if (checkError) throw checkError;
      
      // If it exists, we don't need to insert it
      if (existing) return 0;
      
      // Insert the bracket
      const { error } = await supabase
        .from('brackets')
        .insert({
          id: stage.id,
          title: stage.name,
          format: format,
          // tournamentId is not used in our model, we just store stageId
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      return 1;
    } catch (error) {
      console.error("Error inserting stage:", error);
      throw error;
    }
  }
  
  /**
   * Select stages from the database
   */
  async selectStage(filter?: Record<string, any>): Promise<StageRecord[]> {
    try {
      // Use a more explicit query type to avoid deep instantiation
      let query = supabase.from('brackets').select('*');
      
      // Apply filters with explicit handling
      if (filter) {
        if (filter.tournament_id) {
          query = query.eq('id', filter.tournament_id);
        } else {
          // Handle each filter separately to avoid complex type issues
          Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Convert to brackets-manager stage format with explicit typing
      return data.map(bracket => ({
        id: bracket.id,
        name: bracket.title,
        tournament_id: bracket.id, // Use bracket_id as tournament_id
        type: bracket.format === 'Single Elimination' ? 'single_elimination' : 'double_elimination',
        settings: {
          size: 0, // Would need to count participants
          grandFinal: 'simple'
        }
      }));
    } catch (error) {
      console.error("Error selecting stage:", error);
      throw error;
    }
  }
  
  /**
   * Update a stage in the database
   * @returns Number of stages updated (1 or 0)
   */
  async updateStage(id: string, stage: any): Promise<number> {
    try {
      const { error } = await supabase
        .from('brackets')
        .update({
          title: stage.name,
          format: stage.type === 'single_elimination' ? 'Single Elimination' : 'Double Elimination'
        })
        .eq('id', id);
      
      if (error) throw error;
      
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
  async deleteStage(filter?: Record<string, any>): Promise<number> {
    try {
      if (!filter || !filter.id) {
        throw new Error("Stage ID is required for deletion");
      }
      
      const { error, count } = await supabase
        .from('brackets')
        .delete()
        .eq('id', filter.id)
        .select('count');
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error("Error deleting stage:", error);
      throw error;
    }
  }
}
