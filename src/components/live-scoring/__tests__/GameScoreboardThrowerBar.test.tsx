import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { GameScoreboard } from '../GameScoreboard';
import { ThrowerBar } from '../ThrowerBar';

describe('GameScoreboard', () => {
  it('shows the current game score, rules, and leader emphasis', () => {
    render(
      <GameScoreboard
        gameNumber={2}
        team1Name="Baggers"
        team2Name="Tossers"
        totals={{ team1: 12, team2: 9 }}
        leaderSide={1}
        rulesLabel="First to 21, win by 2"
      />
    );

    expect(screen.getByText('Game 2 · First to 21, win by 2')).toBeInTheDocument();
    expect(screen.getByTestId('team1-total')).toHaveTextContent('12');
    expect(screen.getByTestId('team2-total')).toHaveTextContent('9');
    expect(screen.getByTestId('team1-total')).toHaveClass('text-primary');
    expect(screen.getByTestId('team2-total')).not.toHaveClass('text-primary');
    expect(screen.getByText('Baggers')).toBeInTheDocument();
    expect(screen.getByText('Tossers')).toBeInTheDocument();
  });
});

describe('ThrowerBar', () => {
  it('reflects the next throwers and lets a scorer override them', async () => {
    const onChangeTeam1 = vi.fn();
    const onChangeTeam2 = vi.fn();

    render(
      <ThrowerBar
        team1Label="Baggers"
        team2Label="Tossers"
        team1Options={[
          { id: 'p1', name: 'Doug' },
          { id: 'p2', name: 'Bill' },
        ]}
        team2Options={[
          { id: 'p3', name: 'Sara' },
          { id: 'p4', name: 'Anne' },
        ]}
        team1ActiveId="p2"
        team2ActiveId="p4"
        onChangeTeam1={onChangeTeam1}
        onChangeTeam2={onChangeTeam2}
      />
    );

    expect(screen.getByText('Baggers throwing')).toBeInTheDocument();
    expect(screen.getByText('Tossers throwing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bill' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Anne' })).toHaveAttribute('aria-pressed', 'true');

    // Mobile-critical touch targets use the component's current min-height contract.
    expect(screen.getByRole('button', { name: 'Bill' })).toHaveClass('min-h-[44px]');

    await userEvent.click(screen.getByRole('button', { name: 'Doug' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sara' }));

    expect(onChangeTeam1).toHaveBeenCalledWith('p1');
    expect(onChangeTeam2).toHaveBeenCalledWith('p3');
  });

  it('disables all thrower override buttons while scoring is busy', () => {
    render(
      <ThrowerBar
        team1Label="Baggers"
        team2Label="Tossers"
        team1Options={[{ id: 'p1', name: 'Doug' }]}
        team2Options={[{ id: 'p3', name: 'Sara' }]}
        team1ActiveId="p1"
        team2ActiveId="p3"
        onChangeTeam1={vi.fn()}
        onChangeTeam2={vi.fn()}
        disabled
      />
    );

    const baggersGroup = screen.getByText('Baggers throwing').parentElement;
    expect(baggersGroup).toBeInstanceOf(HTMLElement);
    for (const button of within(baggersGroup as HTMLElement).getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: 'Sara' })).toBeDisabled();
  });
});
