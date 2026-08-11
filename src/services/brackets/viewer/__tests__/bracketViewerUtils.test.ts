import { afterEach, describe, expect, it, vi } from 'vitest';

import { calculateBracketSize, mapStatusToString } from '../bracketViewerUtils';

afterEach(() => vi.resetAllMocks());

describe('bracketViewerUtils', () => {
  it.each([
    [0, 'locked'],
    [1, 'waiting'],
    [2, 'ready'],
    [3, 'running'],
    [4, 'completed'],
    [5, 'archived'],
    [99, 'waiting'],
  ] as const)('maps status %s to %s', (status, expected) => {
    expect(mapStatusToString(status)).toBe(expected);
  });

  it('uses the minimum bracket size for empty matches and missing seeds', () => {
    expect(calculateBracketSize([])).toBe(8);
    expect(calculateBracketSize([{ team1Seed: null, team2Seed: undefined }] as never)).toBe(8);
  });

  it('rounds the largest seed up to the next power of two', () => {
    expect(calculateBracketSize([{ team1Seed: 9, team2Seed: 2 }] as never)).toBe(16);
  });
});
