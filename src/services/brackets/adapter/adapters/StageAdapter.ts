
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
      // Start with base query
      const query = supabase.from('brackets');
      
      // Apply filters if provided
      let finalQuery = query;
      if (filter) {
        // Cast to any to avoid deep type instantiation
        const queryBuilder = query as any;
        
        // Apply each filter safely
        Object.keys(filter).forEach(key => {
          const value = filter[key];
          if (key && value !== undefined) {
            queryBuilder.eq(key, value);
          }
        });
        
        finalQuery = queryBuilder;
      }
      
      // Execute query
      const { data, error } = await finalQuery.select();
      
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
