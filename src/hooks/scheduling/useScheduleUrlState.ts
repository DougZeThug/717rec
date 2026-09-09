import { format } from 'date-fns';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

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

interface ScheduleUrlState {
  selectedDate: Date;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  /**
   * True when the address named a usable date. The page uses this to leave its
   * own "pick a sensible night" guess alone: a date in a link is a chosen date.
   */
  hadDateInUrl: boolean;
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
 * its teams arrive after mount. This one does not: both values are seeded from
 * the address in the state initialisers, so the first write back is already what
 * came in. Every write replaces the current history entry rather than adding
 * one, so typing in the search box does not fill the Back button with a step per
 * keystroke.
 */
export const useScheduleUrlState = (defaultDate: () => Date): ScheduleUrlState => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [incoming] = useState(() => ({
    date: parseDayKey(searchParams.get('date')),
    search: searchParams.get('q') ?? '',
  }));

  const [selectedDate, setSelectedDate] = useState<Date>(() => incoming.date ?? defaultDate());
  const [searchTerm, setSearchTerm] = useState(incoming.search);

  // Keep the address in step with what is on screen. The date is always
  // written, even when the visit did not name one, so the night being looked at
  // can always be linked to or reloaded.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const dayKey = format(selectedDate, 'yyyy-MM-dd');

    next.set('date', dayKey);
    if (searchTerm) next.set('q', searchTerm);
    else next.delete('q');

    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
    // searchParams is deliberately not a dependency: this effect writes it, and
    // reacting to its own write would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, searchTerm, setSearchParams]);

  return {
    selectedDate,
    setSelectedDate,
    searchTerm,
    setSearchTerm,
    hadDateInUrl: incoming.date !== null,
  };
};
