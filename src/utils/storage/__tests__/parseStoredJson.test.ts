import { describe, expect, it } from 'vitest';

import { parseStoredJson } from '../parseStoredJson';

interface TestShape {
  id: string;
}

const isTestShape = (value: unknown): value is TestShape => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return typeof (value as { id?: unknown }).id === 'string';
};

describe('parseStoredJson', () => {
  it('returns missing when raw value is null', () => {
    expect(parseStoredJson<TestShape>(null, isTestShape)).toEqual({
      ok: false,
      error: 'missing',
    });
  });

  it('returns invalid_json when JSON.parse fails', () => {
    expect(parseStoredJson<TestShape>('{', isTestShape)).toEqual({
      ok: false,
      error: 'invalid_json',
    });
  });

  it('returns invalid_shape when validator fails', () => {
    expect(parseStoredJson<TestShape>(JSON.stringify({ id: 123 }), isTestShape)).toEqual({
      ok: false,
      error: 'invalid_shape',
    });
  });

  it('returns parsed value when validator passes', () => {
    expect(parseStoredJson<TestShape>(JSON.stringify({ id: 'abc' }), isTestShape)).toEqual({
      ok: true,
      value: { id: 'abc' },
    });
  });
});
