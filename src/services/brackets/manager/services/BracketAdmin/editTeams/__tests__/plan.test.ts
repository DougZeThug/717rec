import { describe, expect, it } from 'vitest';

import type { StorageMatch } from '../../../../types/BracketServiceTypes';
import type { EditTeamsContext } from '../context';
import { applyFields, assertFootprint } from '../footprint';
import { planLosersChanges } from '../losersPlan';
import type { WantedMatch } from '../occupancy';
import { planOccupancy } from '../occupancy';
import type { Occupant } from '../types';
import { planWinnersChanges } from '../winnersPlan';

/**
 * A size-4 single elimination: Round 1 Match 1 = P1 vs P2 (real), Round 1
 * Match 2 = P3 vs BYE (walkover, P3 already in Round 2 Match 1).
 */
function fixture(overrides: { settings?: Record<string, unknown>; roundTwo?: boolean } = {}) {
  const matches: StorageMatch[] = [
    {
      id: 1,
      stage_id: 1,
      group_id: 1,
      round_id: 11,
      number: 1,
      status: 2,
      opponent1: { id: 1, position: 1 },
      opponent2: { id: 2, position: 4 },
    },
    {
      id: 2,
      stage_id: 1,
      group_id: 1,
      round_id: 11,
      number: 2,
      status: 0,
      opponent1: { id: 3, position: 2, result: 'win' },
      opponent2: null,
    },
  ];
  if (overrides.roundTwo !== false) {
    matches.push({
      id: 3,
      stage_id: 1,
      group_id: 1,
      round_id: 12,
      number: 1,
      status: 1,
      opponent1: { id: null },
      opponent2: { id: 3 },
    });
  }
  const ctx: EditTeamsContext = {
    match: matches[1],
    stage: {
      id: 1,
      tournament_id: 'b1',
      name: 'S',
      type: 'single_elimination',
      number: 1,
      settings: overrides.settings ?? { size: 4 },
    },
    groupNumberById: new Map([[1, 1]]),
    roundNumberById: new Map([
      [11, 1],
      [12, 2],
    ]),
    stageMatches: matches,
    participants: [1, 2, 3, 4].map((id) => ({ id, tournament_id: 'b1', name: `P${id}` })),
  };
  return { ctx, matches };
}

const teamOf = (participantId: number): Occupant => ({
  kind: 'team',
  participantId,
  name: `P${participantId}`,
});
const seedOf = () => null;

describe('planWinnersChanges', () => {
  it('replaces a walkover winner in its round 2 slot', () => {
    const { ctx, matches } = fixture();
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(4), opponent2: { kind: 'bye' } },
    ];
    const plan = planWinnersChanges(ctx, wanted, seedOf);
    expect(plan.roundTwoWrites).toEqual([{ matchId: 3, fields: { opponent2_id: 4 } }]);
    expect(plan.byeChanges).toEqual([]);
  });

  it('refuses a round 2 slot holding a team the match could not have sent', () => {
    const { ctx, matches } = fixture();
    matches[2].opponent2 = { id: 2 };
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(3), opponent2: teamOf(4) },
    ];
    expect(() => planWinnersChanges(ctx, wanted, seedOf)).toThrow(
      "Round 2 Match 1 holds a team there that did not come from Round 1 Match 2, so this change can't be made safely."
    );
  });

  it('refuses a BYE change when there is no next round', () => {
    const { ctx, matches } = fixture({ roundTwo: false });
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(3), opponent2: teamOf(4) },
    ];
    expect(() => planWinnersChanges(ctx, wanted, seedOf)).toThrow('it has no next round');
  });

  it('refuses a BYE change in a bracket with a third-place match', () => {
    const { ctx, matches } = fixture({ settings: { size: 4, consolationFinal: true } });
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(3), opponent2: teamOf(4) },
    ];
    expect(() => planWinnersChanges(ctx, wanted, seedOf)).toThrow('third-place match');
  });
});

describe('applyFields', () => {
  it('turns a BYE sentinel into a null slot and a team write into a slot object', () => {
    const match: StorageMatch = {
      id: 9,
      stage_id: 1,
      group_id: 1,
      round_id: 11,
      number: 1,
      status: 2,
      opponent1: { id: 1, position: 1, result: 'win' },
      opponent2: null,
    };
    applyFields(match, {
      opponent1_id: null,
      opponent1_position: null,
      opponent1_score: null,
      opponent1_result: 'bye',
      opponent2_id: 5,
      opponent2_position: 8,
      opponent2_score: null,
      opponent2_result: null,
      status: 0,
    });
    expect(match).toMatchObject({ opponent1: null, opponent2: { id: 5, position: 8 }, status: 0 });

    applyFields(match, { opponent2_id: 6 });
    expect(match.opponent2).toEqual({ id: 6, position: 8 });
  });
});

describe('assertFootprint', () => {
  it('refuses a plan that leaves a team in two matches', () => {
    const { ctx, matches } = fixture();
    const wanted: WantedMatch[] = [
      { match: matches[0], opponent1: teamOf(1), opponent2: teamOf(3) },
    ];
    // P3 moves into Match 1 but stays in Match 2 and its round 2 slot.
    expect(() =>
      assertFootprint(ctx, wanted, [{ matchId: 1, fields: { opponent2_id: 3 } }])
    ).toThrow('This change would leave P3 in the wrong place');
  });

  it('accepts a walkover winner in its round 1 slot and the round 2 slot it feeds', () => {
    const { ctx, matches } = fixture();
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(4), opponent2: { kind: 'bye' } },
    ];
    expect(() =>
      assertFootprint(ctx, wanted, [
        { matchId: 3, fields: { opponent2_id: 4 } },
        { matchId: 2, fields: { opponent1_id: 4 } },
      ])
    ).not.toThrow();
  });
});

describe('planLosersChanges', () => {
  it('refuses when no losers-bracket spot carries the match number', () => {
    const { ctx, matches } = fixture();
    const wanted: WantedMatch[] = [
      { match: matches[1], opponent1: teamOf(3), opponent2: teamOf(4) },
    ];
    const snapshot = { bracketId: 'b1', stageId: 1, matches: [], landings: {}, names: {} };
    expect(() => planLosersChanges(ctx, snapshot, wanted, new Set([2]))).toThrow(
      "The losers-bracket spot fed by Round 1 Match 2 can't be found. Run Repair Bracket first."
    );
  });
});

describe('planOccupancy trades', () => {
  const bye: Occupant = { kind: 'bye' };
  const summary = (wanted: WantedMatch[]) =>
    wanted.map((entry) => [
      entry.match.id,
      entry.opponent1.kind === 'team' ? entry.opponent1.participantId : entry.opponent1.kind,
      entry.opponent2.kind === 'team' ? entry.opponent2.participantId : entry.opponent2.kind,
    ]);

  it("hands the replaced team the picked team's old spot", () => {
    const { ctx, matches } = fixture();
    ctx.match = matches[0];
    // P3 comes over from the walkover in Match 2; P1 takes its place there.
    expect(summary(planOccupancy(ctx, { opponent1: teamOf(3), opponent2: teamOf(2) }))).toEqual([
      [1, 3, 2],
      [2, 1, 'bye'],
    ]);
  });

  it('keeps a team that only switches sides, and trades the one it replaces', () => {
    const { ctx, matches } = fixture();
    ctx.match = matches[0];
    expect(summary(planOccupancy(ctx, { opponent1: teamOf(2), opponent2: teamOf(3) }))).toEqual([
      [1, 2, 3],
      [2, 1, 'bye'],
    ]);
  });

  it('lets a replaced team nobody takes leave the bracket', () => {
    const { ctx, matches } = fixture();
    ctx.match = matches[0];
    const newTeam: Occupant = { kind: 'team', participantId: -1, name: 'P9' };
    expect(summary(planOccupancy(ctx, { opponent1: teamOf(3), opponent2: newTeam }))).toEqual([
      [1, 3, -1],
      [2, 1, 'bye'],
    ]);
  });

  it('moves a replaced BYE into the other match', () => {
    const { ctx } = fixture();
    // Editing Match 2 (P3 vs BYE): P1 comes over, the BYE goes to Match 1.
    expect(summary(planOccupancy(ctx, { opponent1: teamOf(3), opponent2: teamOf(1) }))).toEqual([
      [2, 3, 1],
      [1, 'bye', 2],
    ]);
    expect(() => planOccupancy(ctx, { opponent1: bye, opponent2: bye })).toThrow(
      'both sides are set to BYE'
    );
  });
});
