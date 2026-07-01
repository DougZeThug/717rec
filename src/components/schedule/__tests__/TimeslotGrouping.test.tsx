import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TeamTimeslot } from '@/types';

vi.mock('@/hooks/useSeasonalTheme', () => ({
  useSeasonalThemeBase: () => ({ isWinterTheme: false }),
}));

import TimeslotGrouping from '../TimeslotGrouping';

const makeTeamTimeslot = (overrides: Partial<TeamTimeslot> = {}): TeamTimeslot => ({
  id: 'ts-1',
  match_date: '2026-07-04',
  timeslot: '10:00 AM',
  team_id: 'team-1',
  created_at: '2026-06-01T00:00:00.000Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  teams: {
    id: 'team-1',
    name: 'Wolves',
    logo_url: null,
    image_url: null,
    divisionName: 'Gold',
  },
  ...overrides,
});

const renderWithRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TimeslotGrouping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while data is loading', () => {
    renderWithRouter(<TimeslotGrouping groupedTimeslots={{}} isLoading />);

    expect(screen.getByText('Loading timeslots...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the empty state when there are no timeslots', () => {
    renderWithRouter(<TimeslotGrouping groupedTimeslots={{}} isLoading={false} />);

    expect(screen.getByText('No timeslots scheduled for this date.')).toBeInTheDocument();
  });

  it('renders the timeslot header and team rows for grouped data', () => {
    const grouped: Record<string, TeamTimeslot[]> = {
      '10:00 AM': [
        makeTeamTimeslot({ id: 'ts-1', team_id: 'team-1' }),
        makeTeamTimeslot({
          id: 'ts-2',
          team_id: 'team-2',
          teams: {
            id: 'team-2',
            name: 'Hawks',
            logo_url: null,
            image_url: null,
            divisionName: 'Silver',
          },
        }),
      ],
    };

    renderWithRouter(<TimeslotGrouping groupedTimeslots={grouped} isLoading={false} />);

    // Timeslot header + team count badge.
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('2 teams')).toBeInTheDocument();

    // Team names render (both mobile + desktop layouts render in jsdom).
    expect(screen.getAllByText('Wolves').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hawks').length).toBeGreaterThan(0);
  });

  it('collapses and expands the timeslot section when the header is clicked', () => {
    const grouped: Record<string, TeamTimeslot[]> = {
      '10:00 AM': [makeTeamTimeslot({ id: 'ts-1', team_id: 'team-1' })],
    };

    renderWithRouter(<TimeslotGrouping groupedTimeslots={grouped} isLoading={false} />);

    // First (and only) timeslot is expanded by default, so content is visible.
    expect(screen.getAllByText('Wolves').length).toBeGreaterThan(0);

    const trigger = screen.getByText('10:00 AM').closest('button');
    expect(trigger).not.toBeNull();

    // Collapse: Radix unmounts the CollapsibleContent when closed (no animation in jsdom).
    fireEvent.click(trigger as HTMLButtonElement);
    expect(screen.queryByText('Wolves')).not.toBeInTheDocument();

    // Expand again: content returns.
    fireEvent.click(trigger as HTMLButtonElement);
    expect(screen.getAllByText('Wolves').length).toBeGreaterThan(0);
  });

  it('renders bye-week teams with the BYE WEEK header', () => {
    const grouped: Record<string, TeamTimeslot[]> = {
      BYE: [
        makeTeamTimeslot({
          id: 'ts-bye',
          team_id: 'team-3',
          timeslot: 'BYE',
          teams: {
            id: 'team-3',
            name: 'Bears',
            logo_url: null,
            image_url: null,
            divisionName: 'Bronze',
          },
        }),
      ],
    };

    renderWithRouter(<TimeslotGrouping groupedTimeslots={grouped} isLoading={false} />);

    expect(screen.getByText('BYE WEEK')).toBeInTheDocument();
    const bearsMatches = screen.getAllByText('Bears');
    expect(bearsMatches.length).toBeGreaterThan(0);
    // Bye-week rows carry the "Not playing this week" caption (desktop layout).
    expect(screen.getByText('Not playing this week')).toBeInTheDocument();
  });
});
