import { HTMLMotionProps, motion } from 'framer-motion';
import React from 'react';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';
import { cardAnimations } from '@/styles/design-system/cards';

export interface EntityCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  division?: string;
  isInteractive?: boolean;
  withGradient?: boolean;
  className?: string;
}

/**
 * EntityCard - A wrapper for displaying entities (teams, rankings) with consistent styling
 *
 * Features:
 * - Motion animations for hover/tap
 * - Winter theme support
 * - Division-specific gradients (optional)
 * - Consistent border radius and shadows
 */
export const EntityCard: React.FC<EntityCardProps> = ({
  children,
  division,
  isInteractive = true,
  withGradient = true,
  className,
  ...motionProps
}) => {
  const { isWinterTheme } = useSeasonalTheme();

  return (
    <motion.div
      className={cn(
        'rounded-lg border shadow-sm h-full',
        isWinterTheme
          ? 'winter-card-surface frost-edge border-frost-border/30 text-card-foreground'
          : 'border-border bg-card text-card-foreground',
        withGradient && !isWinterTheme && gradients.card.blueOrange,
        className
      )}
      whileHover={isInteractive ? cardAnimations.hover : undefined}
      whileTap={isInteractive ? cardAnimations.tap : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
};

export default EntityCard;
