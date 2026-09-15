import { describe, expect, it } from 'vitest';

import { leagueToday, pickDefaultSignupNight, signupNights } from '../signupNights';

const signup = (event_date: string | null) => ({ event_date });

describe('signupNights', () => {
  it('lists each night once, most recent first', () => {
    expect(
      signupNights([
        signup('2026-09-18'),
        signup('2026-09-25'),
        signup('2026-09-18'),
        signup('2026-09-11'),
      ])
    ).toEqual(['2026-09-25', '2026-09-18', '2026-09-11']);
  });

  it('skips a row with no date rather than offering a blank night', () => {
    expect(signupNights([signup('2026-09-18'), signup(null), signup(undefined as never)])).toEqual([
      '2026-09-18',
    ]);
  });

  it('has nothing to offer for an empty list', () => {
    expect(signupNights([])).toEqual([]);
  });
});

describe('pickDefaultSignupNight', () => {
  const nights = ['2026-09-25', '2026-09-18', '2026-09-11'];

  it('opens on tonight when tonight has signups', () => {
    expect(pickDefaultSignupNight(nights, '2026-09-18')).toBe('2026-09-18');
  });

  it('opens on the next night, not the furthest one, when several are ahead', () => {
    expect(pickDefaultSignupNight(nights, '2026-09-15')).toBe('2026-09-18');
  });

  // Signups are collected before a night is played, so the useful default is
  // the one still to come — the opposite of mass score entry's.
  it('opens on the soonest night when every night is ahead', () => {
    expect(pickDefaultSignupNight(nights, '2026-09-01')).toBe('2026-09-11');
  });

  it('falls back to the most recent night once they have all passed', () => {
    expect(pickDefaultSignupNight(nights, '2026-10-01')).toBe('2026-09-25');
  });

  it('has no default when nobody has signed up', () => {
    expect(pickDefaultSignupNight([], '2026-09-18')).toBeNull();
  });
});

describe('leagueToday', () => {
  it('reads the league calendar date, not the browser one', () => {
    // 01:30 UTC on the 19th is still the evening of the 18th in league time.
    expect(leagueToday(new Date('2026-09-19T01:30:00.000Z'))).toBe('2026-09-18');
  });

  it('formats as a YYYY-MM-DD key, zero-padded', () => {
    expect(leagueToday(new Date('2026-03-05T18:00:00.000Z'))).toBe('2026-03-05');
  });
});
