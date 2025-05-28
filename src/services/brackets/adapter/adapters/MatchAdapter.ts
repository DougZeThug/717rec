
import { supabase } from "@/integrations/supabase/client";
import { MatchConverterUtils } from "../utils/MatchConverterUtils";
import { BaseFilter } from '../interfaces/StorageAdapter';
import { AdapterOperationError } from '../errors/AdapterErrors';
import { assertValidUuidOrNull } from '@/utils/uuidValidation';

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
 * Response from a batch insert operation
 */
interface BatchInsertResponse {
  count: number;
  error: Error | null;
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
    if (!matches?.length) {
      return 0;
    }

    try {
      let insertedCount = 0;
      
      // Batch insert to keep rows ≤ 50
      for (let i = 0; i < matches.length; i += 50) {
        const result = await this.insertMatchBatch(matches.slice(i, i + 50));
        if (result.error) throw result.error;
        insertedCount += result.count;
      }
      
      return insertedCount;
    } catch (error) {
      console.error("Error inserting matches:", error);
      throw new AdapterOperationError('insertMatches', `Failed to insert matches: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  /**
   * Insert a batch of matches (up to 50)
   * @private
   */
  private async insertMatchBatch(matchBatch: any[]): Promise<BatchInsertResponse> {
    // Convert to our match format and validate UUID fields
    const matchesForDb = matchBatch.map(match => {
      const dbMatch = this.converter.convertMatchToDbFormat(match);
      
      // Validate optional UUID fields before insertion
      assertValidUuidOrNull(dbMatch.next_match_id, 'next_match_id');
      assertValidUuidOrNull(dbMatch.next_loser_match_id, 'next_loser_match_id');
      
      return dbMatch;
    });
    
    const { error, count } = await supabase.from('matches').insert(matchesForDb).select('count');
    
    return {
      count: count || matchBatch.length,
      error
    };
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
      throw new AdapterOperationError('selectMatches', `Failed to select matches: ${error instanceof Error ? error.message : String(error)}`, error);
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
      query = this.applyMatchFilters(query, filter);
    }
    
    // Execute the query and return the result
    return await query;
  }

  /**
   * Apply filters to a match query
   * @private
   */
  private applyMatchFilters(query: any, filter: MatchFilter) {
    // Apply filters if provided - FIXED: Use conditional logic instead of || ''
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

    return query;
  }
  
  /**
   * Update a match in the database
   * @returns Number of matches updated (1 or 0)
   */
  async updateMatch(id: string, match: any): Promise<number> {
    try {
      const matchForDb = this.converter.convertMatchToDbFormat(match);
      
      // Validate optional UUID fields before update
      assertValidUuidOrNull(matchForDb.next_match_id, 'next_match_id');
      assertValidUuidOrNull(matchForDb.next_loser_match_id, 'next_loser_match_id');
      
      const { error } = await supabase
        .from('matches')
        .update(matchForDb)
        .eq('id', id);
      
      if (error) throw error;
      return 1; // Successfully updated 1 match
    } catch (error) {
      console.error("Error updating match:", error);
      throw new AdapterOperationError('updateMatch', `Failed to update match: ${error instanceof Error ? error.message : String(error)}`, error);
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
      let finalQuery = filter ? this.applyMatchFilters(query, filter) : query;
      
      const { error, count } = await finalQuery.select('count');
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error deleting matches:", error);
      throw new AdapterOperationError('deleteMatches', `Failed to delete matches: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }
}
