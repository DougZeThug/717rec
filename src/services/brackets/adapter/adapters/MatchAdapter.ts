
import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";
import { BaseFilter } from '../interfaces/StorageAdapter';

/**
 * Match type enum for database compatibility
 */
export type MatchTypeEnum = "winners" | "losers" | "finals";

/**
 * Filter type for match queries
 * Explicitly defining filter object properties to avoid recursive typing
 */
export interface MatchFilter extends BaseFilter {
  id?: string | string[];
  bracket_id?: string;
  round_number?: number;
  position?: number;
  match_type?: MatchTypeEnum;
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
      // Build and execute query with proper type handling
      const queryResult = await this.buildMatchQuery(filter);
      
      if (queryResult.error) throw queryResult.error;
      
      // Convert back to brackets-manager format
      return queryResult.data ? queryResult.data.map(match => this.converter.convertMatchFromDbFormat(match)) : [];
    } catch (error) {
      console.error("Error selecting matches:", error);
      throw error;
    }
  }
  
  /**
   * Build a query for matches based on filter conditions
   * @private
   */
  private async buildMatchQuery(filter?: MatchFilter) {
    // Create base query that returns all columns from matches table
    let query = supabase.from('matches').select('*');
    
    if (filter) {
      // Apply filters if provided
      if (filter.id) {
        if (Array.isArray(filter.id)) {
          query = query.in('id', filter.id);
        } else {
          query = query.eq('id', filter.id);
        }
      }
      
      if (filter.bracket_id) {
        query = query.eq('bracket_id', filter.bracket_id);
      }
      
      if (filter.round_number !== undefined) {
        query = query.eq('round_number', filter.round_number);
      }
      
      if (filter.position !== undefined) {
        query = query.eq('position', filter.position);
      }
      
      if (filter.match_type) {
        // Ensure we use a valid match type by casting to the enum type
        const validMatchType = filter.match_type as MatchTypeEnum;
        query = query.eq('match_type', validMatchType);
      }
    }
    
    // Execute the query and return the result
    return await query;
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
          // Ensure we use a valid match type by casting to the enum type
          const validMatchType = filter.match_type as MatchTypeEnum;
          finalQuery = finalQuery.eq('match_type', validMatchType);
        }
      }
      
      const { error, count } = await finalQuery.select('count');
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error deleting matches:", error);
      throw error;
    }
  }
}
