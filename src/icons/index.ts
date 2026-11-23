/**
 * Icon System - Main Export Barrel
 *
 * This is the central export point for the icon system.
 * Import everything you need from here:
 *
 * @example
 * ''`tsx
 * import {
 *   getIcon,
 *   getWinterGlyph,
 *   SnowflakeSparkle
 * } from "@/icons";
 * ''`
 */

// Types
export type { SvgIconComponent, WinterGlyphName } from './types';

// Winter Glyph Registry
export {
  getWinterGlyph,
  // Individual winter glyphs for direct import
  SnowflakeSparkle,
} from './winterGlyphRegistry';
