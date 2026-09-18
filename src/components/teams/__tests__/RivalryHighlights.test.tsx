import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import RivalryHighlights from '@/components/teams/RivalryHighlights';
import type { HeadToHeadRecord } from '@/types/headToHead';

const mockNavigate = vi.fn();
const mockUseHeadToHead = vi.fn();

// Only useNavigate is stubbed: CollapsibleSection reaches useSeasonalTheme,
// which calls useLocation, so the rest of the module has to stay real.
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useHeadToHead', () => ({
  useHeadToHead: (teamId: string) => mockUseHeadToHead(teamId),
}));

vi.mock('@/components/ui/team', () => ({
  TeamLogo: ({ teamName }: { teamName: string }) => <img alt={teamName} src="" />,
}));

// Radix Collapsible drives the non-standalone wrapper, and jsdom implements
// none of the pointer-capture API it calls.
beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

const record = (overrides: Partial<HeadToHeadRecord>): HeadToHeadRecord => ({
  team_id: 'me',
  opponent_id: 'opp',
  opponent_name: 'Opponent',
  opponent_image_url: undefined,
  matches_played: 10,
  wins: 5,
  losses: 5,
  game_wins: 10,
  game_losses: 10,
  win_pct: 50,
  last_played_at: null,
  ...overrides,
});

// |wins - losses| <= 1 and 3+ matches makes this the closest rivalry.
const evenRival = record({
  opponent_id: 'rival-1',
  opponent_name: 'Rail Riders',
  matches_played: 9,
  wins: 5,
  losses: 4,
  win_pct: 56,
});

const lopsidedWin = (win_pct: number) =>
  record({
    opponent_id: 'dom-1',
    opponent_name: 'Bag Bandits',
    matches_played: 10,
    wins: 9,
    losses: 1,
    win_pct,
  });

const lopsidedLoss = (win_pct: number) =>
  record({
    opponent_id: 'nem-1',
    opponent_name: 'Corn Stars',
    matches_played: 10,
    wins: 1,
    losses: 9,
    win_pct,
  });

const setRecords = (records: HeadToHeadRecord[], isLoading = false) => {
  mockUseHeadToHead.mockReturnValue({ data: records, isLoading });
};

beforeEach(() => {
  vi.clearAllMocks();
});

// useSeasonalTheme calls useLocation, so even the standalone path needs a router.
const renderHighlights = (props: { standalone?: boolean } = {}) =>
  render(
    <MemoryRouter>
      <RivalryHighlights teamId="me" {...props} />
    </MemoryRouter>
  );

describe('RivalryHighlights', () => {
  it('renders nothing while the records are still loading', () => {
    setRecords([], true);
    const { container } = renderHighlights({ standalone: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when no opponent qualifies as a rivalry', () => {
    // Two matches is below the three-match minimum, so nothing classifies.
    setRecords([record({ matches_played: 2, wins: 1, losses: 1 })]);
    const { container } = renderHighlights({ standalone: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card for each of the three rivalry kinds', () => {
    setRecords([evenRival, lopsidedWin(90), lopsidedLoss(10)]);
    renderHighlights({ standalone: true });

    expect(screen.getByText('Top Rival')).toBeInTheDocument();
    expect(screen.getByText('Rail Riders')).toBeInTheDocument();
    expect(screen.getByText('5-4 all-time')).toBeInTheDocument();

    expect(screen.getByText('Bag Bandits')).toBeInTheDocument();
    expect(screen.getByText('Corn Stars')).toBeInTheDocument();
    expect(screen.getAllByText('9-1 all-time')).toHaveLength(1);
    expect(screen.getAllByText('1-9 all-time')).toHaveLength(1);
  });

  it('labels a runaway record "Dominated" and a merely good one "Favorite"', () => {
    setRecords([lopsidedWin(90)]);
    const { unmount } = renderHighlights({ standalone: true });
    expect(screen.getByText('Dominated')).toBeInTheDocument();
    unmount();

    setRecords([lopsidedWin(75)]);
    renderHighlights({ standalone: true });
    expect(screen.getByText('Favorite')).toBeInTheDocument();
  });

  it('labels a hopeless record "Nemesis" and a merely bad one "Tough Matchup"', () => {
    setRecords([lopsidedLoss(10)]);
    const { unmount } = renderHighlights({ standalone: true });
    expect(screen.getByText('Nemesis')).toBeInTheDocument();
    unmount();

    setRecords([lopsidedLoss(25)]);
    renderHighlights({ standalone: true });
    expect(screen.getByText('Tough Matchup')).toBeInTheDocument();
  });

  it('navigates to the opponent behind whichever card is clicked', async () => {
    const user = userEvent.setup();
    setRecords([evenRival, lopsidedWin(90), lopsidedLoss(10)]);
    renderHighlights({ standalone: true });

    await user.click(screen.getByRole('button', { name: /Rail Riders/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/teams/rail-riders');

    await user.click(screen.getByRole('button', { name: /Bag Bandits/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/teams/bag-bandits');

    await user.click(screen.getByRole('button', { name: /Corn Stars/ }));
    expect(mockNavigate).toHaveBeenLastCalledWith('/teams/corn-stars');
  });

  it('wraps the cards in a collapsible section that names the top rival when not standalone', async () => {
    const user = userEvent.setup();
    setRecords([evenRival]);
    renderHighlights();

    // Collapsed: the section summarises, the card itself is not mounted.
    expect(screen.getByText('vs. Rail Riders')).toBeInTheDocument();
    expect(screen.queryByText('Top Rival')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Rivalry Highlights/ }));

    expect(screen.getByText('Top Rival')).toBeInTheDocument();
  });
});
