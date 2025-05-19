
/**
 * Interface for storage adapters that conform to brackets-manager expectations
 */
export interface StorageAdapter {
  // CRUD operations with correct return types that match brackets-manager expectations
  insert(table: string, data: any | any[]): Promise<number>; // Return number for brackets-manager compatibility
  select(table: string, filter?: Record<string, any>): Promise<any[]>;
  update(table: string, id: string, data: any): Promise<number>;
  delete(table: string, filter?: Record<string, any>): Promise<number>;
}
