/**
 * List layout utilities for consistent grid and stack layouts
 */

export const listStyles = {
  // Grid layouts
  grid: {
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
    fourColumn: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    compact: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2',
    stats: 'grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4',
  },

  // Stack layouts
  stack: {
    default: 'flex flex-col gap-4',
    compact: 'flex flex-col gap-2',
    loose: 'flex flex-col gap-6',
  },

  // Table container styles
  tableContainer: 'overflow-auto rounded-lg border border-border shadow-sm',
};
