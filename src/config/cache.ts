/**
 * Cache and Query Configuration
 *
 * Centralized configuration for TanStack Query cache times, stale times, and refetch intervals.
 * All times are in milliseconds unless otherwise noted.
 */

// ==================== Query Stale Times ====================
// Stale time determines how long cached data is considered "fresh"

export const QUERY_STALE_TIMES = {
  /** Always fetch fresh data (0ms) */
  ALWAYS_FRESH: 0,

  /** Very short cache - 30 seconds */
  VERY_SHORT: 30 * 1000,

  /** Short cache - 1 minute */
  SHORT: 60 * 1000,

  /** Medium cache - 2 minutes */
  MEDIUM: 2 * 60 * 1000,

  /** Medium-long cache - 3 minutes */
  MEDIUM_LONG: 3 * 60 * 1000,

  /** Standard cache - 5 minutes (default for most queries) */
  STANDARD: 5 * 60 * 1000,

  /** Long cache - 10 minutes (for stable/historical data) */
  LONG: 10 * 60 * 1000,
} as const;
