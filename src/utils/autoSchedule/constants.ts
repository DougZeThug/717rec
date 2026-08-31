/**
 * Time block definitions for auto-scheduling
 * Updated for consecutive back-to-back scheduling - teams get selected time + next 30 minutes
 */

// Back-to-back time slot pairs - consecutive 30-minute slots
export const BACK_TO_BACK_PAIRS = {
  SuperUltraEarly: {
    primary: '5:00 PM',
    secondary: '5:30 PM',
    label: 'Super Ultra Early Pair (5:00-5:30 PM)',
  },
  UltraEarly: {
    primary: '5:30 PM',
    secondary: '6:00 PM',
    label: 'Ultra Early Pair (5:30-6:00 PM)',
  },
  SuperEarly: {
    primary: '6:00 PM',
    secondary: '6:30 PM',
    label: 'Super Early Pair (6:00-6:30 PM)',
  },
  Early: {
    primary: '6:30 PM',
    secondary: '7:00 PM',
    label: 'Early Pair (6:30-7:00 PM)',
  },
  MidEarly: {
    primary: '7:00 PM',
    secondary: '7:30 PM',
    label: 'Mid Early Pair (7:00-7:30 PM)',
  },
  Mid: {
    primary: '7:30 PM',
    secondary: '8:00 PM',
    label: 'Mid Pair (7:30-8:00 PM)',
  },
  LateMid: {
    primary: '8:00 PM',
    secondary: '8:30 PM',
    label: 'Late Mid Pair (8:00-8:30 PM)',
  },
  Late: {
    primary: '8:30 PM',
    secondary: '9:00 PM',
    label: 'Late Pair (8:30-9:00 PM)',
  },
  SuperLate: {
    primary: '9:00 PM',
    secondary: '9:30 PM',
    label: 'Super Late Pair (9:00-9:30 PM)',
  },
} as const;

// TIME_BLOCKS with structure expected by MatchPairingItem
export const TIME_BLOCKS = {
  SuperUltraEarly: {
    main: BACK_TO_BACK_PAIRS.SuperUltraEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperUltraEarly.secondary,
  },
  UltraEarly: {
    main: BACK_TO_BACK_PAIRS.UltraEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.UltraEarly.secondary,
  },
  SuperEarly: {
    main: BACK_TO_BACK_PAIRS.SuperEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperEarly.secondary,
  },
  Early: {
    main: BACK_TO_BACK_PAIRS.Early.primary,
    secondary: BACK_TO_BACK_PAIRS.Early.secondary,
  },
  MidEarly: {
    main: BACK_TO_BACK_PAIRS.MidEarly.primary,
    secondary: BACK_TO_BACK_PAIRS.MidEarly.secondary,
  },
  Mid: {
    main: BACK_TO_BACK_PAIRS.Mid.primary,
    secondary: BACK_TO_BACK_PAIRS.Mid.secondary,
  },
  LateMid: {
    main: BACK_TO_BACK_PAIRS.LateMid.primary,
    secondary: BACK_TO_BACK_PAIRS.LateMid.secondary,
  },
  Late: {
    main: BACK_TO_BACK_PAIRS.Late.primary,
    secondary: BACK_TO_BACK_PAIRS.Late.secondary,
  },
  SuperLate: {
    main: BACK_TO_BACK_PAIRS.SuperLate.primary,
    secondary: BACK_TO_BACK_PAIRS.SuperLate.secondary,
  },
} as const;

/**
 * Every real block time, in order: the de-duplicated union of each pair's primary and
 * secondary. The pairs are already chronological and overlap end to start, so insertion
 * order runs 5:00 PM to 9:30 PM. Anything offering the admin a timeslot uses this, so
 * the choices cannot drift away from the blocks.
 */
export const ALL_BLOCK_TIMES: string[] = [
  ...new Set(Object.values(BACK_TO_BACK_PAIRS).flatMap((pair) => [pair.primary, pair.secondary])),
];

/**
 * The times a double header can start at: every pair's primary slot.
 *
 * A double header books a time and the 30 minutes after it, so it can only
 * start at a time that has a partner. 9:30 PM is a real block time but nothing
 * follows it, so it is a valid single assignment and never a double-header
 * start. Derived from the pairs so the two cannot drift apart.
 */
export const DOUBLE_HEADER_START_TIMES: string[] = Object.values(BACK_TO_BACK_PAIRS).map(
  (pair) => pair.primary
);

// Lookup maps for efficient time slot operations
const BACK_TO_BACK_MAP = new Map<string, string>(
  Object.values(BACK_TO_BACK_PAIRS).map((pair) => [pair.primary, pair.secondary])
);

const TIME_TO_PAIR_NAME_MAP = new Map<string, string>(
  Object.entries(BACK_TO_BACK_PAIRS).map(([name, pair]) => [pair.primary, name])
);

// Utility functions for consecutive back-to-back scheduling
export const getBackToBackPair = (timeSlot: string): string | null => {
  return BACK_TO_BACK_MAP.get(timeSlot) ?? null;
};

/** Name of the back-to-back pair whose primary slot is the given time, or null if none. */
export const getBackToBackPairName = (timeSlot: string): string | null => {
  return TIME_TO_PAIR_NAME_MAP.get(timeSlot) ?? null;
};

// Get the pair configuration for a given pair name
export const getPairConfig = (pairName: string) => {
  return BACK_TO_BACK_PAIRS[pairName as keyof typeof BACK_TO_BACK_PAIRS];
};
