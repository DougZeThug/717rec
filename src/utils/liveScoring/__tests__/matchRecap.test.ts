import { describe, expect, it } from 'vitest';

import type { Tables } from '@/integrations/supabase/types';
type MatchRoundRow = Tables<'match_rounds'>;

import { buildPlayerTeamMap, computeMatchRecap } from '../matchRecap';

const round = (overrides: Partial<MatchRoundRow> = {}): MatchRoundRow => ({
  id: `r-${overrides.round_number ?? 1}-${overrides.team1_thrower_id ?? 'p1'}`,
  match_id: 'm1',
  game_id: 'g1',
  round_number: 1,
  team1_score: 4,
  team2_score: 2,
  net_points: 2,
  winner_team: 1,
  team1_thrower_id: 'p1',
  team2_thrower_id: 'p3',
  team1_bags_in: null,
  team1_bags_on: null,
  team1_bags_off: null,
  team2_bags_in: null,
  team2_bags_on: null,
  team2_bags_off: null,
  entered_by_user_id: 'u1',
  created_at: '',
  ...overrides,
});

const games = [
  {
    game: { id: 'g1', game_number: 1, winner_team_id: 'team1' },
    totals: { team1: 21, team2: 12 },
  },
  {
    game: { id: 'g2', game_number: 2, winner_team_id: 'team2' },
    totals: { team1: 20, team2: 21 },
  },
  {
    game: { id: 'g3', game_number: 3, winner_team_id: 'team1' },
    totals: { team1: 22, team2: 20 },
  },
];

const baseInput = {
  games,
  playerNames: { p1: 'Doug', p2: 'Dan', p3: 'Alex', p4: 'Jordan' },
  playerTeamMap: { p1: 1 as const, p2: 1 as const, p3: 2 as const, p4: 2 as const },
  team1Id: 'team1',
  team2Id: 'team2',
  team1Name: 'Baggers',
  team2Name: 'Tossers',
};

describe('computeMatchRecap', () => {
  it('picks the top performer by PPR with min-rounds gate', () => {
    const recap = computeMatchRecap({
      ...baseInput,
      rounds: [
        round({ round_number: 1, team1_thrower_id: 'p1', team1_score: 8 }),
        round({ round_number: 2, team1_thrower_id: 'p1', team1_score: 6 }),
        round({ round_number: 3, team1_thrower_id: 'p2', team1_score: 12 }), // only 1 round -> ineligible
      ],
    });
    expect(recap.topPerformer?.name).toBe('Doug');
    expect(recap.topPerformer?.ppr).toBe(7);
  });

  it('picks most consistent by lowest off-board rate above min bags', () => {
    const recap = computeMatchRecap({
      ...baseInput,
      rounds: [
        round({
          round_number: 1,
          team1_thrower_id: 'p1',
          team1_bags_in: 1,
          team1_bags_on: 3,
          team1_bags_off: 0,
          team2_thrower_id: 'p3',
          team2_bags_in: 1,
          team2_bags_on: 1,
          team2_bags_off: 2,
        }),
        round({
          round_number: 2,
          team1_thrower_id: 'p1',
          team1_bags_in: 2,
          team1_bags_on: 2,
          team1_bags_off: 0,
          team2_thrower_id: 'p3',
          team2_bags_in: 0,
          team2_bags_on: 1,
          team2_bags_off: 3,
        }),
      ],
    });
    // Doug: 0/8 off -> 0%. Alex: 5/8 off. Doug is most consistent.
    expect(recap.mostConsistent?.name).toBe('Doug');
    expect(recap.mostConsistent?.offPct).toBe(0);
  });

  it('returns null most-consistent when nobody has bag data', () => {
    const recap = computeMatchRecap({
      ...baseInput,
      rounds: [round({ round_number: 1 }), round({ round_number: 2 })],
    });
    expect(recap.mostConsistent).toBeNull();
  });

  it('picks the closest-margin game as the key game', () => {
    const recap = computeMatchRecap({ ...baseInput, rounds: [round()] });
    // Game 3 has margin 2, game 2 has margin 1 -> game 2 is the key game.
    expect(recap.keyGame?.gameNumber).toBe(2);
    expect(recap.keyGame?.winnerName).toBe('Tossers');
    expect(recap.keyGame?.team1Score).toBe(20);
    expect(recap.keyGame?.team2Score).toBe(21);
  });

  it('sums per-team bag totals only from bag-tracked rounds', () => {
    const recap = computeMatchRecap({
      ...baseInput,
      rounds: [
        round({
          round_number: 1,
          team1_bags_in: 3,
          team1_bags_on: 1,
          team1_bags_off: 0,
          team2_bags_in: 1,
          team2_bags_on: 2,
          team2_bags_off: 1,
        }),
        round({ round_number: 2 }), // no bag data -> skipped
      ],
    });
    const team1 = recap.teams.find((t) => t.side === 1);
    const team2 = recap.teams.find((t) => t.side === 2);
    if (!team1 || !team2) throw new Error('missing team');
    expect(team1.bagTotals).toEqual({ in: 3, on: 1, off: 0, total: 4 });
    expect(team2.bagTotals).toEqual({ in: 1, on: 2, off: 1, total: 4 });
  });

  it('attributes players to their team side', () => {
    const recap = computeMatchRecap({
      ...baseInput,
      rounds: [
        round({ round_number: 1, team1_thrower_id: 'p1', team2_thrower_id: 'p3' }),
        round({ round_number: 2, team1_thrower_id: 'p2', team2_thrower_id: 'p4' }),
      ],
    });
    const team1 = recap.teams.find((t) => t.side === 1);
    const team2 = recap.teams.find((t) => t.side === 2);
    if (!team1 || !team2) throw new Error('missing team');
    const team1Names = team1.players.map((p) => p.name).sort();
    const team2Names = team2.players.map((p) => p.name).sort();
    expect(team1Names).toEqual(['Dan', 'Doug']);
    expect(team2Names).toEqual(['Alex', 'Jordan']);
  });
});

describe('buildPlayerTeamMap', () => {
  it('maps player_ids to the side matching team1Id', () => {
    const map = buildPlayerTeamMap(
      [
        { player_id: 'p1', team_id: 'team1' },
        { player_id: 'p3', team_id: 'team2' },
        { player_id: 'p1', team_id: 'team1' }, // duplicate ignored
      ],
      'team1'
    );
    expect(map).toEqual({ p1: 1, p3: 2 });
  });
});
