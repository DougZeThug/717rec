import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import React from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useScheduleUrlState } from '../useScheduleUrlState';

const DEFAULT_DATE = new Date(2026, 8, 10); // Thu 10 Sep 2026, local midnight.
const DEFAULT_KEY = format(DEFAULT_DATE, 'yyyy-MM-dd');
const defaultDate = () => DEFAULT_DATE;

/**
 * Reports the address and the on-screen state, and offers the two navigations
 * the bug is about: a same-route push (what the "Schedule" nav link does) and a
 * real history step back.
 */
const Probe = () => {
  const state = useScheduleUrlState(defaultDate);
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="url">{location.pathname + location.search}</div>
      <div data-testid="date">{format(state.selectedDate, 'yyyy-MM-dd')}</div>
      <div data-testid="search">{state.searchTerm}</div>
      <div data-testid="division">{state.division}</div>
      <div data-testid="team">{state.team}</div>
      <button onClick={() => navigate('/schedule')}>nav schedule</button>
      <button onClick={() => navigate('/schedule?date=2026-09-17')}>nav other night</button>
      <button onClick={() => navigate('/schedule?division=advanced')}>nav division</button>
      <button onClick={() => navigate(-1)}>back</button>
    </>
  );
};

/** The same probe, but with the default night supplied by the test. */
const CountingProbe = ({ defaultDate: supplied }: { defaultDate: () => Date }) => {
  const state = useScheduleUrlState(supplied);
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="date">{format(state.selectedDate, 'yyyy-MM-dd')}</div>
      <button onClick={() => navigate('/schedule')}>nav schedule</button>
    </>
  );
};

const renderProbe = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Probe />
    </MemoryRouter>
  );

describe('useScheduleUrlState same-route navigation', () => {
  it('resets the week when the Schedule nav link is pressed on a filtered page', () => {
    // The nav link, the bottom bar and the command palette all point at a bare
    // `/schedule`. The hook used to read the address once at mount and then
    // write its stale copy straight back, so pressing any of them while already
    // on the Schedule page did nothing at all.
    renderProbe('/schedule?date=2026-09-03&q=amigos&division=intermediate&team=mine');
    expect(screen.getByTestId('date')).toHaveTextContent('2026-09-03');

    fireEvent.click(screen.getByText('nav schedule'));

    expect(screen.getByTestId('date')).toHaveTextContent(DEFAULT_KEY);
    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(screen.getByTestId('division')).toHaveTextContent('all');
    expect(screen.getByTestId('team')).toHaveTextContent('all');
    expect(screen.getByTestId('url')).toHaveTextContent(`/schedule?date=${DEFAULT_KEY}`);
  });

  it('follows a same-route link to another night', () => {
    renderProbe('/schedule?date=2026-09-03');

    fireEvent.click(screen.getByText('nav other night'));

    expect(screen.getByTestId('date')).toHaveTextContent('2026-09-17');
    expect(screen.getByTestId('url')).toHaveTextContent('/schedule?date=2026-09-17');
  });

  it('takes a chip from the address and resets the night the link did not name', () => {
    renderProbe('/schedule?date=2026-09-03');

    fireEvent.click(screen.getByText('nav division'));

    expect(screen.getByTestId('division')).toHaveTextContent('advanced');
    expect(screen.getByTestId('date')).toHaveTextContent(DEFAULT_KEY);
  });

  it('settles after a navigation instead of writing the address over and over', () => {
    // `parseDayKey` and `toLocalMidnight` allocate a fresh Date each call, so a
    // reader comparing dates by identity would set state, write the address,
    // read it back and set state again for ever. This is the canary for that.
    // The reader asks for the default night on every pass where the address
    // names none, so counting those calls counts the passes.
    const countedDefault = vi.fn(() => DEFAULT_DATE);
    render(
      <MemoryRouter initialEntries={['/schedule?date=2026-09-03&q=amigos']}>
        <CountingProbe defaultDate={countedDefault} />
      </MemoryRouter>
    );
    const before = countedDefault.mock.calls.length;

    fireEvent.click(screen.getByText('nav schedule'));

    expect(countedDefault.mock.calls.length - before).toBeLessThan(10);
  });
});

describe('useScheduleUrlState history traversal', () => {
  it('honours Back to an earlier schedule week', () => {
    renderProbe('/schedule?date=2026-09-03');
    fireEvent.click(screen.getByText('nav other night'));
    expect(screen.getByTestId('date')).toHaveTextContent('2026-09-17');

    fireEvent.click(screen.getByText('back'));

    expect(screen.getByTestId('date')).toHaveTextContent('2026-09-03');
    expect(screen.getByTestId('url')).toHaveTextContent('/schedule?date=2026-09-03');
  });
});
