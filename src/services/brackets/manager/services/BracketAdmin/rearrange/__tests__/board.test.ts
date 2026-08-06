import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

import { NotFoundError, ValidationError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../../../SupabaseSqlStorage';
import type { BracketAdminDeps } from '../../types';
import { loadRearrangeBoard } from '../board';

const BRACKET_ID = 'bracket-1';

type Row = Record<string, unknown>;

interface FixtureData {
  stages: Row[];
  groups: Row[];
  rounds: Row[];
  matches: Row[];
  participants: Row[];
}

/**
 * Mirrors the losers bracket of a 10-team double elimination after both
 * winners-bracket rounds: R1 has two walkovers (library form: Locked + 'win')
 * and two BYE-vs-BYE placeholders, R2 (minor round: opponent1 = marked WB
 * drop-in, opponent2 = carry) has two real matches and two walkovers, R3 (the
 * fixture's last LB round) is waiting.
 */
function tenTeamFixture(): FixtureData {
  return {
    stages: [
      {
        id: 1,
        tournament_id: BRACKET_ID,
        name: 'S',
        type: 'double_elimination',
        number: 1,
        settings: {},
      },
    ],
    groups: [
      { id: 1, stage_id: 1, number: 1 },
      { id: 2, stage_id: 1, number: 2 },
      { id: 3, stage_id: 1, number: 3 },
    ],
    rounds: [
      { id: 10, stage_id: 1, group_id: 1, number: 1 },
      { id: 21, stage_id: 1, group_id: 2, number: 1 },
      { id: 22, stage_id: 1, group_id: 2, number: 2 },
      { id: 23, stage_id: 1, group_id: 2, number: 3 },
      { id: 30, stage_id: 1, group_id: 3, number: 1 },
    ],
    matches: [
      // A winners-bracket match, to prove group filtering.
      {
        id: 101,
        stage_id: 1,
        group_id: 1,
        round_id: 10,
        number: 1,
        status: 4,
        opponent1: { id: 1, score: 2, result: 'win' },
        opponent2: { id: 9, score: 0, result: 'loss' },
      },
      // LB R1
      {
        id: 301,
        stage_id: 1,
        group_id: 2,
        round_id: 21,
        number: 1,
        status: 0,
        opponent1: null,
        opponent2: { id: 9, position: 2, result: 'win' },
      },
      {
        id: 302,
        stage_id: 1,
        group_id: 2,
        round_id: 21,
        number: 2,
        status: 0,
        opponent1: null,
        opponent2: null,
      },
      {
        id: 303,
        stage_id: 1,
        group_id: 2,
        round_id: 21,
        number: 3,
        status: 0,
        opponent1: null,
        opponent2: { id: 10, position: 6, result: 'win' },
      },
      {
        id: 304,
        stage_id: 1,
        group_id: 2,
        round_id: 21,
        number: 4,
        status: 0,
        opponent1: null,
        opponent2: null,
      },
      // LB R2 (1:1 minor round)
      {
        id: 401,
        stage_id: 1,
        group_id: 2,
        round_id: 22,
        number: 1,
        status: 2,
        opponent1: { id: 21, position: 9 },
        opponent2: { id: 9 },
      },
      {
        id: 402,
        stage_id: 1,
        group_id: 2,
        round_id: 22,
        number: 2,
        status: 0,
        opponent1: { id: 22, position: 10, result: 'win' },
        opponent2: null,
      },
      {
        id: 403,
        stage_id: 1,
        group_id: 2,
        round_id: 22,
        number: 3,
        status: 2,
        opponent1: { id: 23, position: 11 },
        opponent2: { id: 10 },
      },
      {
        id: 404,
        stage_id: 1,
        group_id: 2,
        round_id: 22,
        number: 4,
        status: 0,
        opponent1: { id: 24, position: 12, result: 'win' },
        opponent2: null,
      },
      // LB R3 (halved; last LB round in this fixture)
      {
        id: 501,
        stage_id: 1,
        group_id: 2,
        round_id: 23,
        number: 1,
        status: 1,
        opponent1: { id: null },
        opponent2: { id: 22 },
      },
      {
        id: 502,
        stage_id: 1,
        group_id: 2,
        round_id: 23,
        number: 2,
        status: 1,
        opponent1: { id: null },
        opponent2: { id: 24 },
      },
      // Grand final
      {
        id: 601,
        stage_id: 1,
        group_id: 3,
        round_id: 30,
        number: 1,
        status: 0,
        opponent1: { id: null },
        opponent2: { id: null },
      },
    ],
    participants: [
      { id: 9, tournament_id: BRACKET_ID, name: 'T9' },
      { id: 10, tournament_id: BRACKET_ID, name: 'T10' },
      { id: 21, tournament_id: BRACKET_ID, name: 'D1' },
      { id: 22, tournament_id: BRACKET_ID, name: 'D2' },
      { id: 23, tournament_id: BRACKET_ID, name: 'D3' },
      { id: 24, tournament_id: BRACKET_ID, name: 'D4' },
    ],
  };
}

function makeDeps(data: FixtureData): BracketAdminDeps {
  const storage = {
    select: vi.fn((table: string, filter: Record<string, unknown>) => {
      const rows: Row[] = {
        stage: data.stages,
        group: data.groups,
        round: data.rounds,
        match: data.matches,
        participant: data.participants,
      }[table] as Row[];
      const filtered = rows.filter((row) =>
        Object.entries(filter).every(([key, value]) => row[key] === value)
      );
      return Promise.resolve(filtered);
    }),
  };
  return { storage: storage as unknown as SupabaseSqlStorage };
}

const slotOf = (
  board: Awaited<ReturnType<typeof loadRearrangeBoard>>,
  matchId: number,
  side: 'opponent1' | 'opponent2'
) => {
  for (const round of board.rounds) {
    for (const view of round.matches) {
      if (view.matchId === matchId) return view.slots[side === 'opponent1' ? 0 : 1];
    }
  }
  throw new Error(`no match ${matchId} on the board`);
};

const matchViewOf = (board: Awaited<ReturnType<typeof loadRearrangeBoard>>, matchId: number) => {
  for (const round of board.rounds) {
    for (const view of round.matches) {
      if (view.matchId === matchId) return view;
    }
  }
  throw new Error(`no match ${matchId} on the board`);
};

describe('loadRearrangeBoard', () => {
  it('classifies teams, BYE destinations, derived spots, and locked matches', async () => {
    const board = await loadRearrangeBoard(makeDeps(tenTeamFixture()), BRACKET_ID);

    // Only losers-bracket matches appear, grouped into three rounds.
    expect(board.rounds.map((round) => round.roundNumber)).toEqual([1, 2, 3]);
    expect(board.rounds.map((round) => round.matches.length)).toEqual([4, 4, 2]);

    // A dropped loser is movable; its BYE partner is a destination.
    expect(slotOf(board, 301, 'opponent2')).toMatchObject({ kind: 'team', participantName: 'T9' });
    expect(slotOf(board, 301, 'opponent1')).toMatchObject({ kind: 'bye' });

    // The BYE-vs-BYE placeholder is fully open — the case the swap tool refused.
    expect(matchViewOf(board, 302).locked).toBe(false);
    expect(slotOf(board, 302, 'opponent1').kind).toBe('bye');
    expect(slotOf(board, 302, 'opponent2').kind).toBe('bye');

    // Minor-round carry slots are filled automatically by round 1.
    expect(slotOf(board, 401, 'opponent1')).toMatchObject({ kind: 'team', participantName: 'D1' });
    expect(slotOf(board, 401, 'opponent2')).toMatchObject({
      kind: 'derived',
      participantName: 'T9',
      autoNote: 'Filled automatically from Match 1',
    });
    expect(slotOf(board, 402, 'opponent2')).toMatchObject({
      kind: 'derived',
      autoNote: 'Filled automatically from Match 2',
    });

    // Round 3 is waiting on earlier matches: locked, with spots that update live.
    const waiting = matchViewOf(board, 501);
    expect(waiting.locked).toBe(true);
    expect(waiting.lockedReason).toMatch(/waiting on a team/);
    expect(slotOf(board, 501, 'opponent1').kind).toBe('derived');
    expect(slotOf(board, 501, 'opponent2').kind).toBe('derived');
  });

  it('builds the snapshot landing map: carry detection, halved parity, last round null', async () => {
    const board = await loadRearrangeBoard(makeDeps(tenTeamFixture()), BRACKET_ID);
    expect(board.snapshot.landings).toMatchObject({
      // 1:1 minor round: the unmarked carry slot.
      301: { matchId: 401, side: 'opponent2' },
      302: { matchId: 402, side: 'opponent2' },
      // Halved round: odd feeders to opponent1, even to opponent2.
      401: { matchId: 501, side: 'opponent1' },
      402: { matchId: 501, side: 'opponent2' },
      403: { matchId: 502, side: 'opponent1' },
      404: { matchId: 502, side: 'opponent2' },
      // Last losers-bracket round feeds the grand final — out of scope.
      501: null,
      502: null,
    });
    expect(board.snapshot.names['9']).toBe('T9');
  });

  it('locks the whole chain behind a landing match that has been played', async () => {
    const data = tenTeamFixture();
    const lbR3M1 = data.matches.find((row) => row.id === 501);
    Object.assign(lbR3M1 ?? {}, {
      status: 4,
      opponent1: { id: 21, score: 2, result: 'win' },
      opponent2: { id: 22, score: 0, result: 'loss' },
    });
    const board = await loadRearrangeBoard(makeDeps(data), BRACKET_ID);

    // The walkover whose winner sits in the played match is locked...
    const walkover = matchViewOf(board, 402);
    expect(walkover.locked).toBe(true);
    expect(walkover.lockedReason).toContain('D2 already advanced');
    expect(walkover.lockedReason).toContain('has already been played');
    // ...and so is the placeholder that feeds the walkover, transitively.
    const placeholder = matchViewOf(board, 302);
    expect(placeholder.locked).toBe(true);
    // The real match feeding the same played match stays open: its outcome is
    // still undecided, so rearranging its teams changes nothing downstream.
    expect(matchViewOf(board, 401).locked).toBe(false);
  });

  it('locks the losers-bracket final once its outcome is decided', async () => {
    const data = tenTeamFixture();
    const lbR3M2 = data.matches.find((row) => row.id === 502);
    Object.assign(lbR3M2 ?? {}, {
      status: 0,
      opponent1: null,
      opponent2: { id: 24, result: 'win' },
    });
    const board = await loadRearrangeBoard(makeDeps(data), BRACKET_ID);
    const final = matchViewOf(board, 502);
    expect(final.locked).toBe(true);
    expect(final.lockedReason).toContain('grand final');
  });

  it('refuses single-elimination brackets and unknown brackets', async () => {
    const single = tenTeamFixture();
    single.stages[0].type = 'single_elimination';
    await expect(loadRearrangeBoard(makeDeps(single), BRACKET_ID)).rejects.toThrow(ValidationError);

    await expect(loadRearrangeBoard(makeDeps(tenTeamFixture()), 'missing')).rejects.toThrow(
      NotFoundError
    );
  });
});
