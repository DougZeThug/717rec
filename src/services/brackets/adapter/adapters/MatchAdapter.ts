
import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";
import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Filter type for match queries
 * Explicitly defining filter object properties to avoid recursive typing
 */
export interface MatchFilter extends BaseFilter {
  id?: string | string[];
  bracket_id?: string;
  round_number?: number;
  position?: number;
  match_type?: string;
  // Removed the [key: string]: any to prevent excessive type instantiation
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
        // Build query with specific filters
        let queryBuilder = query.select();
        
        // Handle id specifically
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            queryBuilder = queryBuilder.in('id', filter.id);
          } else {
            queryBuilder = queryBuilder.eq('id', filter.id);
          }
        }
        
        // Handle bracket_id
        if (filter.bracket_id) {
          queryBuilder = queryBuilder.eq('bracket_id', filter.bracket_id);
        }
        
        // Handle round_number
        if (filter.round_number !== undefined) {
          queryBuilder = queryBuilder.eq('round_number', filter.round_number);
        }
        
        // Handle position
        if (filter.position !== undefined) {
          queryBuilder = queryBuilder.eq('position', filter.position);
        }
        
        // Handle match_type
        if (filter.match_type) {
          queryBuilder = queryBuilder.eq('match_type', filter.match_type);
        }
        
        finalQuery = queryBuilder;
      } else {
        finalQuery = query.select();
      }
      
      // Execute the final query
      const { data, error } = await finalQuery;
      
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
      
      // Apply specific filters
      let finalQuery = query;
      
      if (filter) {
        // Handle id specifically
        if (filter.id) {
          if (Array.isArray(filter.id)) {
            finalQuery = finalQuery.in('id', filter.id);
          } else {
            finalQuery = finalQuery.eq('id', filter.id);
          }
        }
        
        // Handle other specific fields
        if (filter.bracket_id) {
          finalQuery = finalQuery.eq('bracket_id', filter.bracket_id);
        }
        
        if (filter.round_number !== undefined) {
          finalQuery = finalQuery.eq('round_number', filter.round_number);
        }
        
        if (filter.position !== undefined) {
          finalQuery = finalQuery.eq('position', filter.position);
        }
        
        if (filter.match_type) {
          finalQuery = finalQuery.eq('match_type', filter.match_type);
        }
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
