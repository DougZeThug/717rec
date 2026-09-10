import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';

import { DOUBLE_HEADER_START_TIMES } from '@/utils/autoSchedule/constants';
import { BYE_SLOT } from '@/utils/timeslotMove';
import { isValidUuidSafe } from '@/utils/uuidValidation';

/** The three things another section can hand to Timeslots. */
export interface TimeslotPrefill {
  /** The night to open on, at local noon, or null. */
  date: Date | null;
  /** The team the work is about, or null. */
  teamId: string | null;
  /** A block's first time or `BYE`, or null when the request could not name one. */
  slot: string | null;
  /** True when the address named a team, which is what raises the card. */
  hasPrefill: boolean;
  /** Take the instruction out of the address, once it has been carried out. */
  clear: () => void;
}

const DATE_PARAM = 'date';
const TEAM_PARAM = 'team';
const SLOT_PARAM = 'slot';

/**
 * 'yyyy-MM-dd' as local **noon**, or null when the text is not a real day.
 *
 * Noon rather than midnight for the reason `nextThursday` gives: the date is
 * later combined with a time of day, and a midnight base is one daylight-saving
 * hour away from becoming the day before. Never `new Date(text)`, which would
 * read the day as UTC and shift the night in half the world.
 */
const parseNight = (key: string | null): Date | null => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;

  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  // Rejects 2026-02-31 and friends, which Date would roll forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

/** Only a time that starts a block, or a bye, can be booked. */
const parseSlot = (raw: string | null): string | null => {
  if (!raw) return null;
  if (raw === BYE_SLOT) return BYE_SLOT;
  return DOUBLE_HEADER_START_TIMES.includes(raw) ? raw : null;
};

/**
 * The night, team and block another admin section asked Timeslots to open on.
 *
 * Read **once, on arrival**. The address here is a one-shot instruction rather
 * than a record of what is on screen: re-reading it would put the card back
 * under an admin who had just dismissed it, and writing to it would turn the
 * Timeslots date into URL state, which is its own change with its own rules.
 * `clear()` takes the instruction out of the address so a reload does not
 * repeat it.
 */
export const useTimeslotPrefill = (): TimeslotPrefill => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [prefill] = useState(() => {
    const teamId = searchParams.get(TEAM_PARAM);
    return {
      date: parseNight(searchParams.get(DATE_PARAM)),
      teamId: isValidUuidSafe(teamId) ? teamId : null,
      slot: parseSlot(searchParams.get(SLOT_PARAM)),
    };
  });

  const [isCleared, setIsCleared] = useState(false);

  const clear = useCallback(() => {
    setIsCleared(true);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(DATE_PARAM);
        next.delete(TEAM_PARAM);
        next.delete(SLOT_PARAM);
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  return {
    ...prefill,
    // The date stays available after clearing: the screen keeps showing the
    // night that was worked on, it just stops being told to act on it.
    teamId: isCleared ? null : prefill.teamId,
    slot: isCleared ? null : prefill.slot,
    hasPrefill: !isCleared && prefill.teamId !== null,
    clear,
  };
};
