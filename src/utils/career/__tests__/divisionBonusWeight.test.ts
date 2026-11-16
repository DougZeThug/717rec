import { describe, expect, it } from 'vitest';

import {
  averageDivisionBonusWeight,
  maxDivisionBonusWeight,
  resolveDivisionBonusWeight,
} from '../divisionBonusWeight';

const weights = new Map<string, number>([
  ['competitive', 1.0],
  ['competitive low', 0.95],
  ['intermediate high', 0.8],
  ['intermediate', 0.7],
  ['intermediate low', 0.6],
  ['recreational', 0.35],
]);

describe('resolveDivisionBonusWeight', () => {
  it('matches a live division name exactly, case-insensitively', () => {
    expect(resolveDivisionBonusWeight('Competitive', weights)).toBe(1.0);
    expect(resolveDivisionBonusWeight('recreational', weights)).toBe(0.35);
  });

  it('maps synthetic season labels to the real division', () => {
    expect(resolveDivisionBonusWeight('Intermediate 1', weights)).toBe(0.8);
    expect(resolveDivisionBonusWeight('Intermediate 2', weights)).toBe(0.6);
  });

  it('falls back to the base tier word', () => {
    expect(resolveDivisionBonusWeight('Intermediate 5', weights)).toBe(0.7);
  });

  it('treats an unknown or missing name as unrated (null), not a guessed weight', () => {
    expect(resolveDivisionBonusWeight('Mystery', weights)).toBeNull();
    expect(resolveDivisionBonusWeight(null, weights)).toBeNull();
  });

  it.each([
    ['an empty name', ''],
    ['a name of only spaces', '   '],
    ['a missing name', undefined],
  ])('treats %s as unrated (null)', (_label, name) => {
    expect(resolveDivisionBonusWeight(name, weights)).toBeNull();
  });

  it('keeps a real weight of 0 instead of treating it as unknown', () => {
    const withZero = new Map<string, number>([['zero', 0]]);

    expect(resolveDivisionBonusWeight('Zero', withZero)).toBe(0);
    // The base tier word finds it too.
    expect(resolveDivisionBonusWeight('Zero 4', withZero)).toBe(0);
  });

  it('resolves a Hidden division by its live weight like any other name', () => {
    const withHidden = new Map<string, number>([
      ['hidden', 0.6],
      ['hidden2', 0.35],
    ]);

    expect(resolveDivisionBonusWeight('Hidden', withHidden)).toBe(0.6);
    expect(resolveDivisionBonusWeight('Hidden2', withHidden)).toBe(0.35);
  });

  // A division that exists but has no weight is unrated, and that answer is
  // final. It must not fall through to an alias or a base tier word: SQL stops
  // at the matched row, and the two must give the same number.
  describe('a matched division with no weight (null)', () => {
    const withNullWeight = new Map<string, number | null>([
      ['intermediate', 0.7],
      ['intermediate high', null],
    ]);

    it('is unrated and does not fall through to the base tier word', () => {
      // "intermediate high" exists, so the base word "intermediate" (0.7) must not be used.
      expect(resolveDivisionBonusWeight('Intermediate High', withNullWeight)).toBeNull();
    });

    it('is unrated when a synthetic label maps to it, without a base-word fall through', () => {
      // "Intermediate 1" maps to "intermediate high". Its null stops the lookup.
      expect(resolveDivisionBonusWeight('Intermediate 1', withNullWeight)).toBeNull();
    });

    it('is unrated when it is the base tier word', () => {
      const baseOnly = new Map<string, number | null>([['intermediate', null]]);

      expect(resolveDivisionBonusWeight('Intermediate 5', baseOnly)).toBeNull();
    });

    it('does not affect a different division', () => {
      expect(resolveDivisionBonusWeight('Intermediate 5', withNullWeight)).toBe(0.7);
    });
  });

  // KNOWN DIFFERENCE FROM SQL. JavaScript trim() and split(/\s+/) treat a tab
  // and a non-breaking space as blanks. The SQL twin uses btrim() and
  // split_part(' '), which only know the plain space, so SQL returns null for
  // the same names. This pins what TypeScript does today. It is not a league
  // rule. A name with a tab or a non-breaking space is not expected in real data.
  describe('known difference from SQL: tab and non-breaking space', () => {
    it.each([
      ['a leading tab', '\tCompetitive', 1.0],
      ['a trailing non-breaking space', 'Competitive ', 1.0],
      ['a tab before the tier number', 'Intermediate\t5', 0.7],
      ['a non-breaking space before the tier number', 'Intermediate 5', 0.7],
    ])('rates %s (SQL returns null for it)', (_label, name, expected) => {
      expect(resolveDivisionBonusWeight(name, weights)).toBe(expected);
    });
  });
});

describe('averageDivisionBonusWeight', () => {
  it('averages resolved weights', () => {
    expect(averageDivisionBonusWeight(['Competitive', 'Intermediate'], weights)).toBeCloseTo(0.85);
  });

  it('returns null when nothing resolves', () => {
    expect(averageDivisionBonusWeight([], weights)).toBeNull();
    expect(averageDivisionBonusWeight([null, undefined], weights)).toBeNull();
  });

  it('skips blank names before it averages', () => {
    expect(averageDivisionBonusWeight(['', null, 'Competitive'], weights)).toBe(1.0);
  });

  it('leaves an unknown season out of the average, in both the sum and the count', () => {
    expect(averageDivisionBonusWeight(['Competitive', 'Mystery'], weights)).toBe(1.0);
    expect(averageDivisionBonusWeight(['Competitive', 'Intermediate', 'Mystery'], weights)).toBe(
      0.85
    );
  });

  it('returns null when every season is unknown', () => {
    expect(averageDivisionBonusWeight(['Mystery'], weights)).toBeNull();
    expect(averageDivisionBonusWeight(['Mystery', ''], weights)).toBeNull();
  });

  it('leaves a division with no weight out of the average', () => {
    const withNullWeight = new Map<string, number | null>([
      ['competitive', 1.0],
      ['cuspers', null],
    ]);

    expect(averageDivisionBonusWeight(['Competitive', 'Cuspers'], withNullWeight)).toBe(1.0);
    expect(averageDivisionBonusWeight(['Cuspers'], withNullWeight)).toBeNull();
  });

  it('counts a real weight of 0 in the average', () => {
    const withZero = new Map<string, number>([
      ['competitive', 1.0],
      ['zero', 0],
    ]);

    expect(averageDivisionBonusWeight(['Competitive', 'Zero'], withZero)).toBe(0.5);
    expect(averageDivisionBonusWeight(['Zero'], withZero)).toBe(0);
  });
});

describe('maxDivisionBonusWeight', () => {
  it('returns the highest resolved weight', () => {
    expect(maxDivisionBonusWeight(['Recreational', 'Intermediate', 'Competitive'], weights)).toBe(
      1.0
    );
    expect(maxDivisionBonusWeight(['Recreational', 'Intermediate'], weights)).toBe(0.7);
  });

  it('ignores an unknown or blank name instead of letting it set the maximum', () => {
    // An unrated name must not count as 0.85, as 0, or as NaN.
    expect(maxDivisionBonusWeight(['Intermediate', 'Mystery', '', null], weights)).toBe(0.7);
  });

  it('returns null when none is rated, so the caller can pick its own fallback', () => {
    expect(maxDivisionBonusWeight([], weights)).toBeNull();
    expect(maxDivisionBonusWeight(['Mystery'], weights)).toBeNull();
    expect(maxDivisionBonusWeight([null, undefined, ''], weights)).toBeNull();
  });

  it('ignores a division with no weight', () => {
    const withNullWeight = new Map<string, number | null>([
      ['intermediate', 0.7],
      ['cuspers', null],
    ]);

    expect(maxDivisionBonusWeight(['Intermediate', 'Cuspers'], withNullWeight)).toBe(0.7);
    expect(maxDivisionBonusWeight(['Cuspers'], withNullWeight)).toBeNull();
  });

  it('returns 0, not null, when the only rated weight is a real 0', () => {
    const withZero = new Map<string, number>([['zero', 0]]);

    expect(maxDivisionBonusWeight(['Zero', 'Mystery'], withZero)).toBe(0);
  });
});
