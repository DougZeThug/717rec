/**
 * Winter Glyph Registry
 * 
 * Central mapping of all winter-specific accent icons.
 * These are custom SVG components used for seasonal decoration.
 * 
 * Usage:
 *   import { getWinterGlyph, winterGlyphRegistry } from "@/icons";
 *   const SnowflakeIcon = getWinterGlyph("snowflake");
 */

import { WinterGlyphName, SvgIconComponent } from "./types";

// Import all winter glyph components
import Snowflake from "./winter/Snowflake";
import SnowflakeSparkle from "./winter/SnowflakeSparkle";
import Icicle from "./winter/Icicle";
import FrostCrystal from "./winter/FrostCrystal";
import WinterStar from "./winter/WinterStar";
import SnowDrift from "./winter/SnowDrift";
import FrozenTrophy from "./winter/FrozenTrophy";
import SparkleFrost from "./winter/SparkleFrost";
import IceShard from "./winter/IceShard";
import SnowCloud from "./winter/SnowCloud";

/**
 * Global flag to enable/disable winter icons
 * Set to false to revert all winter icons to their defaults
 */
export const WINTER_ICONS_ENABLED = true;

/**
 * Registry mapping winter glyph names to their SVG components
 */
export const winterGlyphRegistry: Record<WinterGlyphName, SvgIconComponent> = {
  "snowflake": Snowflake,
  "snowflake-sparkle": SnowflakeSparkle,
  "icicle": Icicle,
  "frost-crystal": FrostCrystal,
  "winter-star": WinterStar,
  "snow-drift": SnowDrift,
  "frozen-trophy": FrozenTrophy,
  "sparkle-frost": SparkleFrost,
  "ice-shard": IceShard,
  "snow-cloud": SnowCloud,
};

/**
 * Get a winter glyph component by name
 * Returns undefined if winter icons are disabled or name not found
 */
export const getWinterGlyph = (name: WinterGlyphName): SvgIconComponent | undefined => {
  if (!WINTER_ICONS_ENABLED) return undefined;
  return winterGlyphRegistry[name];
};

/**
 * Check if a winter glyph exists
 */
export const hasWinterGlyph = (name: string): name is WinterGlyphName => {
  return name in winterGlyphRegistry;
};

// Export individual components for direct import when needed
export {
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
};
