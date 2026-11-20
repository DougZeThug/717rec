import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ─── Hook mocks (children render for real) ────────────────────────────────────

const mockPausedCount = vi.hoisted(() => ({ value: 0 }));
const mockUnsettledCount = vi.hoisted(() => ({ value: 0 }));
vi.mock('@/hooks/live-scoring/usePausedRoundCount', () => ({
  usePausedRoundCount: () => mockPausedCount.value,
  useUnsettledRoundCount: () => mockUnsettledCount.value,
}));

const mockBeforeUnloadWarning = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useBeforeUnloadWarning', () => ({
  useBeforeUnloadWarning: mockBeforeUnloadWarning,
}));

vi.mock('@/hooks/live-scoring/useRoundSavedSound', () => ({
  useRoundSavedSound: () => ({
    soundEnabled: false,
    setSoundEnabled: vi.fn(),
    playRoundSaved: vi.fn(),
  }),
}));

import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';

import { ActiveGamePanel } from '../ActiveGamePanel';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const game = {
  game: {
    id: 'game-1',
    match_id: 'match-1',
    game_number: 1,
    status: 'in_progress',
    updated_at: '2026-11-20T01:23:45.123456+00:00',
  },
  rounds: [],
  totals: { team1: 0, team2: 0 },
  pendingWinnerSide: null,
  players: { team1: [], team2: [] },
  nextRoundNumber: 1,
  nextThrowers: { team1ThrowerId: null, team2ThrowerId: null },
} as unknown as LiveGameDerived;

type PanelProps = React.ComponentProps<typeof ActiveGamePanel>;

const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isPaused: false };

const renderPanel = (panelGame: LiveGameDerived = game, canScore = false) =>
  render(
    <ActiveGamePanel
      game={panelGame}
      matchId="match-1"
      team1Name="Baggers"
      team2Name="Tossers"
      team1Id="team-1"
      team2Id="team-2"
      playerNames={{}}
      canScore={canScore}
      rulesLabel="First to 21"
      submitRound={mutation as unknown as PanelProps['submitRound']}
      undoLastRound={mutation as unknown as PanelProps['undoLastRound']}
      confirmGameComplete={mutation as unknown as PanelProps['confirmGameComplete']}
    />
  );

// ─── Leave warning ────────────────────────────────────────────────────────────

describe('leave warning while rounds are held or sending', () => {
  it('turns the warning on while a round waits for a signal', () => {
    mockPausedCount.value = 2;
    mockUnsettledCount.value = 2;
    renderPanel();
    expect(mockBeforeUnloadWarning).toHaveBeenLastCalledWith(true);
  });

  it('keeps the warning on while a round is still sending after reconnect', () => {
    // Back online, so nothing is paused, but the round has not landed yet and
    // can still be refused. A reload now would lose it.
    mockPausedCount.value = 0;
    mockUnsettledCount.value = 1;
    renderPanel();
    expect(mockBeforeUnloadWarning).toHaveBeenLastCalledWith(true);
  });

  it('leaves the warning off when no round is held or sending', () => {
    mockPausedCount.value = 0;
    mockUnsettledCount.value = 0;
    renderPanel();
    expect(mockBeforeUnloadWarning).toHaveBeenLastCalledWith(false);
    expect(mockBeforeUnloadWarning).not.toHaveBeenCalledWith(true);
  });
});

// ─── End game ─────────────────────────────────────────────────────────────────

describe('ending a won game', () => {
  // The screen sends the game version it loaded, untouched. The service uses it
  // to refuse a finish when someone reopened or changed the game meanwhile.
  it('sends the raw updated_at the screen loaded with the end request', async () => {
    mockPausedCount.value = 0;
    mockUnsettledCount.value = 0;
    const wonGame = {
      ...game,
      totals: { team1: 21, team2: 5 },
      pendingWinnerSide: 1,
    } as unknown as LiveGameDerived;
    renderPanel(wonGame, true);

    await userEvent.click(screen.getByRole('button', { name: /end game 1/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'End game' }));

    expect(mutation.mutate).toHaveBeenCalledWith({
      gameId: 'game-1',
      winnerTeamId: 'team-1',
      finalTotals: { team1: 21, team2: 5 },
      seenUpdatedAt: '2026-11-20T01:23:45.123456+00:00',
    });
  });
});
