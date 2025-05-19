
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
    try {
      let query = supabase.from('matches').select();
      
      // Apply filters individually to avoid deep type instantiation
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (key && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }
      
      // Execute query with explicit typing to break the chain
      const result = await query;
      const { data, error } = result;
      
      if (error) throw error;
      
      // Convert back to brackets-manager format
      return data ? data.map(match => this.converter.convertMatchFromDbFormat(match)) : [];
    } catch (error) {
      console.error("Error selecting matches:", error);
      throw error;
    }
  }
  
  /**
   * Update a match in the database
   * @returns Number of matches updated (1 or 0)
   */
  async updateMatch(id: string, match: any): Promise<number> {
    try {
      const matchForDb = this.converter.convertMatchToDbFormat(match);
      const { error } = await supabase
        .from('matches')
        .update(matchForDb)
        .eq('id', id);
      
      if (error) throw error;
      return 1; // Successfully updated 1 match
    } catch (error) {
      console.error("Error updating match:", error);
      throw error;
    }
  }
  
  /**
   * Delete matches from the database
   * @returns Number of matches deleted
   */
  async deleteMatches(filter?: Record<string, any>): Promise<number> {
    try {
      let query = supabase.from('matches').delete();
      
      // Apply filters individually to avoid deep type instantiation
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (key && value !== undefined) {
            query = query.eq(key, value);
          }
        });
      }
      
      // Execute query with explicit typing
      const result = await query;
      const { error, count } = result;
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error deleting matches:", error);
      throw error;
    }
  }
}
