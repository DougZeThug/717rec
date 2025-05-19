
/**
 * Interface for storage adapters that conform to brackets-manager expectations
 */
export interface StorageAdapter {
  // CRUD operations
  insert(table: string, data: any): Promise<boolean>;
  select(table: string, filter?: Record<string, any> | string): Promise<any[]>;
  update(table: string, id: string, data: any): Promise<boolean>;
  delete(table: string, filter?: Record<string, any>): Promise<boolean>;
  
  // Optional operations
  selectFirst?(): Promise<any>;
  selectLast?(): Promise<any>;
}
