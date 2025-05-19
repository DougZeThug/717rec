
/**
 * Interface for storage adapters that conform to brackets-manager expectations
 */
export interface StorageAdapter {
  // CRUD operations with correct return types
  insert(table: string, data: any): Promise<boolean>; // Return boolean not number
  select(table: string, filter?: Record<string, any> | string): Promise<any[]>;
  update(table: string, id: string, data: any): Promise<boolean>;
  delete(table: string, filter?: Record<string, any>): Promise<boolean>;
  
  // Optional operations
  selectFirst?(table: string): Promise<any>;
  selectLast?(table: string): Promise<any>;
}
