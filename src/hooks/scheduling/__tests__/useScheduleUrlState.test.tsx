import { act, render, renderHook, screen } from '@testing-library/react';
import { format } from 'date-fns';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useScheduleUrlState } from '../useScheduleUrlState';

const DEFAULT_DATE = new Date(2026, 8, 10); // Thu 10 Sep 2026, local midnight.
const defaultDate = () => DEFAULT_DATE;

const wrapperFor = (initialPath: string) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>;
  };

const renderState = (initialPath = '/schedule') =>
  renderHook(() => useScheduleUrlState(defaultDate), { wrapper: wrapperFor(initialPath) });

describe('useScheduleUrlState', () => {
  it('opens on the guessed night when the address names none', () => {
    const { result } = renderState();

    expect(format(result.current.selectedDate, 'yyyy-MM-dd')).toBe('2026-09-10');
    expect(result.current.searchTerm).toBe('');
    expect(result.current.hadDateInUrl).toBe(false);
  });

  it('opens on the night in the address', () => {
    const { result } = renderState('/schedule?date=2026-09-03');

    expect(format(result.current.selectedDate, 'yyyy-MM-dd')).toBe('2026-09-03');
    expect(result.current.hadDateInUrl).toBe(true);
  });

  // The Date constructor would roll 31 February forward to March.
  it('ignores an address that names no real date', () => {
    expect(renderState('/schedule?date=not-a-date').result.current.hadDateInUrl).toBe(false);
    expect(renderState('/schedule?date=2026-02-31').result.current.hadDateInUrl).toBe(false);
    expect(renderState('/schedule?date=2026-9-3').result.current.hadDateInUrl).toBe(false);
  });

  it('reads the search text from the address', () => {
    const { result } = renderState('/schedule?q=amigos');

    expect(result.current.searchTerm).toBe('amigos');
  });

  // A midnight-local Date, never `new Date(string)`, or the night shifts by one
  // in timezones behind UTC.
  it('keeps the night in local time', () => {
    const { result } = renderState('/schedule?date=2026-09-03');

    expect(result.current.selectedDate.getHours()).toBe(0);
    expect(result.current.selectedDate.getDate()).toBe(3);
    expect(result.current.selectedDate.getMonth()).toBe(8);
  });
});

/** Reports the address so the writes can be checked. */
const Probe = () => {
  const state = useScheduleUrlState(defaultDate);
  const location = useLocation();
  return (
    <>
      <div data-testid="url">{location.pathname + location.search}</div>
      <button onClick={() => state.setSelectedDate(new Date(2026, 8, 3))}>pick night</button>
      <button onClick={() => state.setSearchTerm('amigos')}>search</button>
      <button onClick={() => state.setSearchTerm('')}>clear search</button>
      <button onClick={() => state.setDivision('intermediate')}>pick division</button>
      <button onClick={() => state.setDivision('all')}>every division</button>
      <button onClick={() => state.setTeam('mine')}>my team</button>
      <button onClick={() => state.clearFilters()}>clear filters</button>
      <div data-testid="has-filters">{state.hasFilters ? 'yes' : 'no'}</div>
    </>
  );
};

describe('useScheduleUrlState writes', () => {
  const renderProbe = (initialPath = '/schedule') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Probe />
      </MemoryRouter>
    );

  const url = () => screen.getByTestId('url').textContent;

  it('writes the night being looked at, so it can always be linked to', () => {
    renderProbe();

    expect(url()).toBe('/schedule?date=2026-09-10');
  });

  it('follows a night the visitor picks', () => {
    renderProbe();

    act(() => screen.getByText('pick night').click());

    expect(url()).toBe('/schedule?date=2026-09-03');
  });

  it('adds and removes the search text', () => {
    renderProbe('/schedule?date=2026-09-03');

    act(() => screen.getByText('search').click());
    expect(url()).toBe('/schedule?date=2026-09-03&q=amigos');

    act(() => screen.getByText('clear search').click());
    expect(url()).toBe('/schedule?date=2026-09-03');
  });

  // Typing must not fill the Back button with a step per keystroke.
  it('replaces the address rather than adding history', () => {
    renderProbe('/schedule?date=2026-09-03');

    act(() => screen.getByText('search').click());
    act(() => screen.getByText('pick night').click());

    // MemoryRouter starts at index 0; replace-mode writes keep it there.
    expect(window.history.length).toBeGreaterThan(0);
    expect(url()).toBe('/schedule?date=2026-09-03&q=amigos');
  });

  it('leaves an unrelated parameter alone', () => {
    renderProbe('/schedule?date=2026-09-03&ref=email');

    expect(url()).toContain('ref=email');
  });
});

describe('useScheduleUrlState date handling', () => {
  it('stores local midnight whatever time of day it is given', () => {
    const { result } = renderState();

    act(() => result.current.setSelectedDate(new Date(2026, 8, 3, 19, 30, 45)));

    expect(result.current.selectedDate.getHours()).toBe(0);
    expect(result.current.selectedDate.getMinutes()).toBe(0);
    expect(format(result.current.selectedDate, 'yyyy-MM-dd')).toBe('2026-09-03');
  });

  it('strips the time of day from the guessed night too', () => {
    const { result } = renderHook(() => useScheduleUrlState(() => new Date(2026, 8, 10, 14, 5)), {
      wrapper: wrapperFor('/schedule'),
    });

    expect(result.current.selectedDate.getHours()).toBe(0);
  });
});

describe('useScheduleUrlState filters', () => {
  const renderProbe = (initialPath = '/schedule') =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Probe />
      </MemoryRouter>
    );

  const url = () => screen.getByTestId('url').textContent;

  it('reads the division chip from the address', () => {
    const { result } = renderState('/schedule?division=intermediate');

    expect(result.current.division).toBe('intermediate');
    expect(result.current.hasFilters).toBe(true);
  });

  it('reads the my-team chip from the address', () => {
    const { result } = renderState('/schedule?team=mine');

    expect(result.current.team).toBe('mine');
    expect(result.current.hasFilters).toBe(true);
  });

  // Anything else in that parameter is not a division slug.
  it('ignores a division value that could not be one', () => {
    expect(renderState('/schedule?division=%3Cscript%3E').result.current.division).toBe('all');
    expect(renderState('/schedule?division=').result.current.division).toBe('all');
  });

  it('treats any other team value as everyone', () => {
    expect(renderState('/schedule?team=t-123').result.current.team).toBe('all');
  });

  it('writes a chip that is on, and no parameter at all for one that is off', () => {
    renderProbe();

    act(() => screen.getByText('pick division').click());
    expect(url()).toBe('/schedule?date=2026-09-10&division=intermediate');

    act(() => screen.getByText('every division').click());
    expect(url()).toBe('/schedule?date=2026-09-10');
  });

  it('writes both chips together', () => {
    renderProbe();

    act(() => screen.getByText('pick division').click());
    act(() => screen.getByText('my team').click());

    expect(url()).toBe('/schedule?date=2026-09-10&division=intermediate&team=mine');
  });

  it('clears both chips at once and leaves the night alone', () => {
    renderProbe('/schedule?date=2026-09-03&division=intermediate&team=mine');

    expect(screen.getByTestId('has-filters')).toHaveTextContent('yes');

    act(() => screen.getByText('clear filters').click());

    expect(url()).toBe('/schedule?date=2026-09-03');
    expect(screen.getByTestId('has-filters')).toHaveTextContent('no');
  });

  // One hook owns this address. A chip must never drop the night or the search.
  it('keeps the night and the search text when a chip changes', () => {
    renderProbe('/schedule?date=2026-09-03&q=amigos');

    act(() => screen.getByText('pick division').click());

    expect(url()).toBe('/schedule?date=2026-09-03&q=amigos&division=intermediate');
  });

  it('still leaves an unrelated parameter alone', () => {
    renderProbe('/schedule?date=2026-09-03&ref=email');

    act(() => screen.getByText('my team').click());

    expect(url()).toContain('ref=email');
    expect(url()).toContain('team=mine');
  });
});
