import { format } from 'date-fns';
import { describe, expect, it } from 'vitest';

import {
  isLeagueNightNow,
  LIVE_REFETCH_MS,
  liveRefetchInterval,
  nextThursday,
} from '../leagueNight';
import { getLeagueMidnightUtc } from '../timezone';

/**
 * A fixed instant, named by the wall clock in league time.
 *
 * The inputs cannot be plain local-time dates: `nextThursday` answers in league
 * time now, and 9 AM on a Friday in Tokyo is 8 PM on the Thursday in league
 * time — a night in progress, not the one after it. Anchoring to league time
 * makes every case below mean the same thing in every runner timezone.
 */
const leagueTime = (year: number, month: number, day: number, hour = 9) =>
  new Date(getLeagueMidnightUtc(year, month, day).getTime() + hour * 60 * 60 * 1000);

/** The key the admin screens actually store and query `match_date` on. */
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

describe('nextThursday', () => {
  it('jumps forward from a Monday', () => {
    expect(dayKey(nextThursday(leagueTime(2026, 9, 7)))).toBe('2026-09-10');
  });

  it('stays on today when today is league night', () => {
    expect(dayKey(nextThursday(leagueTime(2026, 9, 10, 19)))).toBe('2026-09-10');
  });

  it('goes to next week from a Friday', () => {
    expect(dayKey(nextThursday(leagueTime(2026, 9, 11)))).toBe('2026-09-17');
  });

  it('crosses a month end', () => {
    expect(dayKey(nextThursday(leagueTime(2026, 9, 29)))).toBe('2026-10-01');
  });

  it('sets noon, so combining it with a time of day cannot slip a day', () => {
    const result = nextThursday(leagueTime(2026, 9, 7, 23));
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  // The night is decided in league time, so every admin agrees on it wherever
  // they are. Reading the browser's own day instead sent anyone east of Eastern
  // a week forward: at 8:30 PM Eastern on a Thursday — mid-session — it is
  // already Friday in UTC, and Friday's answer is next week.
  //
  // Spelled as raw UTC instants rather than via the helper above, so the case
  // that used to fail is legible without working the conversion out.
  describe('decides the night in league time, not the browser timezone', () => {
    // Thursday 1 Oct 2026, 8:30 PM Eastern. The session is being played.
    const duringThursdayEvening = new Date('2026-10-02T00:30:00Z');

    it('stays on the league night that is being played', () => {
      expect(dayKey(nextThursday(duringThursdayEvening))).toBe('2026-10-01');
    });

    it('sets noon on that night', () => {
      const result = nextThursday(duringThursdayEvening);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    // Half past midnight Eastern: it is Friday in league time too now, and only
    // then does the answer move on.
    it('moves to next week once league time is past midnight', () => {
      expect(dayKey(nextThursday(new Date('2026-10-02T04:30:00Z')))).toBe('2026-10-08');
    });
  });
});

describe('isLeagueNightNow', () => {
  // 2026-10-08 is a Thursday.
  it('is true on Thursday evening in league time', () => {
    expect(isLeagueNightNow(leagueTime(2026, 10, 8, 20))).toBe(true);
    expect(isLeagueNightNow(leagueTime(2026, 10, 8, 16))).toBe(true);
    expect(isLeagueNightNow(leagueTime(2026, 10, 8, 23))).toBe(true);
  });

  it('is false on Thursday before the evening', () => {
    expect(isLeagueNightNow(leagueTime(2026, 10, 8, 9))).toBe(false);
    expect(isLeagueNightNow(leagueTime(2026, 10, 8, 15))).toBe(false);
  });

  it('is false on other days, even in the evening', () => {
    expect(isLeagueNightNow(leagueTime(2026, 10, 7, 20))).toBe(false);
    expect(isLeagueNightNow(leagueTime(2026, 10, 9, 20))).toBe(false);
  });

  it('is false once league time is past midnight, even though a UTC clock still says Thursday', () => {
    // 2026-10-09 03:30 UTC is 11:30 PM Thursday in league time (EDT)...
    expect(isLeagueNightNow(new Date('2026-10-09T03:30:00Z'))).toBe(true);
    // ...and 04:30 UTC is 12:30 AM Friday.
    expect(isLeagueNightNow(new Date('2026-10-09T04:30:00Z'))).toBe(false);
  });
});

describe('liveRefetchInterval', () => {
  it('polls every minute on league night', () => {
    expect(liveRefetchInterval(leagueTime(2026, 10, 8, 20))).toBe(LIVE_REFETCH_MS);
  });

  it('waits exactly until 4 PM when league night is less than an hour away', () => {
    // 3:20 PM Thursday: 40 minutes to go. Returning `false` here is the bug: the
    // page would never wake up to start polling.
    const threeTwenty = new Date(leagueTime(2026, 10, 8, 15).getTime() + 20 * 60 * 1000);
    expect(liveRefetchInterval(threeTwenty)).toBe(40 * 60 * 1000);
  });

  it('checks again within an hour when league night is further away', () => {
    expect(liveRefetchInterval(leagueTime(2026, 10, 6, 20))).toBe(60 * 60 * 1000);
    expect(liveRefetchInterval(leagueTime(2026, 10, 8, 9))).toBe(60 * 60 * 1000);
  });

  it('never returns less than a minute, so it cannot spin', () => {
    const justBefore = new Date(leagueTime(2026, 10, 8, 16).getTime() - 1000);
    expect(liveRefetchInterval(justBefore)).toBe(LIVE_REFETCH_MS);
  });
});
