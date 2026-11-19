/**
 * Cache and Query Configuration
 *
 * Centralized configuration for TanStack Query cache times, stale times, and refetch intervals.
 * All times are in milliseconds unless otherwise noted.
 */

// ==================== Query Stale Times ====================
// Stale time determines how long cached data is considered "fresh"

export const QUERY_STALE_TIMES = {
  /** Standard cache - 5 minutes (default for most queries) */
  STANDARD: 5 * 60 * 1000,
} as const;
