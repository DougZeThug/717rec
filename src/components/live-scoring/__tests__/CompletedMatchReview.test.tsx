import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;

import { CompletedMatchReview } from '../CompletedMatchReview';

const round = (overrides: Partial<MatchRoundRow> = {}): MatchRoundRow => ({
  id: `round-${overrides.round_number ?? 1}-${overrides.team1_thrower_id ?? 'p1'}`,
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

const onReopen = vi.fn();

const renderReview = (rounds: MatchRoundRow[], { isAdmin = false } = {}) =>
  render(
    <CompletedMatchReview
      team1Name="Baggers"
      team2Name="Tossers"
      winnerName="Baggers"
      gameWins={{ team1: 2, team2: 0 }}
      games={[]}
      rounds={rounds}
      playerNames={{ p1: 'Doug', p2: 'Sara' }}
      isAdmin={isAdmin}
      isReopening={false}
      onReopen={onReopen}
    />
  );

const rowFor = (name: string) => {
  const cell = screen.getByText(name);
  const tr = cell.closest('tr');
  if (!tr) throw new Error(`No table row for ${name}`);
  return within(tr);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CompletedMatchReview', () => {
  it('shows Hole%, Board% and four-baggers from bag-tracked rounds', () => {
    renderReview([
      round({
        round_number: 1,
        team1_score: 12,
        team2_score: 5,
        team1_bags_in: 4,
        team1_bags_on: 0,
        team1_bags_off: 0,
        team2_bags_in: 1,
        team2_bags_on: 2,
        team2_bags_off: 1,
      }),
      round({
        round_number: 2,
        team1_score: 5,
        team2_score: 0,
        team1_bags_in: 1,
        team1_bags_on: 2,
        team1_bags_off: 1,
        team2_bags_in: 0,
        team2_bags_on: 0,
        team2_bags_off: 4,
      }),
    ]);

    // Recap summary now renders above the details table.
    expect(screen.getByText('Top Performer')).toBeInTheDocument();
    expect(screen.getByText('Round Stats')).toBeInTheDocument();

    // Doug: 5 in, 2 on, 1 off of 8 bags -> Hole 63%, Board 25%, one 4-bagger.
    const doug = rowFor('Doug');
    expect(doug.getByText('63%')).toBeInTheDocument();
    expect(doug.getByText('25%')).toBeInTheDocument();
    expect(doug.getByText('1')).toBeInTheDocument();
    // Sara: 1 in, 2 on, 5 off of 8 bags -> Hole 13%, Board 25%.
    const sara = rowFor('Sara');
    expect(sara.getByText('13%')).toBeInTheDocument();
  });

  it('shows dashes (unknown), not 0%, for players without bag data', () => {
    renderReview([round({ round_number: 1 })]); // no bag fields

    const doug = rowFor('Doug');
    // Hole%, Board% and 4B all render as dashes.
    expect(doug.getAllByText('–').length).toBeGreaterThanOrEqual(3);
    expect(doug.queryByText('0%')).not.toBeInTheDocument();
  });

  it('keeps PPR alongside the bag columns', () => {
    renderReview([round({ round_number: 1, team1_score: 8 })]);
    expect(rowFor('Doug').getByText('8.00')).toBeInTheDocument();
  });

  it('offers reopen to admins only', async () => {
    renderReview([round()], { isAdmin: true });
    await userEvent.click(screen.getByRole('button', { name: /reopen match/i }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reopen match' }));
    expect(onReopen).toHaveBeenCalled();
  });

  it('hides reopen from non-admins', () => {
    renderReview([round()]);
    expect(screen.queryByRole('button', { name: /reopen match/i })).not.toBeInTheDocument();
  });
});
