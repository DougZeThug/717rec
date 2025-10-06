
/**
 * Time block definitions for auto-scheduling
 * Updated for consecutive back-to-back scheduling - teams get selected time + next 30 minutes
 */

// Back-to-back time slot pairs - consecutive 30-minute slots
export const BACK_TO_BACK_PAIRS = {
  'SuperUltraEarly': {
    primary: '5:00 PM',
    secondary: '5:30 PM',
    label: 'Super Ultra Early Pair (5:00-5:30 PM)'
  },
  'UltraEarly': {
    primary: '5:30 PM',
    secondary: '6:00 PM',
    label: 'Ultra Early Pair (5:30-6:00 PM)'
  },
  'SuperEarly': {
    primary: '6:00 PM',
    secondary: '6:30 PM',
    label: 'Super Early Pair (6:00-6:30 PM)'
  },
  'Early': {
    primary: '6:30 PM',
    secondary: '7:00 PM',
    label: 'Early Pair (6:30-7:00 PM)'
  },
  'MidEarly': {
    primary: '7:00 PM',
    secondary: '7:30 PM',
    label: 'Mid Early Pair (7:00-7:30 PM)'
  },
  'Mid': {
    primary: '7:30 PM', 
    secondary: '8:00 PM',
    label: 'Mid Pair (7:30-8:00 PM)'
  },
  'LateMid': {
    primary: '8:00 PM',
    secondary: '8:30 PM',
    label: 'Late Mid Pair (8:00-8:30 PM)'
  },
  'Late': {
    primary: '8:30 PM',
    secondary: '9:00 PM', 
    label: 'Late Pair (8:30-9:00 PM)'
  },
  'SuperLate': {
    primary: '9:00 PM',
    secondary: '9:30 PM',
    label: 'Super Late Pair (9:00-9:30 PM)'
  }
} as const;

// Individual time slots for reference
export const TIME_SLOTS = {
  '5:00 PM': '5:00 PM',
  '5:30 PM': '5:30 PM',
  '6:00 PM': '6:00 PM',
  '6:30 PM': '6:30 PM',
  '7:00 PM': '7:00 PM', 
  '7:30 PM': '7:30 PM',
  '8:00 PM': '8:00 PM',
  '8:30 PM': '8:30 PM',
  '9:00 PM': '9:00 PM',
  '9:30 PM': '9:30 PM'
} as const;

// TIME_BLOCKS with structure expected by MatchPairingItem
export const TIME_BLOCKS = {
  SuperUltraEarly: {
    main: BACK_TO_BACK_PAIRS.SuperUltraEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperUltraEarly.secondary
  },
  UltraEarly: {
    main: BACK_TO_BACK_PAIRS.UltraEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.UltraEarly.secondary
  },
  SuperEarly: {
    main: BACK_TO_BACK_PAIRS.SuperEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperEarly.secondary
  },
  Early: {
    main: BACK_TO_BACK_PAIRS.Early.primary,
    secondary: BACK_TO_BACK_PAIRS.Early.secondary
  },
  MidEarly: {
    main: BACK_TO_BACK_PAIRS.MidEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.MidEarly.secondary
  },
  Mid: {
    main: BACK_TO_BACK_PAIRS.Mid.primary,
    secondary: BACK_TO_BACK_PAIRS.Mid.secondary
  },
  LateMid: {
    main: BACK_TO_BACK_PAIRS.LateMid.primary,
    secondary: BACK_TO_BACK_PAIRS.LateMid.secondary
  },
  Late: {
    main: BACK_TO_BACK_PAIRS.Late.primary,
    secondary: BACK_TO_BACK_PAIRS.Late.secondary
  },
  SuperLate: {
    main: BACK_TO_BACK_PAIRS.SuperLate.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperLate.secondary
  }
} as const;

// Utility functions for consecutive back-to-back scheduling
export const getBackToBackPair = (timeSlot: string): string | null => {
  switch (timeSlot) {
    case '5:00 PM': return '5:30 PM';
    case '5:30 PM': return '6:00 PM';
    case '6:00 PM': return '6:30 PM';
    case '6:30 PM': return '7:00 PM';
    case '7:00 PM': return '7:30 PM';
    case '7:30 PM': return '8:00 PM';
    case '8:00 PM': return '8:30 PM';
    case '8:30 PM': return '9:00 PM';
    case '9:00 PM': return '9:30 PM';
    default: return null;
  }
};

export const isValidBackToBackSlot = (timeSlot: string): boolean => {
  return getBackToBackPair(timeSlot) !== null;
};

export const getBackToBackPairName = (timeSlot: string): string | null => {
  switch (timeSlot) {
    case '5:00 PM':
      return 'SuperUltraEarly';
    case '5:30 PM':
      return 'UltraEarly';
    case '6:00 PM':
      return 'SuperEarly';
    case '6:30 PM':
      return 'Early';
    case '7:00 PM':
      return 'MidEarly';
    case '7:30 PM':
      return 'Mid';
    case '8:00 PM':
      return 'LateMid';
    case '8:30 PM':
      return 'Late';
    case '9:00 PM':
      return 'SuperLate';
    default:
      return null;
  }
};

export const getMatchSequence = (timeSlot: string): number | null => {
  // Determine sequence based on whether the timeslot is in the earlier or later position
  // Primary slots are always sequence 1, secondary slots are always sequence 2
  const secondarySlots = ['5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM'];
  
  switch (timeSlot) {
    case '5:00 PM':
      return 1; // Always primary (SuperUltraEarly only)
    case '5:30 PM':
      // Can be either primary (UltraEarly) or secondary (SuperUltraEarly)
      return 1; // Default to primary
    case '6:00 PM':
    case '6:30 PM':
    case '7:00 PM':
    case '7:30 PM':
    case '8:00 PM':
    case '8:30 PM':
    case '9:00 PM':
      // These can be either primary or secondary depending on context
      // For now, default to primary (sequence 1) - will be overridden by TimeslotService
      return 1;
    case '9:30 PM':
      return 2; // Always secondary (SuperLate only)
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
