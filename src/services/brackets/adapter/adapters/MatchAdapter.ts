
import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";

/**
 * Filter type for match queries
 * Explicitly defining filter object properties to avoid recursive typing
 */
interface MatchFilter {
  id?: string | string[];
  bracket_id?: string;
  round_number?: number;
  position?: number;
  match_type?: string;
  [key: string]: any; // Allow additional properties but with controlled depth
}

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
  async selectMatches(filter?: MatchFilter): Promise<any[]> {
    try {
      // Create base query
      const query = supabase.from('matches');
      
      // Apply filters if provided
      let finalQuery = query;
      if (filter) {
        // Cast to any to avoid deep type instantiation
        const queryBuilder = query as any;
        
        // Apply each filter separately
        Object.keys(filter).forEach(key => {
          const value = filter[key];
          if (key && value !== undefined) {
            queryBuilder.eq(key, value);
          }
        });
        
        finalQuery = queryBuilder;
      }
      
      // Execute the final query
      const { data, error } = await finalQuery.select();
      
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
  async deleteMatches(filter?: MatchFilter): Promise<number> {
    try {
      const query = supabase.from('matches').delete();
      
      // Apply filters separately
      let finalQuery = query;
      if (filter) {
        // Cast to any to avoid deep type instantiation
        const queryBuilder = query as any;
        
        Object.keys(filter).forEach(key => {
          const value = filter[key];
          if (key && value !== undefined) {
            queryBuilder.eq(key, value);
          }
        });
        
        finalQuery = queryBuilder;
      }
      
      const { error, count } = await finalQuery;
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error deleting matches:", error);
      throw error;
    }
  }
}
