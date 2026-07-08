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
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
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

  it('renders clickable opponent name as a keyboard-accessible button', () => {
    renderRecords();
    const opponentButton = screen
      .getAllByRole('button')
      .find((btn) => btn.textContent?.includes('Bandits'));
    expect(opponentButton).toBeDefined();
    expect(opponentButton).toHaveAttribute('tabIndex', '0');
  });
});
