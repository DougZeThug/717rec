import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SeasonOpponentData } from '@/services/matches/MatchHistoryService';

const mockUseSeasonOpponentHistory = vi.fn();
let mockIsMobile = false;

vi.mock('@/hooks/useSeasonOpponentHistory', () => ({
  useSeasonOpponentHistory: () => mockUseSeasonOpponentHistory(),
}));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => mockIsMobile }));

const exportMatchupsToExcel = vi.fn();
vi.mock('@/utils/exportMatchupsToExcel', () => ({
  exportMatchupsToExcel: (...args: unknown[]) => exportMatchupsToExcel(...args),
}));

import OpponentHistoryTab from '../OpponentHistoryTab';

type TeamRow = SeasonOpponentData['teams'][number];

const makeTeam = (overrides: Partial<TeamRow> = {}): TeamRow => ({
  teamId: 'team-1',
  teamName: 'Ringers',
  divisionId: 'div-1',
  divisionName: 'Competitive',
  opponents: [
    {
      opponentId: 'team-2',
      opponentName: 'Cornstars',
      opponentDivision: 'Competitive',
      matchCount: 2,
      wins: 2,
      losses: 0,
    },
  ],
  uniqueOpponentCount: 1,
  totalMatches: 2,
  ...overrides,
});

const data: SeasonOpponentData = {
  seasonId: 'season-1',
  seasonName: 'Summer 2 2026',
  teams: [
    makeTeam(),
    makeTeam({
      teamId: 'team-3',
      teamName: 'Baggin Rights',
      divisionName: 'Intermediate',
      opponents: [],
      uniqueOpponentCount: 0,
      totalMatches: 0,
    }),
  ],
};

describe('OpponentHistoryTab', () => {
  beforeAll(() => {
    // Radix Select needs these; jsdom has none of them.
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    mockUseSeasonOpponentHistory.mockReturnValue({ data, isLoading: false, error: null });
  });

  it('shows one scoped heading per column and a row per team', () => {
    render(<OpponentHistoryTab />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Team',
      'Division',
      'Opponents Played',
      '# Opp',
      '# Matches',
    ]);
    for (const header of headers) {
      expect(header).toHaveAttribute('scope', 'col');
    }

    // Header row plus one row per team.
    expect(screen.getAllByRole('row')).toHaveLength(data.teams.length + 1);
  });

  it('names each opponent and says how many times they were played', () => {
    render(<OpponentHistoryTab />);

    const badge = screen.getByTitle('2-0 vs Cornstars');
    expect(badge).toHaveTextContent('Cornstars');
    // The multiplier only appears once a pair has met more than once.
    expect(badge).toHaveTextContent('×2');
  });

  it('says so when a team has no opponents yet', () => {
    render(<OpponentHistoryTab />);
    expect(screen.getByText('No opponents yet')).toBeInTheDocument();
  });

  it('filters by team name as you type', async () => {
    const user = userEvent.setup();
    render(<OpponentHistoryTab />);

    await user.type(screen.getByRole('textbox', { name: 'Search teams' }), 'Baggin');

    expect(screen.getByText('Baggin Rights')).toBeInTheDocument();
    expect(screen.queryByText('Ringers')).not.toBeInTheDocument();
  });

  it('shows the empty state when nothing matches the filter', async () => {
    const user = userEvent.setup();
    render(<OpponentHistoryTab />);

    await user.type(screen.getByRole('textbox', { name: 'Search teams' }), 'nobody');

    expect(screen.getByText('No teams match your filters')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('becomes a labelled list of cards on a phone, not a table', () => {
    mockIsMobile = true;
    render(<OpponentHistoryTab />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Teams and the opponents they have played' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(data.teams.length);

    // The heading text is reused as the card label.
    const firstCard = within(list).getAllByRole('listitem')[0];
    expect(within(firstCard).getByText('# Matches')).toBeInTheDocument();
  });

  it('shows a spinner before any data arrives', () => {
    mockUseSeasonOpponentHistory.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<OpponentHistoryTab />);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('says so when the season has no completed matches at all', () => {
    mockUseSeasonOpponentHistory.mockReturnValue({
      data: { ...data, teams: [] },
      isLoading: false,
      error: null,
    });
    render(<OpponentHistoryTab />);

    expect(screen.getByText(/No completed matches found/i)).toBeInTheDocument();
  });

  it('exports the season to Excel', async () => {
    const user = userEvent.setup();
    render(<OpponentHistoryTab />);

    await user.click(screen.getByRole('button', { name: /Export to Excel/i }));

    expect(exportMatchupsToExcel).toHaveBeenCalledWith(data);
  });

  it('reports a load failure instead of an empty table', () => {
    mockUseSeasonOpponentHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('nope'),
    });
    render(<OpponentHistoryTab />);

    expect(screen.getByText(/Error loading opponent history/i)).toBeInTheDocument();
  });
});
