/**
 * Icon System - Main Export Barrel
 *
 * This is the central export point for the icon system.
 * Import everything you need from here:
 *
 * @example
 * ```tsx
 * import {
 *   getIcon,
 *   getWinterGlyph,
 *   Snowflake,
 *   WINTER_ICONS_ENABLED
 * } from "@/icons";
 * ```
 */

// Types
export type {
  IconName,
  IconProps,
  IconRegistryEntry,
  SeasonalIconProps,
  SvgIconComponent,
  WinterGlyphName,
} from './types';

// Icon Registry
export {
  getIcon,
  getIconsByCategory,
  getIconWinterVariant,
  hasWinterVariant,
  iconRegistry,
} from './iconRegistry';

// Winter Glyph Registry
export {
  FrostCrystal,
  FrozenTrophy,
  getWinterGlyph,
  hasWinterGlyph,
  IceShard,
  Icicle,
  SnowCloud,
  SnowDrift,
  // Individual winter glyphs for direct import
  Snowflake,
  SnowflakeSparkle,
  SparkleFrost,
  WINTER_ICONS_ENABLED,
  winterGlyphRegistry,
  WinterStar,
} from './winterGlyphRegistry';
