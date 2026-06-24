import { LucideIcon, LucideProps } from 'lucide-react';
import React from 'react';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import type { IconName } from '@/icons';
import { getIcon, getIconWinterVariant, getWinterGlyph, WINTER_ICONS_ENABLED } from '@/icons';
import { cn } from '@/lib/utils';
import {
  ICON_SIZES,
  ICON_STROKE,
  IconSize,
  IconWeight,
  OPTICAL_ALIGN_MAP,
} from '@/styles/icon-system';
import { warnLog } from '@/utils/logger';

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

  // Resolve the icon - either from direct prop or registry lookup.
  // Stored as a lowercase variable so the React Compiler doesn't treat the
  // reassignment as creating a new component during render.
  let resolvedIcon: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>> | undefined = icon;

  if (!resolvedIcon && name) {
    resolvedIcon = getIcon(name);
  }

  // Check for winter variant swap
  if (useWinterVariant && isWinterTheme && WINTER_ICONS_ENABLED && name) {
    const winterVariantName = getIconWinterVariant(name);
    if (winterVariantName) {
      const winterGlyph = getWinterGlyph(winterVariantName);
      if (winterGlyph) {
        resolvedIcon = winterGlyph;
      }
    }
  }

  if (!resolvedIcon) {
    warnLog(`Icon: No icon found for name="${name}" or icon prop`);
    return null;
  }

  // Get optical alignment class if needed
  const iconName = (resolvedIcon as LucideIcon).displayName || '';
  const alignmentClass =
    opticalAlign && iconName in OPTICAL_ALIGN_MAP ? OPTICAL_ALIGN_MAP[iconName] : '';

  return React.createElement(resolvedIcon as React.ComponentType<LucideProps>, {
    size: pixelSize,
    strokeWidth,
    className: cn(alignmentClass, 'transition-all duration-200', className),
    ...props,
  });
};

export default Icon;
