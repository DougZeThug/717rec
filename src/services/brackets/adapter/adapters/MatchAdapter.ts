import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";

/**
 * Adapter to manage matches in the database
 */
export class MatchAdapter {
  private converter = new MatchConverterUtils();
  
  /**
   * Insert matches into the database
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
    const query = supabase.from('matches').select();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Convert back to brackets-manager format
    return data ? data.map(match => this.converter.convertMatchFromDbFormat(match)) : [];
  }
  
  /**
   * Update a match in the database
   */
  async updateMatch(id: string, match: any): Promise<boolean> {
    const matchForDb = this.converter.convertMatchToDbFormat(match);
    const { error } = await supabase
      .from('matches')
      .update(matchForDb)
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
  
  /**
   * Delete matches from the database
   */
  async deleteMatches(filter?: Record<string, any>): Promise<boolean> {
    const query = supabase.from('matches').delete();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });
    }
    const { error } = await query;
    if (error) throw error;
    return true;
  }
}
