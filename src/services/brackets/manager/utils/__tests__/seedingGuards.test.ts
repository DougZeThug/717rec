import { describe, expect, it } from 'vitest';

import { ValidationError } from '@/types/errors';

import { assertUniqueSeedingNames } from '../seedingGuards';

describe('assertUniqueSeedingNames', () => {
  it('accepts a list of distinct names', () => {
    expect(() =>
      assertUniqueSeedingNames([{ name: 'Ringers' }, { name: 'Baggers' }, { name: 'Slingers' }])
    ).not.toThrow();
  });

  it('accepts an empty list', () => {
    expect(() => assertUniqueSeedingNames([])).not.toThrow();
  });

  it('throws a ValidationError naming the duplicated team', () => {
    expect(() =>
      assertUniqueSeedingNames([{ name: 'Ringers' }, { name: 'Baggers' }, { name: 'Ringers' }])
    ).toThrow(ValidationError);
    expect(() =>
      assertUniqueSeedingNames([{ name: 'Ringers' }, { name: 'Baggers' }, { name: 'Ringers' }])
    ).toThrow('are both named "Ringers"');
  });

  it('compares names exactly, matching the library resolution (case matters)', () => {
    expect(() =>
      assertUniqueSeedingNames([{ name: 'Ringers' }, { name: 'ringers' }])
    ).not.toThrow();
  });
});
