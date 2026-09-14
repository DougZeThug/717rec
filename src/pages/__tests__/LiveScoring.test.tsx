import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveScoringNotEnabledError, NotFoundError } from '@/types/errors';

const mockUseLiveMatch = vi.fn();
const mockUseCanScoreMatch = vi.fn();

vi.mock('@/hooks/live-scoring/useLiveMatch', () => ({
  useLiveMatch: (matchId: string | undefined) => mockUseLiveMatch(matchId),
}));

vi.mock('@/hooks/live-scoring/useLiveMatchRealtime', () => ({
  useLiveMatchRealtime: () => ({ status: 'SUBSCRIBED' }),
}));

vi.mock('@/hooks/live-scoring/useCanScoreMatch', () => ({
  useCanScoreMatch: () => mockUseCanScoreMatch(),
}));

vi.mock('@/components/live-scoring/LiveMatchView', () => ({
  // The real view renders its own sr-only h1; the stand-in keeps one so the
  // "every branch has an h1" check below reads the page, not the stub.
  LiveMatchView: ({ canScore }: { canScore: boolean }) => (
    <div data-testid="live-match-view">
      <h1 className="sr-only">Live scoring: Team 1 vs Team 2</h1>
      canScore:{String(canScore)}
    </div>
  ),
}));

import LiveScoring from '../LiveScoring';

const baseHookResult = {
  bundle: undefined,
  derived: undefined,
  isLoading: false,
  error: null,
  isNotEnabled: false,
};

const bundleFor = (team1_id: string | null = 'team-1', team2_id: string | null = 'team-2') => ({
  match: { id: 'match-1', team1_id, team2_id, iscompleted: false },
  games: [],
  rounds: [],
  gamePlayers: [],
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/matches/match-1/live']}>
      <Routes>
        <Route path="/matches/:matchId/live" element={<LiveScoring />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCanScoreMatch.mockReturnValue({ canScore: true, isAdmin: false, isLoading: false });
});

describe('LiveScoring page', () => {
  it('shows a loading state while the bundle loads', () => {
    mockUseLiveMatch.mockReturnValue({ ...baseHookResult, isLoading: true });
    renderPage();
    expect(screen.getByText(/loading match/i)).toBeInTheDocument();
  });

  it('shows the not-enabled state when the migration is missing', () => {
    mockUseLiveMatch.mockReturnValue({
      ...baseHookResult,
      error: new LiveScoringNotEnabledError(),
      isNotEnabled: true,
    });
    renderPage();
    expect(screen.getByText(/live scoring is not enabled yet/i)).toBeInTheDocument();
  });

  it('shows a not-found state for unknown matches', () => {
    mockUseLiveMatch.mockReturnValue({
      ...baseHookResult,
      error: new NotFoundError('Match', 'match-1'),
    });
    renderPage();
    expect(screen.getByText(/match not found/i)).toBeInTheDocument();
  });

  it('shows a friendly error for other failures', () => {
    mockUseLiveMatch.mockReturnValue({ ...baseHookResult, error: new Error('boom') });
    renderPage();
    expect(screen.getByText(/could not load the match/i)).toBeInTheDocument();
  });

  it('blocks matches without both teams assigned', () => {
    mockUseLiveMatch.mockReturnValue({
      ...baseHookResult,
      bundle: bundleFor('team-1', null),
      derived: {},
    });
    renderPage();
    expect(screen.getByText(/teams not set/i)).toBeInTheDocument();
  });

  it('renders the live view with the resolved permissions', () => {
    mockUseLiveMatch.mockReturnValue({ ...baseHookResult, bundle: bundleFor(), derived: {} });
    mockUseCanScoreMatch.mockReturnValue({ canScore: false, isAdmin: false, isLoading: false });
    renderPage();
    expect(screen.getByTestId('live-match-view')).toHaveTextContent('canScore:false');
  });

  it('passes the route match id into the data hook', () => {
    mockUseLiveMatch.mockReturnValue({ ...baseHookResult, bundle: bundleFor(), derived: {} });
    renderPage();
    expect(mockUseLiveMatch).toHaveBeenCalledWith('match-1');
  });

  // Only the success branch used to have one, because the h1 lives inside
  // LiveMatchView. The other five left the page with no level-1 heading at all —
  // an h3 from EmptyState, or nothing while loading — so a deep link or a
  // refresh onto one of them told a screen-reader user nothing about where they
  // were. RouteAnnouncer cannot cover it: it deliberately skips the first
  // render. Audit Q12 / X-08.
  describe('every branch names the page with an h1', () => {
    const heading = () => screen.getByRole('heading', { level: 1 });

    it.each([
      ['loading', { ...baseHookResult, isLoading: true }, /live scoring/i],
      [
        'not enabled',
        { ...baseHookResult, error: new LiveScoringNotEnabledError(), isNotEnabled: true },
        /live scoring is not enabled yet/i,
      ],
      [
        'match not found',
        { ...baseHookResult, error: new NotFoundError('Match', 'match-1') },
        /match not found/i,
      ],
      ['load failed', { ...baseHookResult, error: new Error('boom') }, /could not load the match/i],
      [
        'teams not set',
        { ...baseHookResult, bundle: bundleFor('team-1', null), derived: {} },
        /teams not set/i,
      ],
      ['scoring', { ...baseHookResult, bundle: bundleFor(), derived: {} }, /live scoring:/i],
    ])('%s', (_label, hookResult, expected) => {
      mockUseLiveMatch.mockReturnValue(hookResult);
      renderPage();

      expect(heading()).toHaveAccessibleName(expected);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('names the page while permissions are still resolving', () => {
      mockUseLiveMatch.mockReturnValue({ ...baseHookResult, bundle: bundleFor(), derived: {} });
      mockUseCanScoreMatch.mockReturnValue({ canScore: false, isAdmin: false, isLoading: true });
      renderPage();

      expect(heading()).toHaveAccessibleName(/live scoring/i);
    });
  });
});
