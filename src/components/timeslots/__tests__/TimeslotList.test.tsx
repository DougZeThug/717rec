import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Team, TeamTimeslot } from '@/types';

import TimeslotList from '../TimeslotList';

// The shared Table component reads route state via useSeasonalTheme -> useLocation,
// so the component tree must be rendered inside a Router.
const renderWithRouter = (ui: ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

// Polyfill ResizeObserver for jsdom (Radix internals may reference it)
globalThis.ResizeObserver =
  globalThis.ResizeObserver ||
  (class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver);

const teams: Team[] = [
  { id: 't1', name: 'Team Alpha' },
  { id: 't2', name: 'Team Bravo' },
];

const makeTimeslot = (overrides: Partial<TeamTimeslot>): TeamTimeslot => ({
  id: 'ts-1',
  match_date: '2026-07-01',
  timeslot: '7:00 PM',
  team_id: 't1',
  created_at: '2026-07-01T00:00:00.000Z',
  is_back_to_back: false,
  is_double_header: false,
  pair_slot: null,
  match_sequence: null,
  ...overrides,
});

describe('TimeslotList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the empty state when there are no timeslots', () => {
    renderWithRouter(<TimeslotList timeslots={[]} teams={teams} onDelete={vi.fn()} />);

    expect(screen.getByText('No Timeslots Assigned')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders sorted rows with resolved team names and an Unknown Team fallback', () => {
    const timeslots: TeamTimeslot[] = [
      makeTimeslot({ id: 'ts-late', timeslot: '8:00 PM', team_id: 't2' }),
      makeTimeslot({ id: 'ts-early', timeslot: '5:00 PM', team_id: 'ghost' }),
    ];

    renderWithRouter(<TimeslotList timeslots={timeslots} teams={teams} onDelete={vi.fn()} />);

    expect(screen.getByText('8:00 PM')).toBeInTheDocument();
    expect(screen.getByText('5:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Team Bravo')).toBeInTheDocument();
    // team_id with no matching team resolves to the fallback label.
    expect(screen.getByText('Unknown Team')).toBeInTheDocument();

    // Rows are sorted ascending by timeslot string: 5:00 PM before 8:00 PM.
    const rows = screen.getAllByRole('row');
    // rows[0] is the header row.
    expect(within(rows[1]).getByText('5:00 PM')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Unknown Team')).toBeInTheDocument();
    expect(within(rows[2]).getByText('8:00 PM')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Team Bravo')).toBeInTheDocument();
  });

  it('confirms deletion through the alert dialog and calls onDelete with the timeslot id', async () => {
    const onDelete = vi.fn();
    const timeslots: TeamTimeslot[] = [
      makeTimeslot({ id: 'ts-late', timeslot: '8:00 PM', team_id: 't2' }),
      makeTimeslot({ id: 'ts-early', timeslot: '5:00 PM', team_id: 'ghost' }),
    ];

    renderWithRouter(<TimeslotList timeslots={timeslots} teams={teams} onDelete={onDelete} />);

    // Second row (index 1) is the 8:00 PM / Team Bravo slot after sorting.
    const removeButtons = screen.getAllByRole('button', { name: /Remove timeslot/i });
    fireEvent.click(removeButtons[1]);

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Team Bravo')).toBeInTheDocument();
    expect(within(dialog).getByText('8:00 PM')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('ts-late'));
    // Dialog closes after a successful delete.
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('closes the dialog without deleting when Cancel is clicked', async () => {
    const onDelete = vi.fn();
    const timeslots: TeamTimeslot[] = [
      makeTimeslot({ id: 'ts-1', timeslot: '7:00 PM', team_id: 't1' }),
    ];

    renderWithRouter(<TimeslotList timeslots={timeslots} teams={teams} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /Remove timeslot/i }));

    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onDelete).not.toHaveBeenCalled();
  });
});
