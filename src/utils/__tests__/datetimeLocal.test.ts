import { describe, expect, it } from 'vitest';

import { isoToLocalInput, localInputToIso } from '../datetimeLocal';

describe('datetimeLocal', () => {
  it('returns null for an empty or unreadable datetime-local value', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('not a date')).toBeNull();
  });

  it('round-trips a value through ISO and back', () => {
    const value = '2026-09-15T18:30';
    const iso = localInputToIso(value);

    expect(iso).not.toBeNull();
    expect(isoToLocalInput(iso)).toBe(value);
  });

  it('gives an empty string for a missing or unreadable timestamp', () => {
    expect(isoToLocalInput(null)).toBe('');
    expect(isoToLocalInput(undefined)).toBe('');
    expect(isoToLocalInput('nonsense')).toBe('');
  });
});
