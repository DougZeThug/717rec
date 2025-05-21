import { BaseFilter } from '../interfaces/StorageAdapter';
import { supabase } from "@/integrations/supabase/client";
import { TableNameMapper, ValidTableName, isValidTable, isValidView } from '../interfaces/TableNameMapper';
import { Database } from "@/integrations/supabase/types";

/**
 * Type for valid database table names
 */
export type DatabaseTableName = keyof Database['public']['Tables'];

/**
 * Type for valid database view names
 */
export type DatabaseViewName = keyof Database['public']['Views'];

/**
 * Type to represent the PostgrestQueryBuilder we get from Supabase
 * This is a simplified version that lets us handle the common operations
 */
type GenericQueryBuilder = {
  select: (columns?: string) => any;
  insert: (values: any, options?: any) => Promise<{ data: any; error: any; count?: number }>;
  update: (values: any, options?: any) => any;
  delete: () => any;
  eq: (column: string, value: any) => any;
  in: (column: string, values: any[]) => any;
  order: (column: string, options?: { ascending?: boolean }) => any;
  limit: (count: number) => any;
  offset: (count: number) => any;
};

/**
 * Create a type-safe query builder for a specific table
 */
function createTableQueryBuilder<T extends DatabaseTableName>(tableName: T) {
  return supabase.from(tableName);
}

/**
 * Create a type-safe query builder for a specific view
 */
function createViewQueryBuilder<T extends DatabaseViewName>(viewName: T) {
  return supabase.from(viewName);
}

/**
 * Safely creates a Supabase query builder for a table or view
 * Handles type casting and validation
 */
function createSafeQueryBuilder(tableName: string): GenericQueryBuilder {
  const mappedName = TableNameMapper.toDbTableName(tableName);
  
  console.log(`[QueryBuilderUtils] Creating query builder for: ${mappedName} (original: ${tableName})`);
  
  if (isValidTable(mappedName)) {
    // It's a valid table, use the typed table query builder
    return createTableQueryBuilder(mappedName) as unknown as GenericQueryBuilder;
  } else if (isValidView(mappedName)) {
    // It's a valid view, use the typed view query builder
    return createViewQueryBuilder(mappedName) as unknown as GenericQueryBuilder;
  } else {
    // Fallback to a safe default
    console.warn(`[QueryBuilderUtils] Invalid table/view name: ${mappedName}, falling back to "matches"`);
    return createTableQueryBuilder('matches') as unknown as GenericQueryBuilder;
  }
}

/**
 * Generic query builder utilities for database operations
 */
export class QueryBuilderUtils {
  /**
   * Apply common filters to a query
   * Handles standard fields like id, limit, offset, order
   */
  static applyCommonFilters<T>(query: any, filter?: BaseFilter): any {
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
    try {
      console.log(`[QueryBuilderUtils] Deleting from table: ${table}`);
      
      // Create the query using the safe query builder
      let query = createSafeQueryBuilder(table).delete();
      
      query = this.applyCommonFilters(query, filter);
      
      const { error, count } = await query.select('count');
      
      if (error) {
        console.error(`[QueryBuilderUtils] Error executing delete:`, error);
        throw error;
      }
      
      console.log(`[QueryBuilderUtils] Successfully deleted ${count || 0} records`);
      return count || 0;
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to delete from table ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a batch insert operation
   * @returns Number of records inserted
   */
  static async executeBatchInsert(table: string, data: any[]): Promise<number> {
    if (!data?.length) return 0;
    
    try {
      console.log(`[QueryBuilderUtils] Inserting into table: ${table}, records: ${data.length}`);
      
      let insertedCount = 0;
      
      // Batch insert to keep rows ≤ 50 for optimal performance
      for (let i = 0; i < data.length; i += 50) {
        const batch = data.slice(i, i + 50);
        
        // Use the safe query builder to create the query
        const queryBuilder = createSafeQueryBuilder(table);
        // Use explicit async/await with type assertion to resolve TypeScript error
        const result = await queryBuilder.insert(batch);
        
        if (result.error) {
          console.error(`[QueryBuilderUtils] Error executing insert:`, result.error);
          throw result.error;
        }
        
        insertedCount += batch.length;
      }
      
      console.log(`[QueryBuilderUtils] Successfully inserted ${insertedCount} records`);
      return insertedCount;
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to insert into table ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a single record update
   * @returns Number of records updated (1 or 0)
   */
  static async executeUpdate(table: string, id: string, data: any): Promise<number> {
    try {
      console.log(`[QueryBuilderUtils] Updating table: ${table}, id: ${id}`);
      
      // Use the safe query builder to create the query and explicit await
      const queryBuilder = createSafeQueryBuilder(table);
      const result = await queryBuilder.update(data).eq('id', id);
      
      if (result.error) {
        console.error(`[QueryBuilderUtils] Error executing update:`, result.error);
        throw result.error;
      }
      
      console.log(`[QueryBuilderUtils] Successfully updated record ${id}`);
      return 1; // Successfully updated 1 record
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to update table ${table}:`, error);
      throw error;
    }
  }

  /**
   * Create a typed query builder for a specified table
   * @param tableName The table name to query
   * @returns A query builder instance
   */
  static createQueryBuilder<T = any>(tableName: string): any {
    return createSafeQueryBuilder(tableName);
  }
}
