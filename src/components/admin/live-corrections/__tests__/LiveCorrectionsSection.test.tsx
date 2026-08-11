import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import LiveCorrectionsSection from '../LiveCorrectionsSection';

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const useSeasonsMock = vi.fn();
const useAdminLiveScoredMatchesMock = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => useSeasonsMock(),
}));

vi.mock('@/hooks/live-scoring/useAdminCorrections', () => ({
  useAdminLiveScoredMatches: (seasonId: string | null) => useAdminLiveScoredMatchesMock(seasonId),
}));

// The panel has its own suite; stub it so this one stays focused on the
// browse/select shell.
vi.mock('../MatchCorrectionsPanel', () => ({
  MatchCorrectionsPanel: ({ matchId }: { matchId: string }) => (
    <div data-testid="corrections-panel">Panel for {matchId}</div>
  ),
}));

const matches = [
  {
    id: 'match-1',
    team1: { name: 'Team A' },
    team2: { name: 'Team B' },
    date: '2026-08-01',
    gameCount: 2,
    roundCount: 9,
    iscompleted: true,
  },
  {
    id: 'match-2',
    team1: { name: 'Team C' },
    team2: { name: 'Team D' },
    date: null,
    gameCount: 1,
    roundCount: 1,
    iscompleted: false,
  },
];

function setMatches(value: Record<string, unknown>) {
  useAdminLiveScoredMatchesMock.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...value,
  });
}

describe('LiveCorrectionsSection', () => {
  beforeAll(() => {
    HTMLElement.prototype.setPointerCapture = vi.fn();
    HTMLElement.prototype.releasePointerCapture = vi.fn();
    HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    useSeasonsMock.mockReturnValue({
      data: [
        { id: 'season-1', name: 'Summer 1' },
        { id: 'season-2', name: 'Winter 1' },
      ],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while matches load', () => {
    setMatches({ isLoading: true });
    render(<LiveCorrectionsSection />);

    expect(screen.getByText('Loading live-scored matches…')).toBeInTheDocument();
  });

  it('surfaces a load failure', () => {
    setMatches({ error: new Error('boom') });
    render(<LiveCorrectionsSection />);

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load matches.');
  });

  it('explains when no live-scored matches exist', () => {
    setMatches({ data: [] });
    render(<LiveCorrectionsSection />);

    expect(screen.getByText('No live-scored matches yet.')).toBeInTheDocument();
  });

  it('starts with all seasons and no match selected', () => {
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    expect(useAdminLiveScoredMatchesMock).toHaveBeenCalledWith(null);
    expect(screen.getByText('Select a match to view and correct its rounds.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeDisabled();
  });

  it('lists each match with its date and game/round counts', () => {
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('2 games · 9 rounds · finalized')).toBeInTheDocument();

    // Singular wording and the missing-date fallback.
    expect(screen.getByText('No date')).toBeInTheDocument();
    expect(screen.getByText('1 game · 1 round')).toBeInTheDocument();
  });

  it('opens the corrections panel for the chosen match and clears it again', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('button', { name: /Team A vs Team B/ }));

    expect(screen.getByTestId('corrections-panel')).toHaveTextContent('Panel for match-1');
    expect(screen.getByRole('button', { name: /Team A vs Team B/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(screen.queryByTestId('corrections-panel')).not.toBeInTheDocument();
    expect(screen.getByText('Select a match to view and correct its rounds.')).toBeInTheDocument();
  });

  it('refetches for the chosen season', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Winter 1' }));

    expect(useAdminLiveScoredMatchesMock).toHaveBeenLastCalledWith('season-2');
  });
});
