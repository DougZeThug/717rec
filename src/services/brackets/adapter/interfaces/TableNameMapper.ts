
import { Database } from "@/integrations/supabase/types";

/**
 * Types for valid tables and views in the database
 */
export type DatabaseTables = keyof Database['public']['Tables'];
export type DatabaseViews = keyof Database['public']['Views'];

/**
 * Union type representing all valid database table or view names
 */
export type ValidTableName = DatabaseTables | DatabaseViews;

/**
 * Centralized repository of table and view names to avoid duplication
 */
export class DbTableRegistry {
  // Table names from the database schema
  static readonly TABLES: ReadonlySet<string> = new Set<string>([
    'brackets', 'matches', 'participants', 'teams',
    'debug_match_updates', 'divisions', 'games',
    'match_comments', 'match_reactions', 'message_reactions',
    'messages', 'playoff_games', 'playoff_matches',
    'profiles', 'season_stats', 'team_memberships',
    'team_stats', 'team_timeslots'
  ]);

  // View names from the database schema
  static readonly VIEWS: ReadonlySet<string> = new Set<string>([
    'v_team_details', 'v_team_game_totals', 
    'v_team_match_stats', 'v_team_power_scores', 
    'v_team_sos', 'v_team_strength_of_schedule'
  ]);
  
  // Logical to database table name mappings for brackets-manager compatibility
  static readonly LOGICAL_TO_DB_MAP: ReadonlyMap<string, string> = new Map<string, string>([
    ['match', 'matches'],
    ['participant', 'participants'],
    ['stage', 'brackets']
  ]);
  
  // Database to logical name mappings (reverse of the above)
  static readonly DB_TO_LOGICAL_MAP: ReadonlyMap<string, string> = new Map<string, string>([
    ['matches', 'match'],
    ['participants', 'participant'],
    ['brackets', 'stage']
  ]);
  
  /**
   * Check if a name is in the tables registry
   */
  static isTable(name: string): boolean {
    return this.TABLES.has(name.toLowerCase());
  }
  
  /**
   * Check if a name is in the views registry
   */
  static isView(name: string): boolean {
    return this.VIEWS.has(name.toLowerCase());
  }
  
  /**
   * Get the DB table name from a logical name
   */
  static getDbName(logicalName: string): string | undefined {
    return this.LOGICAL_TO_DB_MAP.get(logicalName.toLowerCase());
  }
  
  /**
   * Get the logical name from a DB table name
   */
  static getLogicalName(dbName: string): string | undefined {
    return this.DB_TO_LOGICAL_MAP.get(dbName.toLowerCase());
  }
  
  /**
   * Check if a logical name has a mapping to a DB name
   */
  static hasMapping(logicalName: string): boolean {
    return this.LOGICAL_TO_DB_MAP.has(logicalName.toLowerCase());
  }
  
  /**
   * Return all valid table names as an array
   */
  static getTableNames(): string[] {
    return Array.from(this.TABLES);
  }
  
  /**
   * Return all valid view names as an array
   */
  static getViewNames(): string[] {
    return Array.from(this.VIEWS);
  }
}

/**
 * Type guard to check if a name is a valid table
 */
export function isValidTable(name: string): name is DatabaseTables {
  return DbTableRegistry.isTable(name);
}

/**
 * Type guard to check if a name is a valid view
 */
export function isValidView(name: string): name is DatabaseViews {
  return DbTableRegistry.isView(name);
}

/**
 * Maps between logical table names used in brackets-manager and actual database table names
 */
export class TableNameMapper {
  /**
   * Check if a table name is valid in our system
   * @param tableName Table name to validate
   * @returns true if valid, false otherwise
   */
  public static isValidTable(tableName: string): boolean {
    if (!tableName) return false;
    
    const normalizedName = tableName.toLowerCase();
    return DbTableRegistry.isTable(normalizedName) || 
           DbTableRegistry.isView(normalizedName) || 
           DbTableRegistry.hasMapping(normalizedName);
  }
  
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
    const mappedName = DbTableRegistry.getDbName(normalizedName);
    if (mappedName) {
      // Verify the mapped name is valid
      if (isValidTable(mappedName)) {
        return mappedName;
      }
      console.warn(`[TableNameMapper] Invalid mapped table name: "${mappedName}" for "${logicalName}", falling back to "matches"`);
      return 'matches';
    }
    
    // If no mapping exists, check if the name itself is valid
    if (this.isValidTable(normalizedName) && (isValidTable(normalizedName) || isValidView(normalizedName))) {
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
    const logicalName = DbTableRegistry.getLogicalName(normalizedName);
    return logicalName || normalizedName;
  }
  
  /**
   * Get all valid table names
   * @returns Array of valid table names
   */
  public static getValidTableNames(): string[] {
    return DbTableRegistry.getTableNames();
  }
  
  /**
   * Get all valid view names
   * @returns Array of valid view names
   */
  public static getValidViewNames(): string[] {
    return DbTableRegistry.getViewNames();
  }
  
  /**
   * Check if a logical name has a mapping to a database table
   * @param logicalName The logical name to check
   * @returns True if a mapping exists
   */
  public static hasMapping(logicalName: string): boolean {
    if (!logicalName) return false;
    return DbTableRegistry.hasMapping(logicalName.toLowerCase());
  }
}
