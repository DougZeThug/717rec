/**
 * Feature Flags Configuration
 *
 * Centralized feature flag definitions with default values.
 * These can be overridden via environment variables (VITE_FF_FLAG_NAME).
 *
 * @see src/utils/featureFlags.ts for helper functions
 */

// ==================== Feature Flag Definitions ====================

/**
 * Feature flag default values
 * Can be overridden via environment variables: VITE_FF_<FLAG_NAME>=true|false
 */
export const FEATURE_FLAGS = {
  /** Display power scores on team cards and standings */
  SHOW_POWER_SCORES: true,

  /** Enable seasonal winter theme with snow effects */
  ENABLE_WINTER_THEME: false,

  /** Show historical playoff bracket archive */
  SHOW_HISTORICAL_BRACKETS: true,

  /** Enable blind draw signup feature for teams */
  ENABLE_BLIND_DRAW: true,

  /** Display achievement badges for team streaks and milestones */
  SHOW_BADGE_SYSTEM: true,

  /** Enable decorative snowfall animation (winter theme) */
  ENABLE_SNOWFALL: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

// ==================== Feature Groups ====================
// Logical groupings for easier management

export const FEATURE_GROUPS = {
  /** UI/Display features */
  DISPLAY: [
    'SHOW_POWER_SCORES',
    'SHOW_HISTORICAL_BRACKETS',
    'SHOW_BADGE_SYSTEM',
  ] as const,

  /** Seasonal/Theme features */
  SEASONAL: [
    'ENABLE_WINTER_THEME',
    'ENABLE_SNOWFALL',
  ] as const,

  /** Functionality features */
  FUNCTIONALITY: [
    'ENABLE_BLIND_DRAW',
  ] as const,
} as const;

// ==================== Feature Dependencies ====================
// Define which features depend on others

export const FEATURE_DEPENDENCIES: Partial<Record<FeatureFlag, FeatureFlag[]>> = {
  /** Snowfall requires winter theme to be enabled */
  ENABLE_SNOWFALL: ['ENABLE_WINTER_THEME'],
} as const;

// ==================== Feature Metadata ====================
// Additional information about features for admin panels or debugging

export const FEATURE_METADATA: Record<FeatureFlag, { description: string; impact: 'low' | 'medium' | 'high' }> = {
  SHOW_POWER_SCORES: {
    description: 'Display Elo-based power scores throughout the application',
    impact: 'medium',
  },
  ENABLE_WINTER_THEME: {
    description: 'Apply winter-themed styling and decorations',
    impact: 'low',
  },
  SHOW_HISTORICAL_BRACKETS: {
    description: 'Allow viewing of past season playoff brackets',
    impact: 'low',
  },
  ENABLE_BLIND_DRAW: {
    description: 'Enable teams to participate in blind draw matchmaking',
    impact: 'medium',
  },
  SHOW_BADGE_SYSTEM: {
    description: 'Display achievement badges for streaks and milestones',
    impact: 'low',
  },
  ENABLE_SNOWFALL: {
    description: 'Add animated snowfall effect (requires winter theme)',
    impact: 'low',
  },
} as const;
