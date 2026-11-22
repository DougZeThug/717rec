import { afterEach, describe, expect, it, vi } from 'vitest';

import { mapStatusToString } from '../bracketViewerUtils';

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
});
