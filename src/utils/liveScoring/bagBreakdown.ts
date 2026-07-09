import type { BagBreakdown } from './types';

// Every round score maps to how the 4 bags landed (3 pts in-hole, 1 pt
// on-board). Scores 3, 4 and 6 can be reached two ways, so the scorer must
// say how many bags went in the hole; every other score is unambiguous.
const SCORE_BREAKDOWNS: Record<number, BagBreakdown[]> = {
  0: [{ bagsIn: 0, bagsOn: 0, bagsOff: 4 }],
  1: [{ bagsIn: 0, bagsOn: 1, bagsOff: 3 }],
  2: [{ bagsIn: 0, bagsOn: 2, bagsOff: 2 }],
  3: [
    { bagsIn: 0, bagsOn: 3, bagsOff: 1 },
    { bagsIn: 1, bagsOn: 0, bagsOff: 3 },
  ],
  4: [
    { bagsIn: 0, bagsOn: 4, bagsOff: 0 },
    { bagsIn: 1, bagsOn: 1, bagsOff: 2 },
  ],
  5: [{ bagsIn: 1, bagsOn: 2, bagsOff: 1 }],
  6: [
    { bagsIn: 1, bagsOn: 3, bagsOff: 0 },
    { bagsIn: 2, bagsOn: 0, bagsOff: 2 },
  ],
  7: [{ bagsIn: 2, bagsOn: 1, bagsOff: 1 }],
  8: [{ bagsIn: 2, bagsOn: 2, bagsOff: 0 }],
  9: [{ bagsIn: 3, bagsOn: 0, bagsOff: 1 }],
  10: [{ bagsIn: 3, bagsOn: 1, bagsOff: 0 }],
  12: [{ bagsIn: 4, bagsOn: 0, bagsOff: 0 }],
};

export const AMBIGUOUS_SCORES = [3, 4, 6] as const;

export function isAmbiguousScore(score: number): boolean {
  return (SCORE_BREAKDOWNS[score]?.length ?? 0) > 1;
}

/** The possible bags-in-hole counts for an ambiguous score. */
export function getAmbiguousOptions(score: number): number[] {
  return (SCORE_BREAKDOWNS[score] ?? []).map((b) => b.bagsIn);
}

/**
 * Resolve a round score to its bag breakdown. Ambiguous scores need the
 * bagsIn answer; returns null when the score is invalid or unresolvable.
 */
export function getBagBreakdown(score: number, bagsIn?: number): BagBreakdown | null {
  const options = SCORE_BREAKDOWNS[score];
  if (!options) return null;
  if (options.length === 1) return options[0];
  if (bagsIn === undefined) return null;
  return options.find((b) => b.bagsIn === bagsIn) ?? null;
}

export function validateBreakdown(score: number, breakdown: BagBreakdown): boolean {
  const { bagsIn, bagsOn, bagsOff } = breakdown;
  return (
    [bagsIn, bagsOn, bagsOff].every((n) => Number.isInteger(n) && n >= 0 && n <= 4) &&
    bagsIn + bagsOn + bagsOff === 4 &&
    bagsIn * 3 + bagsOn === score
  );
}
