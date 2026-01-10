import { LucideIcon } from 'lucide-react';

/**
 * Icon System Types
 *
 * This file defines the type system for our centralized icon management.
 * Winter variants are automatically applied when the winter-frozen theme is active.
 */

// Lucide icon names we commonly use across the app
export type IconName =
  // Navigation
  | 'award'
  | 'calendar'
  | 'users'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'chevron-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'home'
  | 'menu'
  | 'x'
  // Actions
  | 'save'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'minus'
  | 'check'
  | 'copy'
  | 'download'
  | 'upload'
  | 'refresh-cw'
  | 'settings'
  | 'log-out'
  | 'log-in'
  | 'external-link'
  // Status
  | 'alert-circle'
  | 'check-circle'
  | 'info'
  | 'alert-triangle'
  | 'loader-2'
  // Content
  | 'trophy'
  | 'medal'
  | 'star'
  | 'flag'
  | 'target'
  | 'crown'
  | 'flame'
  | 'zap'
  // Data
  | 'search'
  | 'filter'
  | 'sort-asc'
  | 'sort-desc'
  | 'list'
  | 'grid'
  | 'table'
  // Social
  | 'message-circle'
  | 'heart'
  | 'share'
  | 'bookmark'
  // Misc
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'unlock'
  | 'sun'
  | 'moon'
  | 'snowflake';

// Winter-specific accent glyph names
export type WinterGlyphName =
  | 'snowflake'
  | 'snowflake-sparkle'
  | 'icicle'
  | 'frost-crystal'
  | 'winter-star'
  | 'snow-drift'
  | 'frozen-trophy'
  | 'sparkle-frost'
  | 'ice-shard'
  | 'snow-cloud';

// SVG component type for custom icons
export type SvgIconComponent = React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string }>;

// Icon registry entry structure
export interface IconRegistryEntry {
  icon: LucideIcon;
  category: 'navigation' | 'action' | 'status' | 'content' | 'data' | 'social' | 'misc';
  winterVariant?: WinterGlyphName;
}

// Props for the Icon component
export interface IconProps {
  /** Either a registered icon name or a direct Lucide icon component */
  name?: IconName;
  /** Direct Lucide icon component (alternative to name) */
  icon?: LucideIcon;
  /** Size in pixels */
  size?: number | string;
  /** CSS class name */
  className?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether to use winter variant when available */
  useWinterVariant?: boolean;
  /** Color override */
  color?: string;
}

// Props for the SeasonalIcon component
export interface SeasonalIconProps {
  /** Default icon (used in non-winter themes) */
  defaultIcon: LucideIcon | SvgIconComponent;
  /** Winter icon (used when winter theme is active) */
  winterIcon?: LucideIcon | SvgIconComponent;
  /** Size in pixels */
  size?: number | string;
  /** CSS class name */
  className?: string;
  /** Stroke width (for Lucide icons) */
  strokeWidth?: number;
  /** Color override */
  color?: string;
}
