import { BaseFilter } from '../interfaces/StorageAdapter';
import { supabase } from "@/integrations/supabase/client";

/**
 * Generic query builder utilities for database operations
 */
export class QueryBuilderUtils {
  /**
   * Apply common filters to a query
   * Handles standard fields like id, limit, offset, order
   */
  static applyCommonFilters(query: any, filter?: BaseFilter): any {
    if (!filter) return query;
    
    // Handle ID filtering (single or array)
    if (filter.id !== undefined) {
      if (Array.isArray(filter.id)) {
        query = query.in('id', filter.id);
      } else {
        query = query.eq('id', filter.id);
      }
    }
    
    // Handle pagination
    if (filter.limit !== undefined) {
      query = query.limit(filter.limit);
    }
    
    if (filter.offset !== undefined) {
      query = query.offset(filter.offset);
    }
    
    // Handle ordering
    if (filter.order !== undefined) {
      const [column, direction] = filter.order.split(':');
      query = query.order(column, { ascending: direction !== 'desc' });
    }
    
    return query;
  }
  
  /**
   * Execute a batch delete operation with filtering
   * @returns Number of records deleted
   */
  static async executeDelete(table: string, filter?: BaseFilter): Promise<number> {
    let query = supabase.from(table).delete();
    
    query = this.applyCommonFilters(query, filter);
    
    const { error, count } = await query.select('count');
    
    if (error) throw error;
    return count || 0;
  }
  
  /**
   * Execute a batch insert operation
   * @returns Number of records inserted
   */
  static async executeBatchInsert(table: string, data: any[]): Promise<number> {
    if (!data?.length) return 0;
    
    let insertedCount = 0;
    
    // Batch insert to keep rows ≤ 50 for optimal performance
    for (let i = 0; i < data.length; i += 50) {
      const batch = data.slice(i, i + 50);
      const { error } = await supabase.from(table).insert(batch);
      
      if (error) throw error;
      insertedCount += batch.length;
    }
    
    return insertedCount;
  }
  
  /**
   * Execute a single record update
   * @returns Number of records updated (1 or 0)
   */
  static async executeUpdate(table: string, id: string, data: any): Promise<number> {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);
    
    if (error) throw error;
    return 1; // Successfully updated 1 record
  }
}
