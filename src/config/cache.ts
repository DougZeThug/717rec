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

// ==================== Garbage Collection Times ====================
// GC time determines how long unused cached data is kept in memory

export const QUERY_GC_TIMES = {
  /** Don't cache - immediate cleanup */
  NO_CACHE: 0,

  /** Short garbage collection - 5 minutes */
  SHORT: 5 * 60 * 1000,

  /** Standard garbage collection - 10 minutes */
  STANDARD: 10 * 60 * 1000,

  /** Long garbage collection - 30 minutes */
  LONG: 30 * 60 * 1000,
} as const;

// ==================== Refetch Intervals ====================
// How often to automatically refetch data in the background

export const REFETCH_INTERVALS = {
  /** No automatic refetching */
  DISABLED: false,

  /** Very frequent - 10 seconds */
  VERY_FREQUENT: 10 * 1000,

  /** Frequent - 30 seconds */
  FREQUENT: 30 * 1000,

  /** Standard - 1 minute */
  STANDARD: 60 * 1000,

  /** Infrequent - 5 minutes */
  INFREQUENT: 5 * 60 * 1000,
} as const;

// ==================== Feature-Specific Cache Config ====================
// Recommended cache settings for different types of data

export const CACHE_STRATEGIES = {
  /** For real-time data that changes frequently (live scores, pending matches) */
  REALTIME: {
    staleTime: QUERY_STALE_TIMES.MEDIUM,
    gcTime: QUERY_GC_TIMES.SHORT,
  },

  /** For frequently updated data (standings, rankings) */
  FREQUENT_UPDATES: {
    staleTime: QUERY_STALE_TIMES.STANDARD,
    gcTime: QUERY_GC_TIMES.STANDARD,
  },

  /** For stable data that rarely changes (teams, divisions) */
  STABLE_DATA: {
    staleTime: QUERY_STALE_TIMES.STANDARD,
    gcTime: QUERY_GC_TIMES.STANDARD,
  },

  /** For historical/static data (career stats, historical brackets) */
  HISTORICAL: {
    staleTime: QUERY_STALE_TIMES.LONG,
    gcTime: QUERY_GC_TIMES.LONG,
  },

  /** For data that must always be fresh (head-to-head during active games) */
  ALWAYS_FRESH: {
    staleTime: QUERY_STALE_TIMES.ALWAYS_FRESH,
    gcTime: QUERY_GC_TIMES.NO_CACHE,
  },

  /** For bracket data that needs faster updates during playoffs */
  BRACKET_UPDATES: {
    staleTime: QUERY_STALE_TIMES.VERY_SHORT,
    gcTime: QUERY_GC_TIMES.SHORT,
  },
} as const;

// ==================== Default Query Client Config ====================
// Default configuration for the QueryClient instance

export const DEFAULT_QUERY_CONFIG = {
  staleTime: QUERY_STALE_TIMES.STANDARD, // 5 minutes
  gcTime: QUERY_GC_TIMES.STANDARD, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  retry: 1,
} as const;
