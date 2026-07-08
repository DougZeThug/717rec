import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LiveScoringNotEnabledError } from '@/types/errors';

const mockFetchLiveMatchBundle = vi.fn();

vi.mock('@/services/liveScoring/LiveMatchService', () => ({
  LiveMatchService: {
    fetchLiveMatchBundle: (...args: unknown[]) => mockFetchLiveMatchBundle(...args),
  },
}));

import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { deriveLiveMatch, useLiveMatch } from '../useLiveMatch';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const bundle = (overrides: Partial<LiveMatchBundle> = {}): LiveMatchBundle => ({
  match: {
    id: 'match-1',
    season_id: 'season-1',
    date: '2026-07-08T18:00:00Z',
    location: null,
    best_of: 3,
    iscompleted: false,
    winner_id: null,
    team1_id: 'team-1',
    team2_id: 'team-2',
    team1_game_wins: 0,
    team2_game_wins: 0,
    team1: { id: 'team-1', name: 'Baggers', logo_url: null, image_url: null },
    team2: { id: 'team-2', name: 'Tossers', logo_url: null, image_url: null },
  },
  games: [],
  rounds: [],
  gamePlayers: [],
  ...overrides,
});

const gameRow = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'game-1',
    match_id: 'match-1',
    game_number: 1,
    team1_score: null,
    team2_score: null,
    status: 'in_progress',
    winner_team_id: null,
    started_at: '',
    completed_at: null,
    created_at: null,
    updated_at: '',
    ...overrides,
  }) as LiveMatchBundle['games'][number];

const roundRow = (overrides: Record<string, unknown> = {}) =>
  ({
    id: `round-${overrides.round_number ?? 1}`,
    match_id: 'match-1',
    game_id: 'game-1',
    round_number: 1,
    team1_score: 8,
    team2_score: 5,
    net_points: 3,
    winner_team: 1,
    team1_thrower_id: 'p1',
    team2_thrower_id: 'p3',
    team1_bags_in: null,
    team1_bags_on: null,
    team1_bags_off: null,
    team2_bags_in: null,
    team2_bags_on: null,
    team2_bags_off: null,
    entered_by_user_id: 'user-1',
    created_at: '',
    ...overrides,
  }) as LiveMatchBundle['rounds'][number];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLiveMatch', () => {
  it('fetches the bundle and exposes derived state', async () => {
    mockFetchLiveMatchBundle.mockResolvedValue(bundle({ games: [gameRow()] }));

    const { result } = renderHook(() => useLiveMatch('match-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.bundle).toBeDefined());
    expect(mockFetchLiveMatchBundle).toHaveBeenCalledWith('match-1');
    expect(result.current.derived?.currentGame?.game.id).toBe('game-1');
    expect(result.current.isNotEnabled).toBe(false);
  });

  it('does not fetch without a match id', () => {
    renderHook(() => useLiveMatch(undefined), { wrapper: createWrapper() });
    expect(mockFetchLiveMatchBundle).not.toHaveBeenCalled();
  });

  it('flags the not-enabled state without retrying', async () => {
    mockFetchLiveMatchBundle.mockRejectedValue(new LiveScoringNotEnabledError());

    const { result } = renderHook(() => useLiveMatch('match-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isNotEnabled).toBe(true);
  });
});

describe('deriveLiveMatch', () => {
  it('folds game totals from the round log', () => {
    const derived = deriveLiveMatch(
      bundle({
        games: [gameRow()],
        rounds: [
          roundRow({ round_number: 1, team1_score: 8, team2_score: 5 }), // +3 t1
          roundRow({ round_number: 2, team1_score: 0, team2_score: 12 }), // +12 t2
          roundRow({ round_number: 3, team1_score: 4, team2_score: 4 }), // wash
        ],
      })
    );

    expect(derived.currentGame?.totals).toEqual({ team1: 3, team2: 12 });
    expect(derived.currentGame?.nextRoundNumber).toBe(4);
    expect(derived.currentGame?.pendingWinnerSide).toBeNull();
  });

  it('detects a pending game winner at 21 with a 2-point lead', () => {
    const rounds = [
      roundRow({ round_number: 1, team1_score: 12, team2_score: 0 }),
      roundRow({ round_number: 2, team1_score: 9, team2_score: 0 }),
    ];
    const derived = deriveLiveMatch(bundle({ games: [gameRow()], rounds }));

    expect(derived.currentGame?.totals.team1).toBe(21);
    expect(derived.currentGame?.pendingWinnerSide).toBe(1);
  });

  it('derives match state from completed games (1-1 goes to game 3)', () => {
    const derived = deriveLiveMatch(
      bundle({
        games: [
          gameRow({ id: 'g1', game_number: 1, status: 'completed', winner_team_id: 'team-1' }),
          gameRow({ id: 'g2', game_number: 2, status: 'completed', winner_team_id: 'team-2' }),
        ],
      })
    );

    expect(derived.matchState.gameWins).toEqual({ team1: 1, team2: 1 });
    expect(derived.matchState.nextGameNumber).toBe(3);
    expect(derived.currentGame).toBeNull();
    expect(derived.lastCompletedGame?.game.id).toBe('g2');
  });

  it('alternates the next thrower from the latest round', () => {
    const derived = deriveLiveMatch(
      bundle({
        games: [gameRow()],
        rounds: [roundRow({ round_number: 1, team1_thrower_id: 'p1', team2_thrower_id: 'p3' })],
        gamePlayers: [
          {
            id: 'gp1',
            game_id: 'game-1',
            team_id: 'team-1',
            player_id: 'p1',
            slot: 1,
            created_at: '',
          },
          {
            id: 'gp2',
            game_id: 'game-1',
            team_id: 'team-1',
            player_id: 'p2',
            slot: 2,
            created_at: '',
          },
          {
            id: 'gp3',
            game_id: 'game-1',
            team_id: 'team-2',
            player_id: 'p3',
            slot: 1,
            created_at: '',
          },
          {
            id: 'gp4',
            game_id: 'game-1',
            team_id: 'team-2',
            player_id: 'p4',
            slot: 2,
            created_at: '',
          },
        ],
      })
    );

    expect(derived.currentGame?.nextThrowers).toEqual({
      team1ThrowerId: 'p2',
      team2ThrowerId: 'p4',
    });
  });
});
