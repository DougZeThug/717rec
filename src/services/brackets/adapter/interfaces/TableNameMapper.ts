
/**
 * Maps between logical table names used in brackets-manager and actual database table names
 */
export class TableNameMapper {
  // Define Supabase's valid table names to match the database schema
  private static readonly TABLE_MAP: Record<string, string> = {
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
  private static readonly VALID_TABLES: string[] = [
    'match', 'participant', 'stage',
    'matches', 'participants', 'brackets'
  ];
  
  /**
   * Convert a logical table name to the actual database table name
   * @param logicalName The logical table name used in brackets-manager
   * @returns The actual database table name
   */
  public static toDbTableName(logicalName: string): string {
    if (!logicalName) {
      console.warn('Empty table name provided, falling back to "matches"');
      return 'matches';
    }
    
    const normalizedName = logicalName.toLowerCase();
    const tableName = this.TABLE_MAP[normalizedName] || normalizedName;
    
    // Validate the table name for security
    if (!this.isValidTable(tableName)) {
      console.warn(`Invalid table name: ${logicalName}, falling back to 'matches'`);
      return 'matches';
    }
    
    return tableName;
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
    return this.VALID_TABLES.includes(normalizedName);
  }
}
