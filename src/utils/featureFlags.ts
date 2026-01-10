/**
 * Feature Flag System
 *
 * A lightweight, environment variable-based feature flag system.
 *
 * Usage:
 * - In components: const enabled = useFeatureFlag('SHOW_POWER_SCORES');
 * - In services: if (isFeatureEnabled('ENABLE_BLIND_DRAW')) { ... }
 * - Override via .env: VITE_FF_SHOW_POWER_SCORES=false
 */

// Feature flag definitions with defaults
const FLAGS = {
  SHOW_POWER_SCORES: true, // Power score display on team cards
  ENABLE_WINTER_THEME: false, // Seasonal winter theme
  SHOW_HISTORICAL_BRACKETS: true, // Historical bracket archive
  ENABLE_BLIND_DRAW: true, // Blind draw signup feature
  SHOW_BADGE_SYSTEM: true, // Team badge display
  ENABLE_SNOWFALL: false, // Winter snowfall animation
} as const;

export type FeatureFlag = keyof typeof FLAGS;

/**
 * Check if a feature flag is enabled.
 * Environment variable overrides (VITE_FF_FLAG_NAME) take precedence over defaults.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `VITE_FF_${flag}`;
  const envValue = import.meta.env[envKey];

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1';
  }

  return FLAGS[flag];
}

/**
 * React hook for checking feature flags in components.
 * Returns the current enabled state of the flag.
 */
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}

/**
 * Get all feature flags and their current values.
 * Useful for debugging or admin panels.
 */
export function getAllFeatureFlags(): Record<FeatureFlag, boolean> {
  return (Object.keys(FLAGS) as FeatureFlag[]).reduce(
    (acc, key) => {
      acc[key] = isFeatureEnabled(key);
      return acc;
    },
    {} as Record<FeatureFlag, boolean>
  );
}
