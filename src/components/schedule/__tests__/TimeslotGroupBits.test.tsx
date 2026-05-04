import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { TimeslotMatchRowMobile } from '@/components/schedule/timeslot-grouping/TimeslotGroupBits';
import { TeamTimeslot } from '@/types';

const base: TeamTimeslot = {
  id: '1',
  timeslot: '7:00 PM',
  team_id: 't1',
  match_date: '2026-05-01',
  created_at: '2026-05-01',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: 1,
  teams: { id: 't1', name: '', divisionName: null },
};

describe('TimeslotMatchRowMobile', () => {
  it('does not create a team link when team name is missing', () => {
    render(<TimeslotMatchRowMobile teamTimeslot={base} isWinterTheme={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows double-header badge on mobile rows', () => {
    const ts = { ...base, is_double_header: true, teams: { ...base.teams!, name: 'Team One' } };
    const dhInfo = new Map([['t1', { slot1: '7:00 PM', slot2: '9:00 PM' }]]);
    render(
      <MemoryRouter>
        <TimeslotMatchRowMobile teamTimeslot={ts} isWinterTheme={false} doubleHeaderInfo={dhInfo} />
      </MemoryRouter>
    );
    expect(screen.getByText(/DH 7:00 PM\/9:00 PM/)).toBeInTheDocument();
  });
});
