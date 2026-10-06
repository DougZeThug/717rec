import { render } from '@testing-library/react';
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
  game: { id: 'game-1', match_id: 'match-1', game_number: 1, status: 'in_progress' },
  rounds: [],
  totals: { team1: 0, team2: 0 },
  pendingWinnerSide: null,
  players: { team1: [], team2: [] },
  nextRoundNumber: 1,
  nextThrowers: { team1ThrowerId: null, team2ThrowerId: null },
} as unknown as LiveGameDerived;

type PanelProps = React.ComponentProps<typeof ActiveGamePanel>;

const mutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, isPaused: false };

const renderPanel = () =>
  render(
    <ActiveGamePanel
      game={game}
      matchId="match-1"
      team1Name="Baggers"
      team2Name="Tossers"
      team1Id="team-1"
      team2Id="team-2"
      playerNames={{}}
      canScore={false}
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
