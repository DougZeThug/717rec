
/**
 * Base interface for filters used in storage adapter queries
 */
export interface BaseFilter {
  id?: string | string[];
  limit?: number;
  offset?: number;
  order?: string;
  [key: string]: any;
}

/**
 * Base interface for storage adapters
 * This aligns with the brackets-manager expected interface
 */
export interface StorageAdapter<T, F extends BaseFilter, I> {
  /**
   * Select records from the storage
   */
  select(filter?: F): Promise<T[]>;
  
  /**
   * Insert records into the storage
   * Returns a boolean indicating success
   */
  insert(data: I[]): Promise<boolean>;
  
  /**
   * Update records in the storage
   */
  update(id: string, data: Partial<I>): Promise<number>;
  
  /**
   * Delete records from the storage
   */
  delete(filter?: F): Promise<number>;
  
  /**
   * Legacy method for table-based operations
   */
  selectFrom?(table: string, filter?: F): Promise<T[]>;
  
  /**
   * Legacy method for table-based operations
   */
  insertInto?(table: string, data: I | I[]): Promise<boolean>;
  
  /**
   * Legacy method for table-based operations
   */
  updateIn?(table: string, id: string, data: Partial<I>): Promise<number>;
  
  /**
   * Legacy method for table-based operations
   */
  deleteFrom?(table: string, filter?: F): Promise<number>;
}
