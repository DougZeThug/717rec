import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;

import { RoundLog } from '../RoundLog';

const round = (overrides: Partial<MatchRoundRow> = {}): MatchRoundRow => ({
  id: `round-${overrides.round_number ?? 1}`,
  match_id: 'match-1',
  game_id: 'game-1',
  round_number: 1,
  team1_score: 8,
  team2_score: 5,
  net_points: 3,
  winner_team: 1,
  team1_thrower_id: 'p1',
  team2_thrower_id: 'p2',
  team1_bags_in: null,
  team1_bags_on: null,
  team1_bags_off: null,
  team2_bags_in: null,
  team2_bags_on: null,
  team2_bags_off: null,
  entered_by_user_id: 'user-1',
  created_at: '',
  ...overrides,
});

const playerNames = { p1: 'Doug', p2: 'Sara' };

describe('RoundLog', () => {
  it('shows an empty state when no rounds exist', () => {
    render(<RoundLog rounds={[]} team1Name="Baggers" team2Name="Tossers" playerNames={{}} />);
    expect(screen.getByText(/no rounds yet/i)).toBeInTheDocument();
  });

  it('shows compact bag labels only for bag-tracked rounds', () => {
    render(
      <RoundLog
        rounds={[
          round({
            round_number: 1,
            team1_bags_in: 2,
            team1_bags_on: 2,
            team1_bags_off: 0,
            team2_bags_in: 1,
            team2_bags_on: 2,
            team2_bags_off: 1,
          }),
          round({
            round_number: 2,
            team1_score: 4,
            team2_score: 4,
            net_points: 0,
            winner_team: null,
          }),
        ]}
        team1Name="Baggers"
        team2Name="Tossers"
        playerNames={playerNames}
      />
    );

    const items = screen.getAllByRole('listitem');
    // Newest first: round 2 (no bags) then round 1 (bags).
    expect(items[0]).not.toHaveTextContent('IN');
    expect(items[0]).toHaveTextContent('Wash');
    expect(items[1]).toHaveTextContent('2IN 2ON');
    expect(items[1]).toHaveTextContent('1IN 2ON');
    expect(items[1]).toHaveTextContent('Baggers +3');
  });

  it('shows thrower names and the raw score line', () => {
    render(
      <RoundLog
        rounds={[round()]}
        team1Name="Baggers"
        team2Name="Tossers"
        playerNames={playerNames}
      />
    );

    expect(screen.getByText(/doug vs sara/i)).toBeInTheDocument();
    expect(screen.getByText('8–5')).toBeInTheDocument();
  });
});
