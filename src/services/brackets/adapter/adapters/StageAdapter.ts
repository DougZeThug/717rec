
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
    let query = supabase.from('brackets').select();
    
    // Apply filters if provided, but prevent excessive type chaining
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (query && key && value !== undefined) {
          // Type assertion to fix deep instantiation
          query = query.eq(key, value) as any;
        }
      });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert our bracket to stage format
    return data?.map(bracket => ({
      id: bracket.id,
      name: bracket.title,
      type: bracket.format === 'Double Elimination' ? 'double_elimination' : 'single_elimination',
      divisionId: bracket.division_id,
      tournamentId: bracket.id // Add this to satisfy InputStage requirement
    })) || [];
  }
}
