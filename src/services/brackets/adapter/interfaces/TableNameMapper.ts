
import { Database } from "@/integrations/supabase/types";

/**
 * Valid table types that can be used in database operations
 */
export type ValidTableName = keyof Database['public']['Tables'] | keyof Database['public']['Views'];

/**
 * Maps between logical table names used in brackets-manager and actual database table names
 */
export class TableNameMapper {
  // Define Supabase's valid table names to match the database schema
  private static readonly TABLE_MAP: Record<string, ValidTableName> = {
    'match': 'matches',
    'participant': 'participants',
    'stage': 'brackets',
  };
  
  // Reverse mapping for lookups from database to logical name
  private static readonly REVERSE_MAP: Record<string, string> = {
    'matches': 'match',
    'participants': 'participant',
    'brackets': 'stage',
  };
  
  // Valid table names for validation
  private static readonly VALID_TABLES = new Set<string>([
    'match', 'participant', 'stage',
    'matches', 'participants', 'brackets'
  ]);
  
  /**
   * Convert a logical table name to the actual database table name
   * @param logicalName The logical table name used in brackets-manager
   * @returns The actual database table name
   */
  public static toDbTableName(logicalName: string): ValidTableName {
    if (!logicalName) {
      console.warn('[TableNameMapper] Empty table name provided, falling back to "matches"');
      return 'matches';
    }
    
    const normalizedName = logicalName.toLowerCase();
    
    // Check if we have a direct mapping for this name
    if (normalizedName in this.TABLE_MAP) {
      return this.TABLE_MAP[normalizedName];
    }
    
    // If no mapping exists, check if the name itself is valid
    if (this.isValidTable(normalizedName)) {
      return normalizedName as ValidTableName;
    }
    
    // If we get here, we couldn't find a valid mapping
    console.warn(`[TableNameMapper] Invalid table name: "${logicalName}", falling back to "matches"`);
    return 'matches';
  }
  
  /**
   * Convert a database table name back to a logical table name
   * @param dbName The database table name
   * @returns The logical table name
   */
  public static toLogicalName(dbName: string): string {
    if (!dbName) return 'match'; // Default to match if empty
    
    const normalizedName = dbName.toLowerCase();
    return this.REVERSE_MAP[normalizedName] || normalizedName;
  }
  
  /**
   * Check if a table name is valid
   * @param tableName Table name to validate
   * @returns true if valid, false otherwise
   */
  public static isValidTable(tableName: string): boolean {
    if (!tableName) return false;
    const normalizedName = tableName.toLowerCase();
    return this.VALID_TABLES.has(normalizedName);
  }
}
