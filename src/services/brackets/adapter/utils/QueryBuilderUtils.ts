
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
 * Query result wrapper to standardize error handling
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

/**
 * Type to represent the Supabase query builder with common operations
 * This provides better type safety than using 'any'
 */
interface GenericQueryBuilder {
  select: (columns?: string) => GenericQueryBuilder;
  insert: (values: any, options?: any) => Promise<QueryResult<any>>;
  update: (values: any, options?: any) => GenericQueryBuilder;
  delete: () => GenericQueryBuilder;
  eq: (column: string, value: any) => GenericQueryBuilder;
  in: (column: string, values: any[]) => GenericQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => GenericQueryBuilder;
  limit: (count: number) => GenericQueryBuilder;
  offset: (count: number) => GenericQueryBuilder;
  ilike: (column: string, pattern: string) => GenericQueryBuilder;
  then: <T = any>(callback: (value: QueryResult<T>) => void) => Promise<QueryResult<T>>;
}

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
 * with improved error handling and type safety
 */
function createSafeQueryBuilder(tableName: string): GenericQueryBuilder {
  try {
    const mappedName = TableNameMapper.toDbTableName(tableName);
    
    console.log(`[QueryBuilderUtils] Creating query builder for: ${mappedName} (original: ${tableName})`);
    
    // Create the appropriate query builder based on table type
    if (isValidTable(mappedName)) {
      return createTableQueryBuilder(mappedName) as unknown as GenericQueryBuilder;
    } else if (isValidView(mappedName)) {
      return createViewQueryBuilder(mappedName) as unknown as GenericQueryBuilder;
    } else {
      // Log a detailed error but provide a safe fallback
      console.warn(`[QueryBuilderUtils] Invalid table/view name: ${mappedName}, falling back to "matches"`);
      return createTableQueryBuilder('matches') as unknown as GenericQueryBuilder;
    }
  } catch (error) {
    console.error(`[QueryBuilderUtils] Error creating query builder for ${tableName}:`, error);
    // Always return a valid query builder as a fallback
    return createTableQueryBuilder('matches') as unknown as GenericQueryBuilder;
  }
}

/**
 * Generic query builder utilities for database operations
 * with improved error handling and type checking
 */
export class QueryBuilderUtils {
  /**
   * Apply common filters to a query with better type handling
   * @param query The query builder to apply filters to
   * @param filter The filter criteria to apply
   * @returns The modified query with filters applied
   */
  static applyCommonFilters<T>(query: GenericQueryBuilder, filter?: BaseFilter): GenericQueryBuilder {
    if (!filter) return query;
    
    try {
      // Handle ID filtering (single or array)
      if (filter.id !== undefined) {
        query = Array.isArray(filter.id) 
          ? query.in('id', filter.id) 
          : query.eq('id', filter.id);
      }
      
      // Handle pagination
      if (typeof filter.limit === 'number' && filter.limit > 0) {
        query = query.limit(filter.limit);
      }
      
      if (typeof filter.offset === 'number' && filter.offset >= 0) {
        query = query.offset(filter.offset);
      }
      
      // Handle ordering
      if (filter.order && typeof filter.order === 'string') {
        const [column, direction] = filter.order.split(':');
        if (column) {
          query = query.order(column, { ascending: direction !== 'desc' });
        }
      }
      
      return query;
    } catch (error) {
      console.error('[QueryBuilderUtils] Error applying filters:', error);
      return query; // Return unmodified query on error
    }
  }
  
  /**
   * Execute a batch delete operation with filtering and improved error handling
   * @returns Number of records deleted
   */
  static async executeDelete(table: string, filter?: BaseFilter): Promise<number> {
    try {
      console.log(`[QueryBuilderUtils] Deleting from table: ${table}`);
      
      // Create the query using the safe query builder
      let query = createSafeQueryBuilder(table).delete();
      
      // Apply common filters if provided
      if (filter) {
        query = this.applyCommonFilters(query, filter);
      }
      
      const { data, error, count } = await query.select('count');
      
      if (error) {
        console.error(`[QueryBuilderUtils] Error executing delete:`, error);
        throw error;
      }
      
      const deletedCount = count || 0;
      console.log(`[QueryBuilderUtils] Successfully deleted ${deletedCount} records`);
      return deletedCount;
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to delete from table ${table}:`, error);
      throw error;
    }
  }
  
  /**
   * Execute a batch insert operation with improved error handling and batching
   * @returns Number of records inserted
   */
  static async executeBatchInsert(table: string, data: any[]): Promise<number> {
    if (!data?.length) return 0;
    
    try {
      console.log(`[QueryBuilderUtils] Inserting into table: ${table}, records: ${data.length}`);
      
      const batchSize = 50; // Optimal batch size for performance
      let insertedCount = 0;
      
      // Process data in optimal batch sizes
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        console.log(`[QueryBuilderUtils] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}`);
        
        // Use the safe query builder to create the query
        const queryBuilder = createSafeQueryBuilder(table);
        const { error } = await queryBuilder.insert(batch);
        
        if (error) {
          console.error(`[QueryBuilderUtils] Error executing insert batch:`, error);
          throw error;
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
   * Execute a single record update with improved error reporting
   * @returns Number of records updated (1 or 0)
   */
  static async executeUpdate(table: string, id: string, data: any): Promise<number> {
    try {
      if (!id) {
        throw new Error('ID is required for update operation');
      }
      
      console.log(`[QueryBuilderUtils] Updating table: ${table}, id: ${id}`);
      
      // Use the safe query builder to create the query
      const queryBuilder = createSafeQueryBuilder(table);
      const { error } = await queryBuilder.update(data).eq('id', id);
      
      if (error) {
        console.error(`[QueryBuilderUtils] Error executing update:`, error);
        throw error;
      }
      
      console.log(`[QueryBuilderUtils] Successfully updated record ${id}`);
      return 1; // Successfully updated 1 record
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to update table ${table}:`, error);
      throw error;
    }
  }

  /**
   * Create a typed query builder for a specified table with error handling
   * @param tableName The table name to query
   * @returns A query builder instance
   */
  static createQueryBuilder<T = any>(tableName: string): GenericQueryBuilder {
    return createSafeQueryBuilder(tableName);
  }

  /**
   * Execute a select query with filtering and error handling
   * @returns Query result with data and error properties
   */
  static async executeSelect<T = any>(table: string, filter?: BaseFilter): Promise<QueryResult<T[]>> {
    try {
      console.log(`[QueryBuilderUtils] Selecting from table: ${table}`);
      
      // Create the query using the safe query builder
      let query = createSafeQueryBuilder(table).select('*');
      
      // Apply common filters if provided
      if (filter) {
        query = this.applyCommonFilters(query, filter);
      }
      
      const result = await query;
      
      return {
        data: result.data as T[],
        error: result.error,
        count: result.data?.length || 0
      };
    } catch (error) {
      console.error(`[QueryBuilderUtils] Failed to select from table ${table}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}
