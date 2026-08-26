import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpponentHistory } from '@/types/headToHead';

import { OpponentHistoryModal } from '../OpponentHistoryModal';

const mockUseOpponentHistory = vi.fn();
vi.mock('@/hooks/useHeadToHead', () => ({
  useOpponentHistory: (teamId: string, opponentId: string) =>
    mockUseOpponentHistory(teamId, opponentId),
}));

const summary = {
  matches_played: 5,
  wins: 3,
  losses: 2,
  win_pct: 60,
  game_wins: 8,
  game_losses: 4,
};

const match: OpponentHistory['matches'][number] = {
  id: 'm1',
  team1_id: 't1',
  team2_id: 'opp-1',
  team1_name: 'My Team',
  team2_name: 'Rivals',
  winner_id: 'opp-1',
  winner_name: 'Rivals',
  date: '2026-04-10T00:00:00.000Z',
  location: 'Court 3',
  team1_score: 1,
  team2_score: 2,
  team1_game_wins: 1,
  team2_game_wins: 2,
};

const renderModal = () =>
  render(
    <OpponentHistoryModal
      isOpen
      onClose={vi.fn()}
      teamId="t1"
      opponentId="opp-1"
      opponentName="Rivals"
    />
  );

describe('OpponentHistoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing until the history summary has loaded', () => {
    mockUseOpponentHistory.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderModal();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows summary stats and the computed game win rate', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: { summary, matches: [] },
      isLoading: false,
    });
    renderModal();
    expect(screen.getByText('Head-to-Head vs Rivals')).toBeInTheDocument();
    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('8 - 4')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument(); // 8 of 12 games
  });

  it('falls back to 0.0% game win rate when no games were played', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: { summary: { ...summary, game_wins: 0, game_losses: 0 }, matches: [] },
      isLoading: false,
    });
    renderModal();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('shows the empty state when there are no matches', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: { summary, matches: [] },
      isLoading: false,
    });
    renderModal();
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('renders match rows with scores and game counts', () => {
    mockUseOpponentHistory.mockReturnValue({
      data: { summary, matches: [match] },
      isLoading: false,
    });
    renderModal();
    expect(screen.getByText('My Team vs Rivals')).toBeInTheDocument();
    expect(screen.getByText('1 - 2')).toBeInTheDocument();
    expect(screen.getByText('Games: 1 - 2')).toBeInTheDocument();
    expect(screen.getByText('Court 3')).toBeInTheDocument();
  });

  describe('result badge', () => {
    const renderWithMatch = (overrides: Partial<typeof match>) => {
      mockUseOpponentHistory.mockReturnValue({
        data: { summary, matches: [{ ...match, ...overrides }] },
        isLoading: false,
      });
      renderModal();
    };

    // The viewing team is 't1'. Its own result must drive the badge, whichever
    // side of the fixture it sits on.
    it('shows L when the team is named first and the opponent won', () => {
      renderWithMatch({ team1_id: 't1', team2_id: 'opp-1', winner_id: 'opp-1' });
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('shows W when the team is named first and the team won', () => {
      renderWithMatch({ team1_id: 't1', team2_id: 'opp-1', winner_id: 't1' });
      expect(screen.getByText('W')).toBeInTheDocument();
    });

    it('shows W when the team is named second and the team won', () => {
      renderWithMatch({ team1_id: 'opp-1', team2_id: 't1', winner_id: 't1' });
      expect(screen.getByText('W')).toBeInTheDocument();
    });

    it('shows L when the team is named second and the opponent won', () => {
      renderWithMatch({ team1_id: 'opp-1', team2_id: 't1', winner_id: 'opp-1' });
      expect(screen.getByText('L')).toBeInTheDocument();
    });

    it('shows T for a completed match with no winner', () => {
      renderWithMatch({ winner_id: null, winner_name: null });
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    // teams.name has no unique constraint. When both teams carry the same name
    // every name-based comparison is true, which read every result as a loss.
    it('still shows W when both teams share a name', () => {
      renderWithMatch({
        team1_id: 't1',
        team2_id: 'opp-1',
        team1_name: 'Rivals',
        team2_name: 'Rivals',
        winner_id: 't1',
        winner_name: 'Rivals',
      });
      expect(screen.getByText('W')).toBeInTheDocument();
    });

    it('still shows L when both teams share a name and the opponent won', () => {
      renderWithMatch({
        team1_id: 't1',
        team2_id: 'opp-1',
        team1_name: 'Rivals',
        team2_name: 'Rivals',
        winner_id: 'opp-1',
        winner_name: 'Rivals',
      });
      expect(screen.getByText('L')).toBeInTheDocument();
    });
  });
});
