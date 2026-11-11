import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScheduleTabs } from '../useScheduleTabs';

// Today is Tuesday 2026-11-10 in these tests. Last Thursday is 2026-11-05.
const TODAY = new Date(2026, 10, 10, 12, 0, 0);
const LAST_WEEK = new Date(2026, 10, 5);
const TWO_WEEKS_AGO = new Date(2026, 9, 29);

const UNSCORED = { id: 'unscored-past' };
const SCORED = { id: 'scored' };

type Props = Parameters<typeof useScheduleTabs>[0];

const baseProps: Props = {
  selectedDate: LAST_WEEK,
  matchesLoading: false,
  timeslotsLoading: false,
  upcomingMatches: [UNSCORED],
  completedMatches: [SCORED],
};

const renderTabs = (props: Partial<Props>) =>
  renderHook((p: Props) => useScheduleTabs(p), { initialProps: { ...baseProps, ...props } });

describe('useScheduleTabs', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens Completed for a past night with no link (the date rule)', () => {
    const { result } = renderTabs({});
    expect(result.current.activeTab).toBe('completed');
  });

  // (a) Doug, 2026-11-10: a link to last week's unscored match opens Upcoming,
  // where its card is, not Completed with no card.
  it('opens Upcoming for a link to a past match with no score', () => {
    const { result } = renderTabs({ linkedMatchId: UNSCORED.id });
    expect(result.current.activeTab).toBe('upcoming');
  });

  // (b)
  it('opens Completed for a link to a scored match', () => {
    const { result } = renderTabs({ linkedMatchId: SCORED.id });
    expect(result.current.activeTab).toBe('completed');
  });

  it('falls back to the date rule for an unknown match id', () => {
    const { result } = renderTabs({ linkedMatchId: 'not-a-match' });
    expect(result.current.activeTab).toBe('completed');
  });

  // (c) The hash stays in the address, so only the first pick may use it.
  it('ignores the link when the reader later changes the date', () => {
    const { result, rerender } = renderTabs({ linkedMatchId: UNSCORED.id });
    expect(result.current.activeTab).toBe('upcoming');

    rerender({ ...baseProps, linkedMatchId: UNSCORED.id, selectedDate: TWO_WEEKS_AGO });

    expect(result.current.activeTab).toBe('completed');
  });

  // (d) On league night the date rule says Upcoming; a finished match is under
  // Completed.
  it("opens Completed for tonight's scored match linked on today's date", () => {
    const tonight = new Date(2026, 10, 10);
    const { result } = renderTabs({
      selectedDate: tonight,
      upcomingMatches: [{ id: 'still-to-play' }],
      completedMatches: [SCORED],
      linkedMatchId: SCORED.id,
    });
    expect(result.current.activeTab).toBe('completed');
  });

  it('waits for the matches to load before it uses the link', () => {
    const { result, rerender } = renderTabs({
      matchesLoading: true,
      upcomingMatches: [],
      completedMatches: [],
      linkedMatchId: UNSCORED.id,
    });
    expect(result.current.activeTab).toBe('timeslots');

    rerender({ ...baseProps, linkedMatchId: UNSCORED.id });

    expect(result.current.activeTab).toBe('upcoming');
  });

  it('keeps a tab the reader picks', () => {
    const { result } = renderTabs({ linkedMatchId: UNSCORED.id });
    act(() => result.current.handleTabChange('timeslots'));
    expect(result.current.activeTab).toBe('timeslots');
    expect(sessionStorage.getItem('scheduleActiveTab')).toBe('timeslots');
  });

  // Today or a future night with no matches to play yet → the timeslots tab.
  it('opens Timeslots for today when there are no upcoming matches', () => {
    sessionStorage.setItem('scheduleActiveTab', 'completed');
    const { result } = renderTabs({
      selectedDate: new Date(2026, 10, 10),
      upcomingMatches: [],
      completedMatches: [],
    });
    expect(result.current.activeTab).toBe('timeslots');
    expect(sessionStorage.getItem('scheduleActiveTab')).toBe('timeslots');
  });

  it('opens Timeslots for a future night before its matches exist', () => {
    const { result } = renderTabs({
      selectedDate: new Date(2026, 10, 19),
      upcomingMatches: undefined,
      completedMatches: [],
    });
    expect(result.current.activeTab).toBe('timeslots');
  });
});
