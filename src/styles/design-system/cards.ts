import { cn } from '@/lib/utils';

import { getDivisionGradientClass } from './divisions';

/**
 * Card gradient presets for light mode
 */
export const cardGradients = {
  default: 'bg-gradient-to-br from-white to-gray-50',
  amber: 'bg-gradient-to-br from-amber-50 to-amber-100',
  green: 'bg-gradient-to-br from-green-50 to-green-100',
  blue: 'bg-gradient-to-br from-blue-50 to-blue-100',
  purple: 'bg-gradient-to-br from-purple-50 to-purple-100',
};

/**
 * Animation presets for cards using framer-motion
 */
export const cardAnimations = {
  hover: {
    scale: 1.02,
    y: -2,
  },
  tap: {
    scale: 0.98,
  },
  stagger: {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: 'easeOut' as const,
      },
    }),
  },
};

/**
 * Card style utility function that combines various design system elements
 */
export function getCardStyle({
  gradient = 'default',
  elevationType = 'default',
  isInteractive = true,
  division = null,
  className = '',
}: {
  gradient?: 'default' | 'subtle' | 'highlight';
  elevationType?: 'default' | 'active' | 'highlighted';
  isInteractive?: boolean;
  division?: string | null;
  className?: string;
} = {}) {
  // Get division-specific gradient if division is provided
  const cardGradient = division ? getDivisionGradientClass(division) : getCardGradient(gradient);

  return cn(
    'rounded-lg border',
    'border-gray-200 dark:border-gray-700/80',
    cardGradient,
    getCardElevation(elevationType),
    isInteractive
      ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200'
      : '',
    className
  );
}

/** Tailwind background-gradient classes for a card variant. */
function getCardGradient(variant: 'default' | 'subtle' | 'highlight'): string {
  switch (variant) {
    case 'subtle':
      return 'bg-gradient-to-br from-white to-gray-100 dark:from-gray-800/80 dark:to-gray-900/80';
    case 'highlight':
      return 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900/90';
    default:
      return 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900';
  }
}

/** Tailwind shadow classes for a card elevation level. */
function getCardElevation(type: 'default' | 'active' | 'highlighted'): string {
  switch (type) {
    case 'active':
      return 'shadow-md hover:shadow-lg dark:shadow-gray-900/30 transition-all duration-300';
    case 'highlighted':
      return 'shadow-lg hover:shadow-xl dark:shadow-gray-900/40 transition-all duration-300';
    default:
      return 'shadow-sm hover:shadow-md dark:shadow-gray-900/20 transition-all duration-300';
  }
}
