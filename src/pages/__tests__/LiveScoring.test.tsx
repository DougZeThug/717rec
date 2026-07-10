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
  LiveMatchView: ({ canScore }: { canScore: boolean }) => (
    <div data-testid="live-match-view">canScore:{String(canScore)}</div>
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
});
