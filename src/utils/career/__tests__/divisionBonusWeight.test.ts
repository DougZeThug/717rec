import { describe, expect, it } from 'vitest';

import { averageDivisionBonusWeight, resolveDivisionBonusWeight } from '../divisionBonusWeight';

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

  it('falls back to the default weight for unknown or missing names', () => {
    expect(resolveDivisionBonusWeight('Mystery', weights)).toBe(0.85);
    expect(resolveDivisionBonusWeight(null, weights)).toBe(0.85);
  });

  // Pins what the code does today. The unrated-division change flips these
  // three on purpose: a blank or unknown name will be unrated (null).
  it.each([
    ['an empty name', ''],
    ['a name of only spaces', '   '],
    ['a missing name', undefined],
  ])("falls back to the default weight for %s (today's behaviour)", (_label, name) => {
    expect(resolveDivisionBonusWeight(name, weights)).toBe(0.85);
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

  // Pins what the code does today. The unrated-division change flips these on
  // purpose: an unknown season will be left out of the average.
  it("counts an unknown season as the 0.85 default (today's behaviour)", () => {
    expect(averageDivisionBonusWeight(['Competitive', 'Mystery'], weights)).toBeCloseTo(0.925, 10);
    expect(averageDivisionBonusWeight(['Mystery'], weights)).toBeCloseTo(0.85, 10);
  });
});
