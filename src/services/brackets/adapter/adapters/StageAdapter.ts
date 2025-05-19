
import { supabase } from "@/integrations/supabase/client";

/**
 * Adapter to manage stages/brackets in the database
 */
export class StageAdapter {
  /**
   * Insert a stage into the database
   */
  async insertStage(stage: any): Promise<number> {
    const { error } = await supabase.from('brackets').insert({
      id: stage.id,
      title: stage.name,
      format: stage.type === 'double_elimination' ? 'Double Elimination' : 'Single Elimination',
      division_id: stage.divisionId || null
    });
    
    if (error) throw error;
    return 1;
  }
  
  /**
   * Select stages from the database
   */
  async selectStages(filter?: Record<string, any>): Promise<any[]> {
    let query = supabase.from('brackets').select();
    
    // Apply filters if provided
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (query) {
          query = query.eq(key, value);
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
