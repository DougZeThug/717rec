
/**
 * Time block definitions for auto-scheduling
 * Updated to support back-to-back match pairs
 */

// Individual time slots (30-minute intervals)
export const TIME_SLOTS = {
  '6:30 PM': '6:30 PM',
  '7:00 PM': '7:00 PM', 
  '7:30 PM': '7:30 PM',
  '8:00 PM': '8:00 PM',
  '8:30 PM': '8:30 PM',
  '9:00 PM': '9:00 PM'
  // Note: 9:30 PM removed as it has no valid back-to-back pair
} as const;

// Back-to-back time slot pairs (teams play consecutive 30-minute matches)
export const BACK_TO_BACK_PAIRS = {
  'Early': {
    primary: '6:30 PM',
    secondary: '7:00 PM',
    label: 'Early Pair (6:30-7:00 PM)'
  },
  'Mid': {
    primary: '7:30 PM', 
    secondary: '8:00 PM',
    label: 'Mid Pair (7:30-8:00 PM)'
  },
  'Late': {
    primary: '8:30 PM',
    secondary: '9:00 PM', 
    label: 'Late Pair (8:30-9:00 PM)'
  }
} as const;

// Legacy TIME_BLOCKS maintained for backward compatibility
export const TIME_BLOCKS = {
  Early: {
    main: '6:30 PM',
    secondary: '7:00 PM'
  },
  Mid: {
    main: '7:30 PM',
    secondary: '8:00 PM'
  },
  Late: {
    main: '8:30 PM',
    secondary: '9:00 PM'
  }
} as const;

// Utility functions for back-to-back scheduling
export const getBackToBackPair = (timeSlot: string): string | null => {
  switch (timeSlot) {
    case '6:30 PM': return '7:00 PM';
    case '7:00 PM': return '6:30 PM';
    case '7:30 PM': return '8:00 PM';
    case '8:00 PM': return '7:30 PM';
    case '8:30 PM': return '9:00 PM';
    case '9:00 PM': return '8:30 PM';
    default: return null;
  }
};

export const isValidBackToBackSlot = (timeSlot: string): boolean => {
  return getBackToBackPair(timeSlot) !== null;
};

export const getBackToBackPairName = (timeSlot: string): string | null => {
  switch (timeSlot) {
    case '6:30 PM':
    case '7:00 PM':
      return 'Early';
    case '7:30 PM':
    case '8:00 PM':
      return 'Mid';
    case '8:30 PM':
    case '9:00 PM':
      return 'Late';
    default:
      return null;
  }
};

export const getMatchSequence = (timeSlot: string): number | null => {
  switch (timeSlot) {
    case '6:30 PM':
    case '7:30 PM':
    case '8:30 PM':
      return 1; // First match in the pair
    case '7:00 PM':
    case '8:00 PM':
    case '9:00 PM':
      return 2; // Second match in the pair
    default:
      return null;
  }
};

// Validation constants
export const MIN_TEAMS_PER_BACK_TO_BACK_PAIR = 4; // Minimum 2 matches (4 teams)
export const MAX_TEAMS_PER_BACK_TO_BACK_PAIR = 16; // Maximum 8 matches (16 teams)
