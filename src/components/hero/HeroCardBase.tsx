import { motion } from 'framer-motion';
import React from 'react';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface HeroCardBaseProps {
  children: React.ReactNode;
  /** Extra classes always applied (use for shadow/rounded overrides). */
  className?: string;
  /** Extra classes applied only when the winter theme is active. */
  winterClassName?: string;
  /** Classes applied when the winter theme is NOT active (card-specific colors). */
  defaultClassName?: string;
  /** Use hover-scale animation instead of the default fade-in. */
  withHover?: boolean;
  /** Render as a <section> instead of <div>. */
  as?: 'div' | 'section';
  /** Wrap children in a p-4 md:p-6 padding div. */
  padded?: boolean;
}

/**
 * Shared outer shell for hero cards.
 *
 * Handles:
 *  - Motion wrapper (fade-in or hover-scale)
 *  - Base sizing + shadow + border
 *  - winter-card-full class when seasonal winter is active
 *  - Optional content padding
 */
const HeroCardBase: React.FC<HeroCardBaseProps> = ({
  children,
  className,
  winterClassName,
  defaultClassName,
  withHover = false,
  as = 'div',
  padded = false,
}) => {
  const { shouldApplyWinter } = useSeasonalTheme();

  const shellClasses = cn(
    'relative w-full rounded-xl shadow-md border border-border/30',
    shouldApplyWinter
      ? cn('winter-card-full overflow-visible', winterClassName)
      : cn('overflow-hidden', defaultClassName),
    className
  );

  const motionProps = withHover
    ? {
        whileHover: { scale: 1.01, y: -2 as number },
        whileTap: { scale: 0.99 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
      };

  const MotionTag = as === 'section' ? motion.section : motion.div;

  return (
    <MotionTag {...motionProps} className={shellClasses}>
      {padded ? <div className="p-4 md:p-6">{children}</div> : children}
    </MotionTag>
  );
};

export default HeroCardBase;
