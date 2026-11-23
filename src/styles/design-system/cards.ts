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
