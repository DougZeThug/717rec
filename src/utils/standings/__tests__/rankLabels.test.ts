import { describe, expect, it } from 'vitest';

import { formatRankDisplay, getRankAriaLabel } from '../rankLabels';

describe('formatRankDisplay (division rank, with the overall rank behind it)', () => {
  it('shows the overall rank alone in the all-teams view', () => {
    expect(formatRankDisplay(4, 2, true)).toBe('#4');
  });

  it('shows the division rank with the overall rank in the division view', () => {
    expect(formatRankDisplay(4, 2, false)).toBe('#2 (4)');
  });

  it('falls back to the overall rank when the team has no division rank', () => {
    expect(formatRankDisplay(4, null, false)).toBe('#4');
    expect(formatRankDisplay(4, undefined, false)).toBe('#4');
  });
});

describe('getRankAriaLabel (the same cell, spoken in full)', () => {
  it('names the overall rank in the all-teams view', () => {
    expect(getRankAriaLabel(4, 2, true, 0)).toBe('Rank 4');
  });

  it('names both ranks in the division view', () => {
    expect(getRankAriaLabel(4, 2, false, 0)).toBe('Division rank 2, overall rank 4');
  });

  it('says which way the team moved, and how far', () => {
    expect(getRankAriaLabel(4, 2, true, 3)).toBe('Rank 4, moved up 3 positions');
    expect(getRankAriaLabel(4, 2, true, -2)).toBe('Rank 4, moved down 2 positions');
  });

  // One position is singular; the plural is not hard-coded.
  it('uses the singular for a one-place move', () => {
    expect(getRankAriaLabel(4, 2, true, 1)).toBe('Rank 4, moved up 1 position');
    expect(getRankAriaLabel(4, 2, true, -1)).toBe('Rank 4, moved down 1 position');
  });

  it('says nothing about movement when the team has not moved', () => {
    expect(getRankAriaLabel(4, null, false, 0)).toBe('Rank 4');
    expect(getRankAriaLabel(4, null, false, undefined)).toBe('Rank 4');
  });
});
