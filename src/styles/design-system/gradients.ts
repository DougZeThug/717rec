/**
 * Gradient backgrounds for cards and sections
 */
export const gradients = {
  // Card gradients
  card: {
    default: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
    subtle: 'bg-gradient-to-br from-white to-gray-100 dark:from-gray-800/80 dark:to-gray-900/80',
    highlight: 'bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900/90',
    // New orange accent gradients
    orangeAccent: 'bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-900',
    blueOrange:
      'bg-gradient-to-br from-white via-blue-50/30 to-orange-50/40 dark:from-gray-800 dark:to-gray-900',
  },

  // Button gradients
  button: {
    primary:
      'bg-gradient-to-br from-cornhole-navy to-cornhole-navy/90 hover:from-cornhole-navy/90 hover:to-cornhole-navy/80',
    secondary:
      'bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500',
    blue: 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 dark:from-blue-700 dark:to-blue-800',
    green:
      'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 dark:from-green-700 dark:to-green-800',
    // New button gradients with orange accents
    orange:
      'bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white',
    orangeSubtle:
      'bg-gradient-to-br from-orange-100 to-orange-200 hover:from-orange-200 hover:to-orange-300 text-orange-800 dark:text-orange-900',
    blueOrange:
      'bg-gradient-to-br from-cornhole-navy to-amber-700/80 hover:from-cornhole-navy/90 hover:to-amber-600/90 text-white',
  },

  // Section backgrounds
  section: {
    subtle: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-black',
    // New section backgrounds with orange accents
    blueOrangeSubtle:
      'bg-gradient-to-br from-blue-50 via-white to-orange-50/30 dark:from-gray-800/90 dark:via-gray-800 dark:to-gray-900',
  },
};
