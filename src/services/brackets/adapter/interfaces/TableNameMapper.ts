
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

// Centralized repository of table names to avoid duplication
const VALID_TABLES = new Set<string>([
  'brackets', 'matches', 'participants', 'teams',
  'debug_match_updates', 'divisions', 'games',
  'match_comments', 'match_reactions', 'message_reactions',
  'messages', 'playoff_games', 'playoff_matches',
  'profiles', 'season_stats', 'team_memberships',
  'team_stats', 'team_timeslots'
]);

const VALID_VIEWS = new Set<string>([
  'v_team_details', 'v_team_game_totals', 
  'v_team_match_stats', 'v_team_power_scores', 
  'v_team_sos', 'v_team_strength_of_schedule'
]);

/**
 * Type guard to check if a name is a valid table
 */
export function isValidTable(name: string): name is DatabaseTables {
  return VALID_TABLES.has(name);
}

/**
 * Type guard to check if a name is a valid view
 */
export function isValidView(name: string): name is DatabaseViews {
  return VALID_VIEWS.has(name);
}

/**
 * Maps between logical table names used in brackets-manager and actual database table names
 */
export class TableNameMapper {
  // Define Supabase's valid table names to match the database schema
  private static readonly LOGICAL_TO_DB_MAP: Record<string, string> = {
    'match': 'matches',
    'participant': 'participants',
    'stage': 'brackets',
  };
  
  // Reverse mapping for lookups from database to logical name
  private static readonly DB_TO_LOGICAL_MAP: Record<string, string> = {
    'matches': 'match',
    'participants': 'participant',
    'brackets': 'stage',
  };
  
  /**
   * Check if a table name is valid in our system
   * @param tableName Table name to validate
   * @returns true if valid, false otherwise
   */
  public static isValidTable(tableName: string): boolean {
    if (!tableName) return false;
    
    const normalizedName = tableName.toLowerCase();
    return VALID_TABLES.has(normalizedName) || 
           VALID_VIEWS.has(normalizedName) || 
           normalizedName in this.LOGICAL_TO_DB_MAP;
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
    if (normalizedName in this.LOGICAL_TO_DB_MAP) {
      const mappedName = this.LOGICAL_TO_DB_MAP[normalizedName];
      
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
    return this.DB_TO_LOGICAL_MAP[normalizedName] || normalizedName;
  }
  
  /**
   * Get all valid table names
   * @returns Array of valid table names
   */
  public static getValidTableNames(): string[] {
    return Array.from(VALID_TABLES);
  }
  
  /**
   * Get all valid view names
   * @returns Array of valid view names
   */
  public static getValidViewNames(): string[] {
    return Array.from(VALID_VIEWS);
  }
  
  /**
   * Check if a logical name has a mapping to a database table
   * @param logicalName The logical name to check
   * @returns True if a mapping exists
   */
  public static hasMapping(logicalName: string): boolean {
    if (!logicalName) return false;
    return logicalName.toLowerCase() in this.LOGICAL_TO_DB_MAP;
  }
}
