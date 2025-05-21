
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
 * Type guard to check if a name is a valid table
 */
export function isValidTable(name: string): name is DatabaseTables {
  const validTables: string[] = [
    'brackets', 'matches', 'participants', 'teams',
    'debug_match_updates', 'divisions', 'games',
    'match_comments', 'match_reactions', 'message_reactions',
    'messages', 'playoff_games', 'playoff_matches',
    'profiles', 'season_stats', 'team_memberships',
    'team_stats', 'team_timeslots'
  ];
  return validTables.includes(name);
}

/**
 * Type guard to check if a name is a valid view
 */
export function isValidView(name: string): name is DatabaseViews {
  const validViews: string[] = [
    'v_team_details', 'v_team_game_totals', 
    'v_team_match_stats', 'v_team_power_scores', 
    'v_team_sos', 'v_team_strength_of_schedule'
  ];
  return validViews.includes(name);
}

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
      const mappedName = this.TABLE_MAP[normalizedName];
      
      // Ensure the mapped name is valid
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
