import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LiveGameDerived } from '@/hooks/live-scoring/useLiveMatch';

import { GameCorrectionCard } from '../GameCorrectionCard';

const completedGame = {
  game: { id: 'game-1', game_number: 1, status: 'completed', winner_team_id: 'team-a' },
  totals: { team1: 21, team2: 15 },
} as unknown as LiveGameDerived;

describe('GameCorrectionCard', () => {
  // jsdom does no layout, so this pins the class. On a 320-390px phone the header row squeezed
  // "Change winner" to 54-64px and its words spilled over the title and past the card edge.
  it('lets "Change winner" wrap under the game title on a narrow screen', () => {
    render(
      <GameCorrectionCard
        game={completedGame}
        rounds={[]}
        team1Id="team-a"
        team2Id="team-b"
        team1Name="Fake Team One"
        team2Name="Fake Team Two"
        readOnly={false}
        onEditRound={vi.fn()}
        onDeleteRound={vi.fn()}
        onChangeWinner={vi.fn()}
      />
    );

    const header = screen.getByRole('button', { name: 'Change winner' }).parentElement;
    expect(header).toHaveClass('flex-row', 'flex-wrap', 'justify-between');
  });
});
