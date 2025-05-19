
import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";

/**
 * Adapter to manage matches in the database
 */
export class MatchAdapter {
  private converter = new MatchConverterUtils();
  
  /**
   * Insert matches into the database
   * @returns Number of matches inserted
   */
  async insertMatches(matches: any[]): Promise<number> {
    let insertedCount = 0;
    
    // Batch insert to keep rows ≤ 50
    for (let i = 0; i < matches.length; i += 50) {
      const slice = matches.slice(i, i + 50);
      
      // Convert to our match format
      const matchesForDb = slice.map(match => this.converter.convertMatchToDbFormat(match));
      
      const { error } = await supabase.from('matches').insert(matchesForDb);
      if (error) throw error;
      insertedCount += slice.length;
    }
    
    return insertedCount;
  }
  
  /**
   * Select matches from the database
   */
  async selectMatches(filter?: Record<string, any>): Promise<any[]> {
    let query = supabase.from('matches').select();
    
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
    
    // Convert back to brackets-manager format
    return data ? data.map(match => this.converter.convertMatchFromDbFormat(match)) : [];
  }
  
  /**
   * Update a match in the database
   * @returns Number of matches updated (1 or 0)
   */
  async updateMatch(id: string, match: any): Promise<number> {
    const matchForDb = this.converter.convertMatchToDbFormat(match);
    const { error } = await supabase
      .from('matches')
      .update(matchForDb)
      .eq('id', id);
    
    if (error) throw error;
    return 1; // Successfully updated 1 match
  }
  
  /**
   * Delete matches from the database
   * @returns Number of matches deleted
   */
  async deleteMatches(filter?: Record<string, any>): Promise<number> {
    let query = supabase.from('matches').delete();
    
    // Apply filters if provided, but prevent excessive type chaining
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (query && key && value !== undefined) {
          // Type assertion to fix deep instantiation
          query = query.eq(key, value) as any;
        }
      });
    }
    
    const { error, count } = await query;
    if (error) throw error;
    return count || 0;
  }
}
