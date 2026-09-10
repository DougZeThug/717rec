import { format } from 'date-fns';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Local midnight on the same day, with any time of day stripped.
 *
 * Never `new Date(iso)`: the day this page shows is the local one, and the
 * `yyyy-MM-dd` it writes to the address must round-trip to the same night in
 * every timezone.
 */
const toLocalMidnight = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** 'yyyy-MM-dd' as a local-midnight Date, or null when the text is not one. */
const parseDayKey = (key: string | null): Date | null => {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  // Rejects 2026-02-31 and friends, which Date would roll forward.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

/** A display division, lowercased, or every division. */
export type DivisionFilter = 'all' | string;

/** Only the signed-in member's own matches, or everyone's. */
export type TeamFilter = 'all' | 'mine';

/** Anything that is not a plausible division slug is not one. */
const parseDivision = (raw: string | null): DivisionFilter =>
  raw && /^[a-z0-9][a-z0-9 -]{0,48}$/.test(raw) ? raw : 'all';

interface ScheduleUrlState {
  selectedDate: Date;
  /** Stores local midnight on the given day, whatever time of day it carries. */
  setSelectedDate: (date: Date) => void;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  /**
   * True when the address named a usable date. The page uses this to leave its
   * own "pick a sensible night" guess alone: a date in a link is a chosen date.
   */
  hadDateInUrl: boolean;
  /**
   * The division chip, as its lowercased label. A value naming no real division
   * simply filters nothing — the chip row shows "All" — rather than being
   * rewritten, which would mean an effect writing the address on first paint.
   */
  division: DivisionFilter;
  setDivision: (division: DivisionFilter) => void;
  /** Whether the week is narrowed to the signed-in member's own team. */
  team: TeamFilter;
  setTeam: (team: TeamFilter) => void;
  /** True when a division or team chip is on, for the "nothing matches" state. */
  hasFilters: boolean;
  clearFilters: () => void;
}

/**
 * Keeps the chosen night and the search text in the address.
 *
 * `/schedule` used to carry nothing, so the date and the search reset on every
 * visit and a link to a particular night could not be shared — which is also
 * why Home's "my match" row could only point at a bare `/schedule`. See UX audit
 * SC-04 and X-14.
 *
 * `useCompareUrlState` needs a guard against writing before it has read, because
 * its teams arrive after mount. This one does not: every value is seeded from
 * the address in the state initialisers, so the first write back is already what
 * came in. Every write replaces the current history entry rather than adding
 * one, so typing in the search box does not fill the Back button with a step per
 * keystroke.
 *
 * The division and "my team" chips (UX audit SC-02) live here too rather than in
 * a hook of their own: this effect rebuilds the whole query string from what is
 * on screen, so a second writer doing the same would drop whichever parameter it
 * did not know about. One writer, one address.
 */
export const useScheduleUrlState = (defaultDate: () => Date): ScheduleUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [incoming] = useState(() => ({
    date: parseDayKey(searchParams.get('date')),
    search: searchParams.get('q') ?? '',
    division: parseDivision(searchParams.get('division')),
    team: searchParams.get('team') === 'mine' ? ('mine' as const) : ('all' as const),
  }));

  const [selectedDate, setSelectedDateState] = useState<Date>(
    () => incoming.date ?? toLocalMidnight(defaultDate())
  );

  const setSelectedDate = useCallback(
    (date: Date) => setSelectedDateState(toLocalMidnight(date)),
    []
  );
  const [searchTerm, setSearchTerm] = useState(incoming.search);
  const [division, setDivision] = useState<DivisionFilter>(incoming.division);
  const [team, setTeam] = useState<TeamFilter>(incoming.team);

  const clearFilters = useCallback(() => {
    setDivision('all');
    setTeam('all');
  }, []);

  // Keep the address in step with what is on screen. The date is always
  // written, even when the visit did not name one, so the night being looked at
  // can always be linked to or reloaded.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const dayKey = format(selectedDate, 'yyyy-MM-dd');

    next.set('date', dayKey);
    if (searchTerm) next.set('q', searchTerm);
    else next.delete('q');
    // A filter that is off is written as no parameter at all, so a plain
    // `/schedule?date=…` link is what an unfiltered week looks like.
    if (division !== 'all') next.set('division', division);
    else next.delete('division');
    if (team === 'mine') next.set('team', 'mine');
    else next.delete('team');

    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
    // searchParams is deliberately not a dependency: this effect writes it, and
    // reacting to its own write would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, searchTerm, division, team, setSearchParams]);

  return {
    selectedDate,
    setSelectedDate,
    searchTerm,
    setSearchTerm,
    hadDateInUrl: incoming.date !== null,
    division,
    setDivision,
    team,
    setTeam,
    hasFilters: division !== 'all' || team === 'mine',
    clearFilters,
  };
};
