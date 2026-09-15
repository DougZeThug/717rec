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
   * True when the address named a usable date **at mount**. The page uses this
   * to leave its own "pick a sensible night" guess alone: a date in a link is a
   * chosen date.
   *
   * Deliberately not recomputed per render. The writer below always writes a
   * `date`, so a live reading would be true on the second commit of every
   * visit — including a bare `/schedule` — and the page's one-shot auto-pick
   * would never run (UX audit SC-01). It is therefore stale after a
   * same-route navigation, which is the lesser of the two wrongs.
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
 * The address is read into state at mount and again whenever it changes, and
 * written back whenever the screen changes — the same read-and-write pairing
 * `useCompareUrlState` uses. Every write replaces the current history entry
 * rather than adding one, so typing in the search box does not fill the Back
 * button with a step per keystroke.
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

  // Read the address back into state whenever it changes under us.
  //
  // Without this the hook was write-only after mount, so pressing "Schedule" in
  // the nav while already on a filtered week did nothing — the writer below
  // rebuilt the query string from stale state and put it straight back — and
  // Back and Forward between two `/schedule` entries were undone the same way.
  //
  // A parameter that is absent resets to its default rather than being left
  // alone. That is what makes a bare `/schedule` a reset: the nav links, the
  // bottom bar and the command palette all point at one.
  //
  // The date is compared by value. `parseDayKey` and `toLocalMidnight` both
  // allocate a fresh Date every call, so comparing by identity would set state
  // on every pass, write the address, come back here and do it again — a loop
  // that ends in a hung test rather than a clean failure.
  useEffect(() => {
    const incomingDate = parseDayKey(searchParams.get('date')) ?? toLocalMidnight(defaultDate());
    const incomingSearch = searchParams.get('q') ?? '';
    const incomingDivision = parseDivision(searchParams.get('division'));
    const incomingTeam = searchParams.get('team') === 'mine' ? 'mine' : 'all';

    // Syncing state from the address is what this effect is for. Each setter
    // returns the current value unchanged when it already matches, so a pass
    // that has nothing to apply schedules no render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDateState((current) =>
      current.getTime() === incomingDate.getTime() ? current : incomingDate
    );
    setSearchTerm((current) => (current === incomingSearch ? current : incomingSearch));
    setDivision((current) => (current === incomingDivision ? current : incomingDivision));
    setTeam((current) => (current === incomingTeam ? current : incomingTeam));
    // `defaultDate` is deliberately not a dependency: callers pass an inline
    // lambda, which would run this on every render of a hook that re-renders
    // per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    // Neither `searchParams` nor `setSearchParams` is a dependency. This effect
    // writes `searchParams`, so reacting to its own write would loop — and
    // `setSearchParams` is memoised on `searchParams`, so its identity changes
    // on every navigation. Leaving it in made a navigation re-run this effect
    // in the same pass the reader above ran, before that reader's state landed,
    // and write the stale values back over the address just navigated to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, searchTerm, division, team]);

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
