import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import { 
  getWinterGlyph, 
  WINTER_ICONS_ENABLED,
  SvgIconComponent,
} from "@/icons";
import type { WinterGlyphName } from "@/icons";

export interface SeasonalIconProps {
  /** Default icon (used in non-winter themes) */
  defaultIcon: LucideIcon | SvgIconComponent;
  /** Winter glyph name to use when winter theme is active */
  winterGlyph?: WinterGlyphName;
  /** Or provide a direct winter icon component */
  winterIcon?: LucideIcon | SvgIconComponent;
  /** Size in pixels */
  size?: number;
  /** CSS class name */
  className?: string;
  /** Stroke width (for Lucide icons) */
  strokeWidth?: number;
  /** Color override */
  color?: string;
}

/**
 * SeasonalIcon - Auto-switches between default and winter icons based on theme
 * 
 * This component follows the same pattern as other winter-themed components,
 * using useSeasonalTheme() to detect when winter-frozen theme is active.
 * 
 * @example
 * ```tsx
 * // Using a winter glyph name
 * <SeasonalIcon 
 *   defaultIcon={Trophy} 
 *   winterGlyph="frozen-trophy" 
 *   size={24} 
 * />
 * 
 * // Using a direct winter icon component
 * <SeasonalIcon 
 *   defaultIcon={Star} 
 *   winterIcon={WinterStar} 
 *   size={24} 
 * />
 * ```
 */
export const SeasonalIcon: React.FC<SeasonalIconProps> = ({
  defaultIcon: DefaultIcon,
  winterGlyph,
  winterIcon,
  size = 24,
  className,
  strokeWidth = 2,
  color,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  
  // Determine which icon to render
  const shouldUseWinter = isWinterTheme && WINTER_ICONS_ENABLED && (winterGlyph || winterIcon);
  
  if (shouldUseWinter) {
    // Get winter icon - either from glyph registry or direct component
    const WinterIcon = winterGlyph ? getWinterGlyph(winterGlyph) : winterIcon;
    
    if (WinterIcon) {
      return (
        <WinterIcon
          size={size}
          className={cn("transition-all duration-300", className)}
          strokeWidth={strokeWidth}
          color={color}
        />
      );
    }
  }
  
  // Render default icon
  return (
    <DefaultIcon
      size={size}
      className={cn("transition-all duration-300", className)}
      strokeWidth={strokeWidth}
      color={color}
    />
  );
};

export default SeasonalIcon;
