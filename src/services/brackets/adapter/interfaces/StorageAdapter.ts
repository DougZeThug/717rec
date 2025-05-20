
/**
 * Generic filter type for database queries
 * Base type that specific adapters can extend
 */
export interface BaseFilter {
  id?: string | string[];
  // Specific properties will be defined in extended interfaces
}

/**
 * Interface for storage adapters that conform to brackets-manager expectations
 */
export interface StorageAdapter {
  // CRUD operations with correct return types that match brackets-manager expectations
  insert(table: string, data: any | any[]): Promise<number>; // Return number for brackets-manager compatibility
  select(table: string, filter?: BaseFilter): Promise<any[]>;
  update(table: string, id: string, data: any): Promise<number>;
  delete(table: string, filter?: BaseFilter): Promise<number>;
}
