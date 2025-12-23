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
  WinterGlyphName, 
  SvgIconComponent, 
  IconRegistryEntry,
  IconProps,
  SeasonalIconProps,
} from "./types";

// Icon Registry
export { 
  iconRegistry, 
  getIcon, 
  getIconWinterVariant, 
  hasWinterVariant,
  getIconsByCategory,
} from "./iconRegistry";

// Winter Glyph Registry
export { 
  winterGlyphRegistry, 
  getWinterGlyph, 
  hasWinterGlyph,
  WINTER_ICONS_ENABLED,
  // Individual winter glyphs for direct import
  Snowflake,
  SnowflakeSparkle,
  Icicle,
  FrostCrystal,
  WinterStar,
  SnowDrift,
  FrozenTrophy,
  SparkleFrost,
  IceShard,
  SnowCloud,
} from "./winterGlyphRegistry";
