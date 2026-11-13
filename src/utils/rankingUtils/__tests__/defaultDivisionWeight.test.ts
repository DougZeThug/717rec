import { describe, expect, it } from 'vitest';

import { getDefaultDivisionWeight } from '../defaultDivisionWeight';

describe('defaultDivisionWeight', () => {
  it('getDefaultDivisionWeight returns 0.85', () => {
    expect(getDefaultDivisionWeight()).toBe(0.85);
  });
});
