/**
 * Feature Flag System
 *
 * A lightweight, environment variable-based feature flag system.
 *
 * Usage:
 * - In components: const enabled = useFeatureFlag('SHOW_POWER_SCORES');
 * - In services: if (isFeatureEnabled('ENABLE_BLIND_DRAW')) { ... }
 * - Override via .env: VITE_FF_SHOW_POWER_SCORES=false
 *
 * Configuration is centralized in @/config/features.ts
 */

import { FEATURE_FLAGS, type FeatureFlag } from '@/config/features';

// Re-export the type for backward compatibility
export type { FeatureFlag };

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

  return FEATURE_FLAGS[flag];
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
  return (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).reduce(
    (acc, key) => {
      acc[key] = isFeatureEnabled(key);
      return acc;
    },
    {} as Record<FeatureFlag, boolean>
  );
}
