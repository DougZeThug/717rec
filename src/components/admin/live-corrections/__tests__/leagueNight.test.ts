import { describe, expect, it } from 'vitest';

import { formatLeagueNight, leagueNightKey, localDateKey } from '../leagueNight';

describe('leagueNightKey', () => {
  it('reads the night in league time, not off the raw instant', () => {
    // A date-only column parses as UTC midnight, which is the evening before in
    // league time — the night the match was actually played.
    expect(leagueNightKey('2026-08-01')).toBe('2026-07-31');
  });

  it('puts a late evening game on the night it was played, not the next UTC day', () => {
    // 8 PM Eastern on 6 August is 00:00 UTC on 7 August.
    expect(leagueNightKey('2026-08-07T00:00:00Z')).toBe('2026-08-06');
  });

  it('keeps an afternoon game on its own day', () => {
    expect(leagueNightKey('2026-08-06T18:00:00Z')).toBe('2026-08-06');
  });

  it('pads the month and day so the keys sort', () => {
    expect(leagueNightKey('2026-01-05T18:00:00Z')).toBe('2026-01-05');
    expect(['2026-01-05', '2026-01-12'].sort()).toEqual(['2026-01-05', '2026-01-12']);
  });

  it('has no key for a match without a usable date', () => {
    expect(leagueNightKey(null)).toBeNull();
    expect(leagueNightKey(undefined)).toBeNull();
    expect(leagueNightKey('')).toBeNull();
    expect(leagueNightKey('not-a-date')).toBeNull();
  });
});

describe('formatLeagueNight', () => {
  it('writes a key the way the cards and the picker show it', () => {
    expect(formatLeagueNight('2026-07-31')).toBe('Jul 31, 2026');
    expect(formatLeagueNight('2026-01-05')).toBe('Jan 5, 2026');
  });
});

describe('localDateKey', () => {
  it('matches the key shape, so a default night lines up with the options', () => {
    expect(localDateKey(new Date(2026, 6, 31))).toBe('2026-07-31');
  });
});
