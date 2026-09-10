import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import LiveCorrectionsSection from '../LiveCorrectionsSection';

// ─── Hook mocks ───────────────────────────────────────────────────────────────

const useSeasonsMock = vi.fn();
const useActiveSeasonMock = vi.fn();
const useAdminLiveScoredMatchesMock = vi.fn();
const useIsMobileMock = vi.fn();

vi.mock('@/hooks/useSeasons', () => ({
  useSeasons: () => useSeasonsMock(),
  useActiveSeason: () => useActiveSeasonMock(),
}));

vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => useIsMobileMock(),
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
    season_id: 'season-1',
    gameCount: 2,
    roundCount: 9,
    iscompleted: true,
  },
  {
    id: 'match-2',
    team1: { name: 'Team C' },
    team2: { name: 'Team D' },
    date: null,
    season_id: 'season-1',
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
        { id: 'season-1', name: 'Summer 1', is_archived: false },
        { id: 'season-2', name: 'Winter 1', is_archived: true },
      ],
    });
    useActiveSeasonMock.mockReturnValue({ data: { id: 'season-1', name: 'Summer 1' } });
    useIsMobileMock.mockReturnValue(false);
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

  it('explains when no live-scored matches exist anywhere', () => {
    useActiveSeasonMock.mockReturnValue({ data: null });
    setMatches({ data: [] });
    render(<LiveCorrectionsSection />);

    expect(screen.getByText('No live-scored matches yet.')).toBeInTheDocument();
  });

  it('opens on the active season and the most recent night, with no match selected', () => {
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    // A-11: league night is the job, so the season being played is the default.
    expect(useAdminLiveScoredMatchesMock).toHaveBeenCalledWith('season-1');
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveTextContent('Summer 1');
    expect(screen.getByRole('combobox', { name: 'Night' })).toHaveTextContent('Jul 31, 2026');
    expect(screen.getByText('Select a match to view and correct its rounds.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear selection|back to list/i })).toBeNull();
  });

  it('falls back to all seasons when the league has no active season', () => {
    useActiveSeasonMock.mockReturnValue({ data: null });
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    expect(useAdminLiveScoredMatchesMock).toHaveBeenCalledWith(null);
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveTextContent('All seasons');
  });

  it('narrows the list to the chosen night and widens again for All nights', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    // The dated match is on the default night; the undated one is not on any.
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument();
    expect(screen.queryByText('Team C vs Team D')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Night' }));
    await user.click(await screen.findByRole('option', { name: 'All nights' }));

    expect(screen.getByText('Team C vs Team D')).toBeInTheDocument();
  });

  it('says the night is empty rather than pretending nothing was ever scored', async () => {
    const user = userEvent.setup();
    setMatches({
      data: [
        matches[0],
        { ...matches[0], id: 'match-old', date: '2026-06-04', team1: { name: 'Team G' } },
      ],
    });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('combobox', { name: 'Night' }));
    await user.click(await screen.findByRole('option', { name: 'Jun 3, 2026' }));
    await user.click(screen.getByRole('combobox', { name: 'Night' }));
    await user.click(await screen.findByRole('option', { name: 'Jul 31, 2026' }));

    expect(screen.queryByText('No live-scored matches yet.')).not.toBeInTheDocument();
  });

  it('names the season when it holds no live-scored matches', () => {
    setMatches({ data: [] });
    render(<LiveCorrectionsSection />);

    expect(screen.getByText('No live-scored matches in this season.')).toBeInTheDocument();
  });

  it('lists each match with its night and game/round counts', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    // Dates read in league time, so the day is the same on a UTC runner as it
    // is in the league's own timezone. An 8 PM game is stored on the next UTC
    // day; '2026-08-01' at UTC midnight is the night of Jul 31 in league time.
    expect(screen.getByText('Team A vs Team B')).toBeInTheDocument();
    expect(screen.getAllByText('Jul 31, 2026').length).toBeGreaterThan(0);
    expect(screen.getByText('2 games · 9 rounds · final')).toBeInTheDocument();

    // A match with no date belongs to no night, so it needs the wider view.
    await user.click(screen.getByRole('combobox', { name: 'Night' }));
    await user.click(await screen.findByRole('option', { name: 'All nights' }));

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

  it('scrolls to the panel on a phone and offers a way back to the list', async () => {
    const user = userEvent.setup();
    useIsMobileMock.mockReturnValue(true);
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('button', { name: /Team A vs Team B/ }));

    // A-11: on a phone the panel is below the whole list, so selecting a match
    // used to move nothing on screen.
    await waitFor(() => expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Back to list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear selection' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Back to list' }));

    expect(screen.queryByTestId('corrections-panel')).not.toBeInTheDocument();
  });

  it('does not scroll on a desktop, where the panel is already beside the list', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('button', { name: /Team A vs Team B/ }));

    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('refetches for the chosen season', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('combobox', { name: 'Season' }));
    await user.click(await screen.findByRole('option', { name: /Winter 1/ }));

    expect(useAdminLiveScoredMatchesMock).toHaveBeenLastCalledWith('season-2');
  });

  // ─── B-20: archived seasons are listed, and said to be read-only ────────────

  it('marks an archived season in the picker without hiding it', async () => {
    const user = userEvent.setup();
    setMatches({ data: matches });
    render(<LiveCorrectionsSection />);

    await user.click(screen.getByRole('combobox', { name: 'Season' }));

    expect(
      await screen.findByRole('option', { name: 'Winter 1 (archived — read-only)' })
    ).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Summer 1' })).toBeInTheDocument();
  });

  it('marks a match from an archived season on its card, under "All seasons"', async () => {
    const user = userEvent.setup();
    setMatches({
      data: [
        ...matches,
        {
          id: 'match-3',
          team1: { name: 'Team E' },
          team2: { name: 'Team F' },
          date: '2026-01-04',
          season_id: 'season-2',
          gameCount: 3,
          roundCount: 20,
          iscompleted: true,
        },
      ],
    });
    render(<LiveCorrectionsSection />);

    // The default is now the active season and one night, so both widenings are
    // needed before the two seasons appear side by side.
    await user.click(screen.getByRole('combobox', { name: 'Season' }));
    await user.click(await screen.findByRole('option', { name: 'All seasons' }));
    await user.click(screen.getByRole('combobox', { name: 'Night' }));
    await user.click(await screen.findByRole('option', { name: 'All nights' }));

    expect(
      screen.getByText('3 games · 20 rounds · final · archived, read-only')
    ).toBeInTheDocument();
    // A live season's card says nothing about archiving.
    expect(screen.getByText('2 games · 9 rounds · final')).toBeInTheDocument();
  });
});
