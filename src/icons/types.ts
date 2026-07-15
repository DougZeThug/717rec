/**
 * Icon System Types
 *
 * This file defines the type system for our centralized icon management.
 * Winter variants are automatically applied when the winter-frozen theme is active.
 */

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
