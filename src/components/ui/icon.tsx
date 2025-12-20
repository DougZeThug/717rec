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

export interface IconProps extends Omit<LucideProps, 'size' | 'strokeWidth'> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Predefined size from the icon system */
  size?: IconSize;
  /** Stroke weight from the icon system */
  weight?: IconWeight;
  /** Apply optical alignment adjustment for this icon */
  opticalAlign?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Standardized Icon component that enforces consistent sizing and stroke widths.
 * 
 * @example
 * ```tsx
 * import { Icon } from "@/components/ui/icon";
 * import { Trophy, Users } from "lucide-react";
 * 
 * // Button icon
 * <Icon icon={Trophy} size="md" weight="normal" />
 * 
 * // Navigation icon (active state)
 * <Icon icon={Users} size="xl" weight="bold" />
 * 
 * // Decorative icon
 * <Icon icon={Trophy} size="2xl" weight="light" opticalAlign />
 * ```
 */
export const Icon: React.FC<IconProps> = ({
  icon: LucideIcon,
  size = 'md',
  weight = 'normal',
  opticalAlign = false,
  className,
  ...props
}) => {
  const pixelSize = ICON_SIZES[size];
  const strokeWidth = ICON_STROKE[weight];
  
  // Get optical alignment class if needed
  const iconName = LucideIcon.displayName || '';
  const alignmentClass = opticalAlign && iconName in OPTICAL_ALIGN_MAP 
    ? OPTICAL_ALIGN_MAP[iconName] 
    : '';

  return (
    <LucideIcon
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={cn(alignmentClass, className)}
      {...props}
    />
  );
};

export default Icon;
