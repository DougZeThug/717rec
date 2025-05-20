
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
 */
export interface StorageAdapter<T, F extends BaseFilter, I> {
  /**
   * Select records from the storage
   */
  select(filter?: F): Promise<T[]>;
  
  /**
   * Insert records into the storage
   */
  insert(data: I[]): Promise<number>;
  
  /**
   * Update records in the storage
   */
  update(id: string, data: Partial<I>): Promise<number>;
  
  /**
   * Delete records from the storage
   */
  delete(filter?: F): Promise<number>;
}
