import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useTimeslotPrefill } from '../useTimeslotPrefill';

const TEAM_ID = '3f1b2c8e-5a41-4c9d-9f2a-77b0d6e8c123';

const renderPrefill = (entry: string) => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  );

  return renderHook(() => ({ prefill: useTimeslotPrefill(), search: useLocation().search }), {
    wrapper,
  });
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

  // The address is an instruction, not a record of what is on screen. Reading
  // it again would put the card back under an admin who just dismissed it.
  it('stays cleared even though the address is read on every render', () => {
    const { result, rerender } = renderPrefill(`/admin/timeslots?team=${TEAM_ID}&slot=BYE`);

    act(() => result.current.prefill.clear());
    rerender();

    expect(result.current.prefill.hasPrefill).toBe(false);
  });
});
