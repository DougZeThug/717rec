/**
 * Shared type definitions for timezone utilities
 */

/**
 * Options for displaying a time
 */
export interface TimeDisplayOptions {
  use24Hour?: boolean;
  includeSeconds?: boolean;
}

/**
 * Date range for querying
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}
