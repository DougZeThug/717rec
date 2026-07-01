import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamTimeslot } from '@/types';

const mockUseWeekTimeslotsByTeam = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useWeekTimeslotsByTeam', () => ({
  useWeekTimeslotsByTeam: (...args: unknown[]) => mockUseWeekTimeslotsByTeam(...args),
}));

import WeekTimeslotDisplay from '../WeekTimeslotDisplay';

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

describe('WeekTimeslotDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWeekTimeslotsByTeam.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders the loading state while timeslots are being fetched', () => {
    mockUseWeekTimeslotsByTeam.mockReturnValue({ data: [], isLoading: true });
    render(<WeekTimeslotDisplay teamId="team-1" />);

    expect(screen.getByText('Loading timeslots...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    // Must not fall through to the empty/data states.
    expect(screen.queryByText('No timeslots assigned this week')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no timeslots this week', () => {
    mockUseWeekTimeslotsByTeam.mockReturnValue({ data: [], isLoading: false });
    render(<WeekTimeslotDisplay teamId="team-1" />);

    expect(screen.getByText("This Week's Timeslot")).toBeInTheDocument();
    expect(screen.getByText('No timeslots assigned this week')).toBeInTheDocument();
    expect(screen.queryByText('Loading timeslots...')).not.toBeInTheDocument();
  });

  it('renders a single timeslot with the singular title', () => {
    mockUseWeekTimeslotsByTeam.mockReturnValue({
      data: [makeTimeslot({ id: 'ts-1', timeslot: '6:00 PM', match_date: '2026-07-01' })],
      isLoading: false,
    });
    render(<WeekTimeslotDisplay teamId="team-1" />);

    expect(screen.getByText("This Week's Timeslot")).toBeInTheDocument();
    // Singular title must not have the trailing plural "s".
    expect(screen.queryByText("This Week's Timeslots")).not.toBeInTheDocument();
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    // formatWithPattern (real util) renders the date label — 2026-07-01 is a Wednesday.
    expect(screen.getByText('Wed, Jul 1')).toBeInTheDocument();
    expect(screen.queryByText('No timeslots assigned this week')).not.toBeInTheDocument();
  });

  it('renders multiple timeslots with the plural title', () => {
    mockUseWeekTimeslotsByTeam.mockReturnValue({
      data: [
        makeTimeslot({ id: 'ts-1', timeslot: '6:00 PM', match_date: '2026-07-01' }),
        makeTimeslot({ id: 'ts-2', timeslot: '7:30 PM', match_date: '2026-07-02' }),
      ],
      isLoading: false,
    });
    render(<WeekTimeslotDisplay teamId="team-1" />);

    expect(screen.getByText("This Week's Timeslots")).toBeInTheDocument();
    expect(screen.queryByText("This Week's Timeslot")).not.toBeInTheDocument();
    expect(screen.getByText('6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('7:30 PM')).toBeInTheDocument();
  });
});
