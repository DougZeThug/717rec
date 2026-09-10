import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation, useSearchParams } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useTimeslotPrefill } from '../useTimeslotPrefill';

const TEAM_ID = '3f1b2c8e-5a41-4c9d-9f2a-77b0d6e8c123';
const OTHER_TEAM_ID = '8c2d4a19-6b03-4f77-a1e5-902c4b7d3e81';

const renderPrefill = (entry: string) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );

  return renderHook(
    () => {
      const [, setSearchParams] = useSearchParams();
      return {
        prefill: useTimeslotPrefill(),
        search: useLocation().search,
        /** Stands in for a second approval changing only the query string. */
        setSearch: (next: string) => setSearchParams(new URLSearchParams(next)),
      };
    },
    { wrapper }
  );
};

describe('useTimeslotPrefill', () => {
  it('reads the night, the team and the block out of the address', () => {
    const { result } = renderPrefill(
      `/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00%20PM`
    );

    expect(result.current.prefill.teamId).toBe(TEAM_ID);
    expect(result.current.prefill.slot).toBe('7:00 PM');
    expect(result.current.prefill.hasPrefill).toBe(true);
  });

  // Noon, not midnight: the night is later combined with a time of day, and a
  // midnight base is one daylight-saving hour from becoming the day before.
  it('reads the night as local noon on the day named', () => {
    const { result } = renderPrefill(`/admin/timeslots?date=2026-09-17&team=${TEAM_ID}`);
    const night = result.current.prefill.date as Date;

    expect(night.getFullYear()).toBe(2026);
    expect(night.getMonth()).toBe(8);
    expect(night.getDate()).toBe(17);
    expect(night.getHours()).toBe(12);
  });

  it('ignores a day that does not exist', () => {
    const { result } = renderPrefill(`/admin/timeslots?date=2026-02-31&team=${TEAM_ID}`);

    expect(result.current.prefill.date).toBeNull();
  });

  it.each(['not-a-date', '17-09-2026', ''])('ignores %s as a night', (value) => {
    const { result } = renderPrefill(`/admin/timeslots?date=${value}&team=${TEAM_ID}`);

    expect(result.current.prefill.date).toBeNull();
  });

  it('ignores a team that is not an id', () => {
    const { result } = renderPrefill('/admin/timeslots?date=2026-09-17&team=3-amigos');

    expect(result.current.prefill.teamId).toBeNull();
    expect(result.current.prefill.hasPrefill).toBe(false);
  });

  // Only a time that starts a block can be booked. 9:30 PM is a real stored
  // time and starts none, so it is not accepted as an instruction.
  it.each(['9:30 PM', '7ish', 'BYE WEEK', 'lunchtime'])('ignores %s as a block', (value) => {
    const { result } = renderPrefill(
      `/admin/timeslots?team=${TEAM_ID}&slot=${encodeURIComponent(value)}`
    );

    expect(result.current.prefill.slot).toBeNull();
  });

  it('accepts a bye', () => {
    const { result } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&slot=BYE`);

    expect(result.current.prefill.slot).toBe('BYE');
  });

  it('takes the instruction out of the address when it is cleared', () => {
    const { result } = renderPrefill(
      `/admin/timeslots?date=2026-09-17&team=${TEAM_ID}&slot=7%3A00%20PM`
    );

    act(() => result.current.prefill.clear());

    expect(result.current.search).toBe('');
    expect(result.current.prefill.hasPrefill).toBe(false);
    expect(result.current.prefill.teamId).toBeNull();
  });

  it('leaves anything else in the address alone', () => {
    const { result } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&keep=this`);

    act(() => result.current.prefill.clear());

    expect(result.current.search).toBe('?keep=this');
  });

  // Clearing takes the instruction out of the address, so re-reading it cannot
  // put a dismissed card back — the instruction is gone, not just ignored.
  it('stays cleared even though the address is read on every render', () => {
    const { result, rerender } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&slot=BYE`);

    act(() => result.current.prefill.clear());
    rerender();

    expect(result.current.prefill.hasPrefill).toBe(false);
  });

  // A second approval can arrive while Timeslots is already open. Reading the
  // address once left it changed with nothing on screen.
  it('picks up a second instruction without being remounted', () => {
    const { result } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&slot=BYE`);

    act(() => result.current.prefill.clear());
    expect(result.current.prefill.hasPrefill).toBe(false);

    act(() => result.current.setSearch(`?date=2026-09-24&team=${OTHER_TEAM_ID}&slot=7%3A00%20PM`));

    expect(result.current.prefill.hasPrefill).toBe(true);
    expect(result.current.prefill.teamId).toBe(OTHER_TEAM_ID);
    expect(result.current.prefill.slot).toBe('7:00 PM');
    expect(result.current.prefill.dateKey).toBe('2026-09-24');
  });

  it('carries the words a team used when they name no block', () => {
    const { result } = renderPrefill(
      `/admin/timeslots?team=${TEAM_ID}&asked=${encodeURIComponent('as early as possible')}`
    );

    expect(result.current.prefill.askedFor).toBe('as early as possible');
    expect(result.current.prefill.slot).toBeNull();
  });

  it('takes the words out of the address along with the rest', () => {
    const { result } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&asked=7ish`);

    act(() => result.current.prefill.clear());

    expect(result.current.search).toBe('');
    expect(result.current.prefill.askedFor).toBeNull();
  });

  it('reports no night when the address names none', () => {
    const { result } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}`);

    expect(result.current.prefill.dateKey).toBeNull();
  });
});
