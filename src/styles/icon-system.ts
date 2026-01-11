/**
 * Iconography System
 *
 * Consistent icon sizing and stroke widths across the app.
 * All icons should use these constants for visual consistency.
 */

export const ICON_SIZES = {
  xs: 12, // Tiny indicators (badges, status dots)
  sm: 14, // Inline with text, compact lists
  md: 16, // Buttons, form labels, actions
  lg: 18, // Desktop navigation
  xl: 24, // Mobile navigation, hero icons
  '2xl': 32, // Large decorative icons
} as const;

export const ICON_STROKE = {
  light: 1.5, // Inactive state, decorative
  normal: 2, // Default for most icons
  bold: 2.5, // Active state, emphasis
} as const;

export type IconSize = keyof typeof ICON_SIZES;
export type IconWeight = keyof typeof ICON_STROKE;

/**
 * Icons that need optical alignment adjustments.
 * Some icons appear off-center even when mathematically centered.
 */
export const OPTICAL_ALIGN_MAP: Record<string, string> = {
  ChevronDown: '-mt-px',
  ChevronUp: 'mt-px',
  ChevronRight: '-ml-px',
  ChevronLeft: 'ml-px',
  Check: '-mt-px',
  Play: 'ml-0.5',
  Trophy: '-mt-0.5',
  ArrowRight: '-mt-px',
  ArrowLeft: '-mt-px',
};

/**
 * Usage patterns for different contexts
 */
export const ICON_PATTERNS = {
  navigation: { size: 'xl' as IconSize, weight: 'normal' as IconWeight },
  desktopNav: { size: 'lg' as IconSize, weight: 'normal' as IconWeight },
  button: { size: 'md' as IconSize, weight: 'normal' as IconWeight },
  inline: { size: 'sm' as IconSize, weight: 'normal' as IconWeight },
  decorative: { size: '2xl' as IconSize, weight: 'light' as IconWeight },
  indicator: { size: 'xs' as IconSize, weight: 'normal' as IconWeight },
} as const;
