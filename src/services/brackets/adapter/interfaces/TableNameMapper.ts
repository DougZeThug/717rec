
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
  
  /**
   * Convert a logical table name to the actual database table name
   * @param logicalName The logical table name used in brackets-manager
   * @returns The actual database table name
   */
  public static toDbTableName(logicalName: string): string {
    const normalizedName = logicalName.toLowerCase();
    const tableName = this.TABLE_MAP[normalizedName] || normalizedName;
    
    // Validate the table name for security
    if (!['matches', 'participants', 'brackets'].includes(tableName)) {
      console.warn(`Unknown table name: ${logicalName}, falling back to 'matches'`);
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
    const normalizedName = dbName.toLowerCase();
    const entries = Object.entries(this.TABLE_MAP);
    for (const [logical, db] of entries) {
      if (db === normalizedName) return logical;
    }
    return normalizedName;
  }
  
  /**
   * Check if a table name is valid
   * @param tableName Table name to validate
   * @returns true if valid, false otherwise
   */
  public static isValidTable(tableName: string): boolean {
    const normalizedName = tableName.toLowerCase();
    return ['match', 'participant', 'stage', 'matches', 'participants', 'brackets'].includes(normalizedName);
  }
}
