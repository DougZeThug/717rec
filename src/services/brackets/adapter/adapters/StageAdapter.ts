
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to manage stages/brackets in the database
 */
export class StageAdapter {
  /**
   * Insert a stage into the database
   * @returns Number of stages inserted
   */
  async insertStage(stage: any): Promise<number> {
    const { error } = await supabase.from('brackets').insert({
      id: stage.id,
      title: stage.name,
      format: stage.type === 'double_elimination' ? 'Double Elimination' : 'Single Elimination',
      division_id: stage.divisionId || null
    });
    
    if (error) throw error;
    return 1; // Always insert one stage
  }
  
  /**
   * Select stages from the database
   */
  async selectStages(filter?: Record<string, any>): Promise<any[]> {
    try {
      let query = supabase.from('brackets').select();
      
      // Apply filters if provided, avoiding deep chaining
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (key && value !== undefined) {
            // Explicit type assertion to break the chain
            (query as any) = query.eq(key, value);
          }
        });
      }
      
      // Execute query with explicit typing to break the chain
      const result = await query;
      const { data, error } = result;
      
      if (error) throw error;
      
      // Convert our bracket to stage format
      return (data || []).map(bracket => ({
        id: bracket.id,
        name: bracket.title,
        type: bracket.format === 'Double Elimination' ? 'double_elimination' : 'single_elimination',
        divisionId: bracket.division_id,
        tournamentId: bracket.id // Add this to satisfy InputStage requirement
      }));
    } catch (error) {
      console.error("Error selecting stages:", error);
      throw error;
    }
  }
}
