import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { DOUBLE_HEADER_START_TIMES } from '@/utils/autoSchedule/constants';
import { BYE_SLOT } from '@/utils/timeslotMove';
import { isValidUuidSafe } from '@/utils/uuidValidation';

/** The instruction another section can hand to Timeslots. */
export interface TimeslotPrefill {
  /** The night to open on, at local noon, or null. */
  date: Date | null;
  /** That night as `yyyy-MM-dd`, for telling one instruction from the next. */
  dateKey: string | null;
  /** The team the work is about, or null. */
  teamId: string | null;
  /** A block's first time or `BYE`, or null when no block was named. */
  slot: string | null;
  /** What the team actually asked for, when it could not be read as a block. */
  askedFor: string | null;
  /** True when the address names a team, which is what raises the card. */
  hasPrefill: boolean;
  /** Take the instruction out of the address, once it has been carried out. */
  clear: () => void;
}

const DATE_PARAM = 'date';
const TEAM_PARAM = 'team';
const SLOT_PARAM = 'slot';
const ASKED_PARAM = 'asked';

const PREFILL_PARAMS = [DATE_PARAM, TEAM_PARAM, SLOT_PARAM, ASKED_PARAM];

/** As much of a team's own words as is worth putting in an address. */
const ASKED_MAX_LENGTH = 80;

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
 * The address **is** the instruction, so it is read on every render rather than
 * once: `clear()` takes the instruction out of the address, which is what makes
 * a dismissed card stay dismissed, and a second approval arriving while this
 * section is already open then puts a fresh instruction in and is seen.
 * (Reading once instead looked equivalent and was not: it left the second
 * approval with a changed address and nothing on screen.)
 */
export const useTimeslotPrefill = (): TimeslotPrefill => {
  const [searchParams, setSearchParams] = useSearchParams();

  const dateKey = searchParams.get(DATE_PARAM);
  const teamParam = searchParams.get(TEAM_PARAM);
  const slotParam = searchParams.get(SLOT_PARAM);
  const askedParam = searchParams.get(ASKED_PARAM);

  const clear = useCallback(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        PREFILL_PARAMS.forEach((param) => next.delete(param));
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  return useMemo(() => {
    const night = parseNight(dateKey);
    const teamId = isValidUuidSafe(teamParam) ? teamParam : null;
    const asked = askedParam?.trim().slice(0, ASKED_MAX_LENGTH) || null;

    return {
      date: night,
      dateKey: night ? dateKey : null,
      teamId,
      slot: parseSlot(slotParam),
      askedFor: asked,
      hasPrefill: teamId !== null,
      clear,
    };
  }, [dateKey, teamParam, slotParam, askedParam, clear]);
};
