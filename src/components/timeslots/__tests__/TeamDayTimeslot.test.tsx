import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { TeamTimeslot } from '@/types';

import TeamDayTimeslot from '../TeamDayTimeslot';

const makeTimeslot = (overrides: Partial<TeamTimeslot> = {}): TeamTimeslot => ({
  id: 'ts-1',
  match_date: '2026-07-01',
  timeslot: '6:00 PM',
  team_id: 'team-1',
  created_at: '2026-06-01T00:00:00.000Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  ...overrides,
});

const DATE = new Date('2026-07-01T00:00:00');

describe('TeamDayTimeslot', () => {
  it('renders the shimmer skeleton (and no badge text) while loading', () => {
    const { container } = render(
      <TeamDayTimeslot teamId="team-1" date={DATE} timeslots={[]} isLoading />
    );

    // Skeleton is a bare div sized h-5 w-16 — assert it is present.
    expect(container.querySelector('.h-5.w-16')).toBeInTheDocument();
    // No badge/timeslot content should render in the loading branch.
    expect(screen.queryByText('6:00 PM')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders nothing when no timeslot matches the team', () => {
    const { container } = render(
      <TeamDayTimeslot
        teamId="team-1"
        date={DATE}
        timeslots={[makeTimeslot({ team_id: 'other-team', timeslot: '9:00 PM' })]}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('9:00 PM')).not.toBeInTheDocument();
  });

  it('renders the outline badge with the Clock icon and timeslot for the matching team', () => {
    const { container } = render(
      <TeamDayTimeslot
        teamId="team-1"
        date={DATE}
        timeslots={[
          makeTimeslot({ team_id: 'other-team', timeslot: '9:00 PM' }),
          makeTimeslot({ id: 'ts-2', team_id: 'team-1', timeslot: '6:00 PM' }),
        ]}
      />
    );

    // Matching team's timeslot text is shown.
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    // The non-matching team's timeslot must not appear.
    expect(screen.queryByText('9:00 PM')).not.toBeInTheDocument();
    // Clock icon renders as an svg inside the badge.
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
