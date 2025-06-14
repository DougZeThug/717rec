/**
 * Time block definitions for auto-scheduling
 * Updated for always back-to-back scheduling - teams ALWAYS play consecutive matches
 */

// Back-to-back time slot pairs - the fundamental scheduling unit
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

// Individual time slots for reference only
export const TIME_SLOTS = {
  '6:30 PM': '6:30 PM',
  '7:00 PM': '7:00 PM', 
  '7:30 PM': '7:30 PM',
  '8:00 PM': '8:00 PM',
  '8:30 PM': '8:30 PM',
  '9:00 PM': '9:00 PM'
} as const;

// TIME_BLOCKS with structure expected by MatchPairingItem
export const TIME_BLOCKS = {
  Early: {
    main: BACK_TO_BACK_PAIRS.Early.primary,
    secondary: BACK_TO_BACK_PAIRS.Early.secondary
  },
  Mid: {
    main: BACK_TO_BACK_PAIRS.Mid.primary,
    secondary: BACK_TO_BACK_PAIRS.Mid.secondary
  },
  Late: {
    main: BACK_TO_BACK_PAIRS.Late.primary,
    secondary: BACK_TO_BACK_PAIRS.Late.secondary
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

// Get the pair configuration for a given pair name
export const getPairConfig = (pairName: string) => {
  return BACK_TO_BACK_PAIRS[pairName as keyof typeof BACK_TO_BACK_PAIRS];
};

// Get all valid pair names
export const getAllPairNames = (): string[] => {
  return Object.keys(BACK_TO_BACK_PAIRS);
};

// Validation constants
export const MIN_TEAMS_PER_BACK_TO_BACK_PAIR = 4; // Minimum 2 matches (4 teams)
export const MAX_TEAMS_PER_BACK_TO_BACK_PAIR = 16; // Maximum 8 matches (16 teams)
