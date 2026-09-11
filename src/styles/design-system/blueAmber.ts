import { cn } from '@/lib/utils';

/**
 * Blue-to-Amber gradient style system for consistent styling across the app
 */
export const blueAmber = {
  // Text gradients for headings and important text
  // heading-winter class allows winter CSS to override
  text: {
    heading:
      'bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-300 heading-winter',
  },

  // Background gradients for cards and sections
  background: {
    card: 'bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-gray-900',
  },
};

// Helper utility to apply blue-amber heading style to any element
// Winter theme overrides this via CSS (.winter-frozen .heading-winter)
export function blueAmberHeading(className?: string) {
  return cn(
    'font-bebas uppercase tracking-wide bg-gradient-to-br from-blue-600 to-amber-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-300 heading-winter',
    className
  );
}
