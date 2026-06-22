import { describe, expect, it } from 'vitest';

import { formatNotificationDate } from '../formatNotificationDate';

describe('formatNotificationDate', () => {
  it('returns empty fields for null/undefined input', () => {
    expect(formatNotificationDate(null)).toEqual({ absolute: '', relative: '', iso: '' });
    expect(formatNotificationDate(undefined)).toEqual({ absolute: '', relative: '', iso: '' });
  });

  it('returns empty absolute/relative but preserves iso for invalid date strings', () => {
    const result = formatNotificationDate('not-a-date');
    expect(result.absolute).toBe('');
    expect(result.relative).toBe('');
    expect(result.iso).toBe('not-a-date');
  });

  it('formats a valid UTC ISO timestamp in EST with timezone label', () => {
    // 2026-05-21T18:30:00Z => 2:30 PM EDT
    const result = formatNotificationDate('2026-05-21T18:30:00Z');
    expect(result.iso).toBe('2026-05-21T18:30:00Z');
    // Must include the EST/EDT timezone marker so users know the timezone.
    expect(result.absolute).toMatch(/E[SD]T/);
    // Must include year and month abbreviation.
    expect(result.absolute).toMatch(/2026/);
    expect(result.absolute).toMatch(/May/);
    // Relative should be a non-empty string like "X ago" / "in X".
    expect(typeof result.relative).toBe('string');
    expect(result.relative.length).toBeGreaterThan(0);
  });

  it('renders the EST hour, not the UTC hour, for a known timestamp', () => {
    // 2026-01-15T17:00:00Z => 12:00 PM EST
    const result = formatNotificationDate('2026-01-15T17:00:00Z');
    expect(result.absolute).toMatch(/12:00\s?PM/);
    expect(result.absolute).toMatch(/EST/);
  });
});
