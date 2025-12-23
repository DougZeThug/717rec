import React from "react";
import { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  ICON_SIZES, 
  ICON_STROKE, 
  OPTICAL_ALIGN_MAP,
  IconSize, 
  IconWeight 
} from "@/styles/icon-system";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import { 
  getIcon, 
  getIconWinterVariant, 
  getWinterGlyph,
  WINTER_ICONS_ENABLED,
} from "@/icons";
import type { IconName } from "@/icons";

export interface IconProps extends Omit<LucideProps, 'size' | 'strokeWidth'> {
  /** The Lucide icon component to render (direct usage) */
  icon?: LucideIcon;
  /** Icon name from registry (alternative to icon prop) */
  name?: IconName;
  /** Predefined size from the icon system */
  size?: IconSize;
  /** Stroke weight from the icon system */
  weight?: IconWeight;
  /** Apply optical alignment adjustment for this icon */
  opticalAlign?: boolean;
  /** Whether to auto-swap to winter variant when available */
  useWinterVariant?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Standardized Icon component that enforces consistent sizing and stroke widths.
 * Now supports registry lookups and automatic winter variant swapping.
 * 
 * @example
 * ```tsx
 * import { Icon } from "@/components/ui/icon";
 * import { Trophy, Users } from "lucide-react";
 * 
 * // Direct icon usage (existing pattern)
 * <Icon icon={Trophy} size="md" weight="normal" />
 * 
 * // Registry lookup by name
 * <Icon name="trophy" size="md" />
 * 
 * // Auto-swap to winter variant when theme is active
 * <Icon icon={Trophy} size="xl" useWinterVariant />
 * 
 * // Registry lookup with winter variant (auto-detected)
 * <Icon name="trophy" size="lg" useWinterVariant />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  icon,
  name,
  size = 'md',
  weight = 'normal',
  opticalAlign = false,
  useWinterVariant = false,
  className,
  ...props
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  
  const pixelSize = ICON_SIZES[size];
  const strokeWidth = ICON_STROKE[weight];
  
  // Resolve the icon - either from direct prop or registry lookup
  let ResolvedIcon: LucideIcon | React.FC<any> | undefined = icon;
  
  if (!ResolvedIcon && name) {
    ResolvedIcon = getIcon(name);
  }
  
  // Check for winter variant swap
  if (useWinterVariant && isWinterTheme && WINTER_ICONS_ENABLED) {
    // If using registry name, check for winter variant
    if (name) {
      const winterVariantName = getIconWinterVariant(name);
      if (winterVariantName) {
        const WinterGlyph = getWinterGlyph(winterVariantName);
        if (WinterGlyph) {
          ResolvedIcon = WinterGlyph;
        }
      }
    }
  }
  
  if (!ResolvedIcon) {
    console.warn(`Icon: No icon found for name="${name}" or icon prop`);
    return null;
  }
  
  // Get optical alignment class if needed
  const iconName = (ResolvedIcon as LucideIcon).displayName || '';
  const alignmentClass = opticalAlign && iconName in OPTICAL_ALIGN_MAP 
    ? OPTICAL_ALIGN_MAP[iconName] 
    : '';

  return (
    <ResolvedIcon
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={cn(
        alignmentClass, 
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  );
};

export default Icon;
