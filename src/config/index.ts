/**
 * Configuration Module - Barrel Export
 *
 * Centralized configuration management for the 717rec application.
 * Import from this module to access any configuration values.
 *
 * @example
 * // Import specific configurations
 * import { QUERY_STALE_TIMES, API_LIMITS } from '@/config';
 *
 * @example
 * // Import entire modules
 * import * as CacheConfig from '@/config/cache';
 * import * as ApiConfig from '@/config/api';
 */

// ==================== Re-export all configuration modules ====================

export * from './admin';
export * from './api';
export * from './cache';
export * from './features';
export * from './ui';

// ==================== Convenience re-exports ====================
// Group commonly used configs for easier imports

import { ADMIN_CONFIG, ADMIN_FEATURES, ADMIN_PERMISSIONS, ADMIN_VALIDATION } from './admin';
import {
  API_LIMITS,
  API_RETRY,
  API_TIMEOUTS,
  API_TIMINGS,
  DATA_FRESHNESS,
  POLLING_INTERVALS,
} from './api';
import {
  CACHE_STRATEGIES,
  DEFAULT_QUERY_CONFIG,
  QUERY_GC_TIMES,
  QUERY_STALE_TIMES,
  REFETCH_INTERVALS,
} from './cache';
import { FEATURE_DEPENDENCIES, FEATURE_FLAGS, FEATURE_GROUPS, FEATURE_METADATA } from './features';
import {
  ANIMATION_DURATIONS,
  BRACKET_CONFIG,
  BREAKPOINTS,
  CONTENT_LIMITS,
  DISPLAY_LIMITS,
  PREDICTION_CONFIG,
  TEAM_CONFIG,
  TOAST_CONFIG,
} from './ui';

/**
 * Commonly used cache configurations grouped for convenience
 */
export const CacheConfig = {
  staleTimes: QUERY_STALE_TIMES,
  gcTimes: QUERY_GC_TIMES,
  refetchIntervals: REFETCH_INTERVALS,
  strategies: CACHE_STRATEGIES,
  defaults: DEFAULT_QUERY_CONFIG,
} as const;

/**
 * Commonly used API configurations grouped for convenience
 */
export const ApiConfig = {
  retry: API_RETRY,
  timeouts: API_TIMEOUTS,
  limits: API_LIMITS,
  timings: API_TIMINGS,
  polling: POLLING_INTERVALS,
  freshness: DATA_FRESHNESS,
} as const;

/**
 * Commonly used feature flag configurations grouped for convenience
 */
export const FeatureConfig = {
  flags: FEATURE_FLAGS,
  groups: FEATURE_GROUPS,
  dependencies: FEATURE_DEPENDENCIES,
  metadata: FEATURE_METADATA,
} as const;

/**
 * Commonly used UI configurations grouped for convenience
 */
export const UiConfig = {
  breakpoints: BREAKPOINTS,
  bracket: BRACKET_CONFIG,
  toast: TOAST_CONFIG,
  display: DISPLAY_LIMITS,
  content: CONTENT_LIMITS,
  animation: ANIMATION_DURATIONS,
  prediction: PREDICTION_CONFIG,
  team: TEAM_CONFIG,
} as const;

/**
 * Commonly used admin configurations grouped for convenience
 */
export const AdminConfig = {
  config: ADMIN_CONFIG,
  permissions: ADMIN_PERMISSIONS,
  validation: ADMIN_VALIDATION,
  features: ADMIN_FEATURES,
} as const;

// ==================== Configuration Overview ====================

/**
 * Configuration module structure overview
 *
 * - admin.ts: Admin dashboard, permissions, and validation rules
 * - api.ts: API endpoints, timeouts, retry logic, and request limits
 * - cache.ts: TanStack Query cache times, stale times, and refetch intervals
 * - features.ts: Feature flags with environment variable override support
 * - ui.ts: UI constants including breakpoints, dimensions, and display limits
 *
 * Import patterns:
 * - Named imports: import { QUERY_STALE_TIMES } from '@/config'
 * - Grouped imports: import { CacheConfig } from '@/config'
 * - Module imports: import * as Config from '@/config'
 */
