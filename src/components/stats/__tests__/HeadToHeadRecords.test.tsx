import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeadToHeadRecord } from '@/types/headToHead';

import HeadToHeadRecords from '../HeadToHeadRecords';

const mockUseHeadToHead = vi.fn();
const exportHeadToHeadToCSV = vi.fn();
const navigate = vi.fn();

vi.mock('@/hooks/useHeadToHead', () => ({
  useHeadToHead: (teamId: string) => mockUseHeadToHead(teamId),
}));
let mockIsMobile = false;
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile }));
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => navigate };
});
vi.mock('@/utils/exportUtils', () => ({
  exportHeadToHeadToCSV: (...args: unknown[]) => exportHeadToHeadToCSV(...args),
}));
vi.mock('../OpponentHistoryModal', () => ({
  OpponentHistoryModal: ({ isOpen, opponentName }: { isOpen: boolean; opponentName: string }) =>
    isOpen ? <div data-testid="history-modal">{opponentName}</div> : null,
}));

const makeRecord = (overrides: Partial<HeadToHeadRecord>): HeadToHeadRecord => ({
  team_id: 't1',
  opponent_id: 'opp-1',
  opponent_name: 'Opponent',
  matches_played: 4,
  wins: 3,
  losses: 1,
  game_wins: 7,
  game_losses: 3,
  win_pct: 75,
  last_played_at: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const records = [
  makeRecord({ opponent_id: 'opp-a', opponent_name: 'Aces', wins: 1, win_pct: 25 }),
  makeRecord({ opponent_id: 'opp-b', opponent_name: 'Bandits', wins: 5, win_pct: 90 }),
];

describe('HeadToHeadRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    mockUseHeadToHead.mockReturnValue({ data: records, isLoading: false, error: null });
  });

  const renderRecords = () =>
    render(<HeadToHeadRecords teamId="t1" teamName="My Team" standalone />);

  it('renders a row per opponent, sorted by wins descending by default', () => {
    renderRecords();
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    expect(within(rows[0]).getByText('Bandits')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Aces')).toBeInTheDocument();
  });

  it('filters opponents through the search box', async () => {
    const user = userEvent.setup();
    renderRecords();
    await user.type(screen.getByLabelText('Search opponents'), 'band');
    expect(screen.getByText('Bandits')).toBeInTheDocument();
    expect(screen.queryByText('Aces')).not.toBeInTheDocument();
  });

  it('opens the opponent history modal from View Details', async () => {
    const user = userEvent.setup();
    renderRecords();
    const rows = screen.getAllByRole('row').slice(1);
    await user.click(within(rows[0]).getByRole('button', { name: 'View Details' }));
    expect(screen.getByTestId('history-modal')).toHaveTextContent('Bandits');
  });

  it('exports the filtered records to CSV', async () => {
    const user = userEvent.setup();
    renderRecords();
    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(exportHeadToHeadToCSV).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ opponent_name: 'Bandits' })]),
      'My Team'
    );
  });

  it('shows the loading state', () => {
    mockUseHeadToHead.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderRecords();
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
  });

  it('shows the empty state when there are no records', () => {
    mockUseHeadToHead.mockReturnValue({ data: [], isLoading: false, error: null });
    renderRecords();
    expect(screen.getByText('No head-to-head records yet')).toBeInTheDocument();
  });

  it('opens the opponent team page from a real button, not a div pretending to be one', async () => {
    const user = userEvent.setup();
    renderRecords();

    // A real <button> is focusable and Enter-activated by the browser, so there
    // is no tabIndex or onKeyDown to assert — which is the point of the change.
    const opponentButton = screen.getByRole('button', {
      name: 'View team details for Bandits',
    });
    await user.click(opponentButton);

    expect(navigate).toHaveBeenCalledWith('/teams/bandits');
  });

  it('says which column it is sorted by, and only that one', async () => {
    const user = userEvent.setup();
    renderRecords();

    const winPct = screen.getByRole('columnheader', { name: /Win%/ });
    expect(winPct).toHaveAttribute('aria-sort', 'none');

    await user.click(within(winPct).getByRole('button'));

    expect(winPct).toHaveAttribute('aria-sort', 'descending');

    // Pressing the same column again flips the direction rather than resetting.
    await user.click(within(winPct).getByRole('button'));
    expect(winPct).toHaveAttribute('aria-sort', 'ascending');
    const otherSorts = screen
      .getAllByRole('columnheader')
      .filter((header) => header !== winPct)
      .map((header) => header.getAttribute('aria-sort'));
    // 'Last Played' and 'Action' are not sortable, so they carry no aria-sort.
    expect(otherSorts).toEqual(['none', 'none', 'none', 'none', null, null]);
  });

  it('shows the loading state before any record arrives', () => {
    mockUseHeadToHead.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderRecords();

    expect(screen.getByText('Loading records...')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('reports a load failure instead of an empty table', () => {
    mockUseHeadToHead.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('nope'),
    });
    renderRecords();

    expect(screen.getByText(/Error loading head-to-head records/i)).toBeInTheDocument();
  });

  it('says so when a search matches no opponent', async () => {
    const user = userEvent.setup();
    renderRecords();

    await user.type(screen.getByRole('textbox', { name: 'Search opponents' }), 'nobody');

    expect(screen.getByText(/No opponents found matching/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('falls back to a dash when a pair has never played', () => {
    mockUseHeadToHead.mockReturnValue({
      data: [makeRecord({ opponent_name: 'Newcomers', last_played_at: null })],
      isLoading: false,
      error: null,
    });
    renderRecords();

    // The W-L cell also renders a '-' between the two numbers, so address the
    // Last Played cell by position rather than by text.
    const row = screen.getAllByRole('row')[1];
    const lastPlayed = within(row).getAllByRole('cell')[5];
    expect(lastPlayed).toHaveTextContent('-');
  });

  describe('on a phone', () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    it('shows cards instead of a table, and a sort control instead of headings', () => {
      renderRecords();

      // Card mode has no column headings to press, so the dropdown is the only
      // way to sort — see the note on it in HeadToHeadRecords.
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText('Aces')).toBeInTheDocument();
      expect(screen.getByText('Bandits')).toBeInTheDocument();
    });

    it('opens the opponent history from a card', async () => {
      const user = userEvent.setup();
      renderRecords();

      await user.click(screen.getByRole('button', { name: /Bandits/ }));

      expect(await screen.findByTestId('history-modal')).toHaveTextContent('Bandits');
    });

    it('still filters by search', async () => {
      const user = userEvent.setup();
      renderRecords();

      await user.type(screen.getByRole('textbox', { name: 'Search opponents' }), 'Aces');

      expect(screen.getByText('Aces')).toBeInTheDocument();
      expect(screen.queryByText('Bandits')).not.toBeInTheDocument();
    });
  });
});
