import { act, renderHook } from '@testing-library/react';

import { useTimeslotGrouping } from '@/components/schedule/timeslot-grouping/useTimeslotGrouping';
import { TeamTimeslot } from '@/types';

const makeSlot = (id: string, timeslot: string, teamId: string, seq = 1, isDh = false): TeamTimeslot => ({
  id,
  timeslot,
  team_id: teamId,
  match_date: '2026-05-01',
  created_at: '2026-05-01',
  is_back_to_back: false,
  is_double_header: isDh,
  pair_slot: null,
  match_sequence: seq,
  teams: { id: teamId, name: teamId, divisionName: null },
});

describe('useTimeslotGrouping', () => {
  it('groups by timeslot key and deduplicates double headers to first slot', () => {
    const grouped = {
      '8:00 PM': [makeSlot('1', '8:00 PM', 'A', 2, true)],
      '7:00 PM': [makeSlot('2', '7:00 PM', 'A', 1, true), makeSlot('3', '7:00 PM', 'B')],
    };

    const { result } = renderHook(() => useTimeslotGrouping(grouped));

    expect(result.current.regularTimeslots[0].timeslot).toBe('7:00 PM');
    expect(result.current.regularTimeslots[0].teams.map((t) => t.team_id)).toEqual(['A', 'B']);
    expect(result.current.regularTimeslots[1].teams).toEqual([]);
  });

  it('sorts deterministically with BYE last', () => {
    const grouped = { BYE: [makeSlot('1', 'BYE', 'A')], '9:00 PM': [makeSlot('2', '9:00 PM', 'B')], '7:00 PM': [makeSlot('3', '7:00 PM', 'C')] };
    const { result } = renderHook(() => useTimeslotGrouping(grouped));
    expect(result.current.regularTimeslots.map((t) => t.timeslot)).toEqual(['7:00 PM', '9:00 PM']);
    expect(result.current.byeWeekTimeslots.map((t) => t.timeslot)).toEqual(['BYE']);
  });

  it('defaults only first sorted group expanded and toggles state', () => {
    const grouped = { '9:00 PM': [makeSlot('2', '9:00 PM', 'B')], '7:00 PM': [makeSlot('3', '7:00 PM', 'C')] };
    const { result } = renderHook(() => useTimeslotGrouping(grouped));

    expect(result.current.expandedTimeslots['7:00 PM']).toBe(true);
    expect(result.current.expandedTimeslots['9:00 PM']).toBe(false);

    act(() => result.current.toggleTimeslot('9:00 PM'));
    expect(result.current.expandedTimeslots['9:00 PM']).toBe(true);
  });
});
