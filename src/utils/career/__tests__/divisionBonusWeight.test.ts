import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  getDefaultDivisionWeight: () => 0.85,
}));

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
});

describe('averageDivisionBonusWeight', () => {
  it('averages resolved weights', () => {
    expect(averageDivisionBonusWeight(['Competitive', 'Intermediate'], weights)).toBeCloseTo(0.85);
  });

  it('returns null when nothing resolves', () => {
    expect(averageDivisionBonusWeight([], weights)).toBeNull();
    expect(averageDivisionBonusWeight([null, undefined], weights)).toBeNull();
  });
});