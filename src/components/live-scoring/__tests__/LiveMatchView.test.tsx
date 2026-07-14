import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Hook mocks (children render for real) ────────────────────────────────────

const mockSubmitRound = { mutate: vi.fn(), isPending: false };
const mockUndoLastRound = { mutate: vi.fn(), isPending: false };
const mockStartGame = { mutate: vi.fn(), isPending: false };
const mockConfirmGameComplete = { mutate: vi.fn(), isPending: false };
const mockReopenGame = { mutate: vi.fn(), isPending: false };
const mockUpdateGamePlayers = { mutate: vi.fn(), isPending: false };
const mockFinalize = { mutate: vi.fn(), isPending: false };
const mockReopen = { mutate: vi.fn(), isPending: false };
const mockAddPlayer = { mutate: vi.fn(), isPending: false };

vi.mock('@/hooks/live-scoring/useRoundMutations', () => ({
  useRoundMutations: () => ({ submitRound: mockSubmitRound, undoLastRound: mockUndoLastRound }),
}));

vi.mock('@/hooks/live-scoring/useGameFlow', () => ({
  useGameFlow: () => ({
    startGame: mockStartGame,
    confirmGameComplete: mockConfirmGameComplete,
    updateGamePlayers: mockUpdateGamePlayers,
    reopenGame: mockReopenGame,
  }),
}));

vi.mock('@/hooks/live-scoring/useFinalizeMatch', () => ({
  useFinalizeMatch: () => ({ finalize: mockFinalize, reopen: mockReopen }),
}));

vi.mock('@/hooks/live-scoring/useTeamPlayers', () => ({
  useTeamPlayers: (teamId: string | undefined) => ({
    players:
      teamId === 'team-1'
        ? [
            {
              id: 'p1',
              team_id: 'team-1',
              display_name: 'Doug',
              profile_id: null,
              is_active: true,
              created_at: '',
            },
            {
              id: 'p2',
              team_id: 'team-1',
              display_name: 'Bill',
              profile_id: null,
              is_active: true,
              created_at: '',
            },
          ]
        : [
            {
              id: 'p3',
              team_id: 'team-2',
              display_name: 'Sara',
              profile_id: null,
              is_active: true,
              created_at: '',
            },
            {
              id: 'p4',
              team_id: 'team-2',
              display_name: 'Anne',
              profile_id: null,
              is_active: true,
              created_at: '',
            },
          ],
    isLoading: false,
    error: null,
    addPlayer: mockAddPlayer,
  }),
}));

import { deriveLiveMatch } from '@/hooks/live-scoring/useLiveMatch';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';
import { expectNoAxeViolations } from '@/test/a11y';

import { LiveMatchView } from '../LiveMatchView';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseMatch = {
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
};

const makeBundle = (overrides: Partial<LiveMatchBundle> = {}): LiveMatchBundle =>
  ({
    match: { ...baseMatch },
    games: [],
    rounds: [],
    gamePlayers: [],
    ...overrides,
  }) as LiveMatchBundle;

const game = (overrides: Record<string, unknown> = {}) =>
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

const round = (overrides: Record<string, unknown> = {}) =>
  ({
    id: `round-${overrides.round_number ?? 1}-${overrides.game_id ?? 'game-1'}`,
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

const gamePlayers = (gameId: string): LiveMatchBundle['gamePlayers'] => [
  { id: 'gp1', game_id: gameId, team_id: 'team-1', player_id: 'p1', slot: 1, created_at: '' },
  { id: 'gp2', game_id: gameId, team_id: 'team-1', player_id: 'p2', slot: 2, created_at: '' },
  { id: 'gp3', game_id: gameId, team_id: 'team-2', player_id: 'p3', slot: 1, created_at: '' },
  { id: 'gp4', game_id: gameId, team_id: 'team-2', player_id: 'p4', slot: 2, created_at: '' },
];

const gridButton = (grid: HTMLElement, label: string): HTMLButtonElement => {
  const button = Array.from(grid.querySelectorAll('button')).find((b) => b.textContent === label);
  if (!button) throw new Error(`No score button labelled ${label}`);
  return button;
};

const renderView = (
  bundle: LiveMatchBundle,
  { canScore = true, isAdmin = false }: { canScore?: boolean; isAdmin?: boolean } = {}
) =>
  render(
    <LiveMatchView
      matchId="match-1"
      bundle={bundle}
      derived={deriveLiveMatch(bundle)}
      canScore={canScore}
      isAdmin={isAdmin}
      realtimeStatus="SUBSCRIBED"
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── States ───────────────────────────────────────────────────────────────────

describe('component accessibility', () => {
  it('has no WCAG 2 A/AA axe violations in pre-game setup', async () => {
    const { container } = renderView(makeBundle());

    await expectNoAxeViolations(container);
  });

  it('has no WCAG 2 A/AA axe violations in active scoring view', async () => {
    const { container } = renderView(
      makeBundle({
        games: [game()],
        rounds: [round()],
        gamePlayers: gamePlayers('game-1'),
      })
    );

    await expectNoAxeViolations(container);
  });
});

describe('pre-game state', () => {
  it('shows Game 1 setup for a scorer', () => {
    renderView(makeBundle());
    expect(screen.getByText('Game 1 setup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start game 1/i })).toBeInTheDocument();
  });

  it('shows a waiting message for spectators', () => {
    renderView(makeBundle(), { canScore: false });
    expect(screen.getByText(/waiting for a scorekeeper/i)).toBeInTheDocument();
    expect(screen.getByText('View only')).toBeInTheDocument();
  });
});

describe('in-game state', () => {
  const inGameBundle = () =>
    makeBundle({
      games: [game()],
      rounds: [round()],
      gamePlayers: gamePlayers('game-1'),
    });

  it('shows the folded scoreboard, throwers, input and log', () => {
    renderView(inGameBundle());

    expect(screen.getByTestId('team1-total')).toHaveTextContent('3');
    expect(screen.getByTestId('team2-total')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: /save round/i })).toBeInTheDocument();
    // Rotation: p1/p3 threw round 1, so p2/p4 are up.
    expect(screen.getByRole('button', { name: 'Bill' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Anne' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('list', { name: /round history/i })).toBeInTheDocument();
  });

  it('submits a round with the rotated throwers and next round number', async () => {
    renderView(inGameBundle());

    const grids = screen.getAllByRole('group');
    await userEvent.click(gridButton(grids[0], '9'));
    await userEvent.click(gridButton(grids[1], '0'));
    await userEvent.click(screen.getByRole('button', { name: /save round/i }));

    expect(mockSubmitRound.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1',
        roundNumber: 2,
        team1Score: 9,
        team2Score: 0,
        team1ThrowerId: 'p2',
        team2ThrowerId: 'p4',
      })
    );
  });

  it('hides all scoring controls from spectators', () => {
    renderView(inGameBundle(), { canScore: false });

    expect(screen.queryByRole('button', { name: /save round/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('team1-total')).toBeInTheDocument();
  });

  it('does NOT offer the banner at 21-20 (win by 2) — scoring continues', () => {
    const bundle = makeBundle({
      games: [game()],
      rounds: [
        round({ round_number: 1, team1_score: 12, team2_score: 0, net_points: 12, winner_team: 1 }),
        round({ round_number: 2, team1_score: 9, team2_score: 0, net_points: 9, winner_team: 1 }),
        round({ round_number: 3, team1_score: 0, team2_score: 12, net_points: 12, winner_team: 2 }),
        round({ round_number: 4, team1_score: 0, team2_score: 8, net_points: 8, winner_team: 2 }),
      ],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    expect(screen.getByTestId('team1-total')).toHaveTextContent('21');
    expect(screen.getByTestId('team2-total')).toHaveTextContent('20');
    expect(screen.queryByRole('button', { name: /end game/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save round/i })).toBeInTheDocument();
  });

  it('offers the banner at 22-20 (2-point lead past 21)', () => {
    const bundle = makeBundle({
      games: [game()],
      rounds: [
        round({ round_number: 1, team1_score: 12, team2_score: 0, net_points: 12, winner_team: 1 }),
        round({ round_number: 2, team1_score: 9, team2_score: 0, net_points: 9, winner_team: 1 }),
        round({ round_number: 3, team1_score: 0, team2_score: 12, net_points: 12, winner_team: 2 }),
        round({ round_number: 4, team1_score: 0, team2_score: 8, net_points: 8, winner_team: 2 }),
        round({ round_number: 5, team1_score: 1, team2_score: 0, net_points: 1, winner_team: 1 }),
      ],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    expect(screen.getByText(/baggers wins game 1, 22–20/iu)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end game 1/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save round/i })).not.toBeInTheDocument();
  });

  it('offers the game-won banner once totals cross 21 with a 2-point lead', () => {
    const bundle = makeBundle({
      games: [game()],
      rounds: [
        round({ round_number: 1, team1_score: 12, team2_score: 0, net_points: 12, winner_team: 1 }),
        round({ round_number: 2, team1_score: 9, team2_score: 0, net_points: 9, winner_team: 1 }),
      ],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    expect(screen.getByText(/baggers wins game 1, 21–0/iu)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end game 1/i })).toBeInTheDocument();
    // No further round entry while the game is decided.
    expect(screen.queryByRole('button', { name: /save round/i })).not.toBeInTheDocument();
  });

  it('confirms game completion through the dialog', async () => {
    const bundle = makeBundle({
      games: [game()],
      rounds: [
        round({ round_number: 1, team1_score: 12, team2_score: 0, net_points: 12, winner_team: 1 }),
        round({ round_number: 2, team1_score: 9, team2_score: 0, net_points: 9, winner_team: 1 }),
      ],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    await userEvent.click(screen.getByRole('button', { name: /end game 1/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'End game' }));

    expect(mockConfirmGameComplete.mutate).toHaveBeenCalledWith({
      gameId: 'game-1',
      winnerTeamId: 'team-1',
      finalTotals: { team1: 21, team2: 0 },
    });
  });
});

describe('between games', () => {
  it('prefills the next game setup with the previous game players', () => {
    const bundle = makeBundle({
      games: [game({ status: 'completed', winner_team_id: 'team-1' })],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    expect(screen.getByText('Game 2 setup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doug & Bill' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sara & Anne' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen game 1/i })).toBeInTheDocument();
  });

  it('starts the next game with the chosen players', async () => {
    const bundle = makeBundle({
      games: [game({ status: 'completed', winner_team_id: 'team-1' })],
      gamePlayers: gamePlayers('game-1'),
    });
    renderView(bundle);

    await userEvent.click(screen.getByRole('button', { name: /start game 2/i }));

    expect(mockStartGame.mutate).toHaveBeenCalledWith({
      gameNumber: 2,
      team1Id: 'team-1',
      team2Id: 'team-2',
      team1PlayerIds: ['p1', 'p2'],
      team2PlayerIds: ['p3', 'p4'],
    });
  });
});

describe('match decided (not yet official)', () => {
  const decidedBundle = () =>
    makeBundle({
      games: [
        game({ id: 'g1', game_number: 1, status: 'completed', winner_team_id: 'team-2' }),
        game({ id: 'g2', game_number: 2, status: 'completed', winner_team_id: 'team-2' }),
      ],
    });

  it('offers the finalize flow to scorers', async () => {
    renderView(decidedBundle());

    expect(screen.getByText(/tossers wins the match 0–2/iu)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save official result/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Save result' }));

    expect(mockFinalize.mutate).toHaveBeenCalled();
  });

  it('spectators see the result but no finalize button', () => {
    renderView(decidedBundle(), { canScore: false });

    expect(screen.getByText(/tossers wins the match/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save official result/i })).not.toBeInTheDocument();
  });
});

describe('completed match', () => {
  const completedBundle = () =>
    makeBundle({
      match: {
        ...baseMatch,
        iscompleted: true,
        winner_id: 'team-1',
        team1_game_wins: 2,
        team2_game_wins: 1,
      },
      games: [
        game({ id: 'g1', game_number: 1, status: 'completed', winner_team_id: 'team-1' }),
        game({ id: 'g2', game_number: 2, status: 'completed', winner_team_id: 'team-2' }),
        game({ id: 'g3', game_number: 3, status: 'completed', winner_team_id: 'team-1' }),
      ],
      rounds: [round()],
    });

  it('shows the official result and player stats', () => {
    renderView(completedBundle());

    expect(screen.getByText(/baggers wins the match/i)).toBeInTheDocument();
    // Header pips and the review card both show the official 2–1.
    expect(screen.getAllByText('2–1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Player stats')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reopen match/i })).not.toBeInTheDocument();
  });

  it('lets an admin reopen the match after confirmation', async () => {
    renderView(completedBundle(), { isAdmin: true });

    await userEvent.click(screen.getByRole('button', { name: /reopen match/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reopen match' }));

    expect(mockReopen.mutate).toHaveBeenCalled();
  });
});
