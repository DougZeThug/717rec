import { describe, expect, it } from 'vitest';

import { DEFAULT_DIVISION_WEIGHT } from '../defaultDivisionWeight';

describe('defaultDivisionWeight', () => {
  // The value is a temporary fallback. It must stay 0.85 and below the 0.89
  // competitive-playoff threshold until the "treat as unrated" decision is built.
  it("pins today's behaviour: DEFAULT_DIVISION_WEIGHT is 0.85 and below 0.89", () => {
    expect(DEFAULT_DIVISION_WEIGHT).toBe(0.85);
    expect(DEFAULT_DIVISION_WEIGHT).toBeLessThan(0.89);
  });
});
