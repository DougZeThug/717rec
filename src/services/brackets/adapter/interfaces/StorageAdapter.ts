
/**
 * Interface for storage adapters that conform to brackets-manager expectations
 */
export interface StorageAdapter {
  // CRUD operations with correct return types
  insert<T>(table: string, data: T | T[]): Promise<boolean>; // Return boolean for brackets-manager compatibility
  select<T>(table: string, filter?: Record<string, any> | string): Promise<T[]>;
  update<T>(table: string, id: string, data: T): Promise<boolean>;
  delete(table: string, filter?: Record<string, any>): Promise<boolean>;
  
  // Optional operations
  selectFirst?<T>(table: string): Promise<T | null>;
  selectLast?<T>(table: string): Promise<T | null>;
}
