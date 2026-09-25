/**
 * Edit teams (winners-bracket round 1 team changes) — integration suite over
 * the REAL BracketManagerService + REAL SupabaseSqlStorage + REAL
 * brackets-manager, running on the relational in-memory fake
 * (tests/fakes/fakeSupabaseBracketDb).
 *
 * A 6-team double elimination (size 8, seeds T1..T6) has this round 1:
 *   M1 = T1 vs BYE, M2 = T4 vs T5, M3 = T2 vs BYE, M4 = T3 vs T6.
 * T7 and T8 exist as league teams but are not in the bracket.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FakeSupabaseBracketDb } from './fakes/fakeSupabaseBracketDb';

vi.mock('@/integrations/supabase/client', async () => {
  const { FakeSupabaseBracketDb } = await import('./fakes/fakeSupabaseBracketDb');
  const db = new FakeSupabaseBracketDb();
  (globalThis as Record<string, unknown>).__fakeBracketDb = db;
  return { supabase: db.client };
});

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';
import type {
  EditMatchTeamsParams,
  TeamChoice,
} from '@/services/brackets/manager/services/BracketAdmin/editTeams/types';
import { computeLbFeederMarkers } from '@/services/brackets/manager/utils/lbFeederMarkers';

const db = (): FakeSupabaseBracketDb =>
  (globalThis as Record<string, unknown>).__fakeBracketDb as FakeSupabaseBracketDb;

const BRACKET_ID = 'bracket-uuid-1';

interface MatchRow {
  id: number;
  group_id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1_id: number | null;
  opponent1_position: number | null;
  opponent1_score: number | null;
  opponent1_result: string | null;
  opponent2_id: number | null;
  opponent2_position: number | null;
  opponent2_score: number | null;
  opponent2_result: string | null;
}

const team = (n: number): TeamChoice => ({ kind: 'team', teamId: `uuid-${n}` });

function matchRows(): MatchRow[] {
  return (db().rows('match') as unknown as MatchRow[]).sort((a, b) => a.id - b.id);
}

function participantIdByName(name: string): number {
  const participant = (db().rows('participant') as { id: number; name: string | null }[]).find(
    (p) => p.name === name
  );
  if (!participant) throw new Error(`test fixture: no participant named ${name}`);
  return participant.id;
}

function matchBy(groupNumber: number, roundNumber: number, matchNumber: number): MatchRow {
  const group = (db().rows('group') as { id: number; number: number }[]).find(
    (g) => g.number === groupNumber
  );
  const round = (db().rows('round') as { id: number; group_id: number; number: number }[]).find(
    (r) => r.group_id === group?.id && r.number === roundNumber
  );
  const match = matchRows().find((m) => m.round_id === round?.id && m.number === matchNumber);
  if (!match) {
    throw new Error(
      `test fixture: no match ${matchNumber} in group ${groupNumber} R${roundNumber}`
    );
  }
  return match;
}

const wbR1 = (matchNumber: number): MatchRow => matchBy(1, 1, matchNumber);

/** Params for a round 1 edit, with the concurrency token read off the stored match. */
function editOf(
  match: MatchRow,
  opponent1: TeamChoice,
  opponent2: TeamChoice
): EditMatchTeamsParams {
  const current = matchRows().find((m) => m.id === match.id) as MatchRow;
  return {
    matchId: match.id,
    opponent1,
    opponent2,
    expectedOpponent1Id: current.opponent1_result === 'bye' ? null : current.opponent1_id,
    expectedOpponent2Id: current.opponent2_result === 'bye' ? null : current.opponent2_id,
  };
}

async function score(service: BracketManagerService, match: MatchRow, opponent1Wins = true) {
  await service.updateMatch({
    matchId: match.id,
    scores: {
      opponent1: { score: opponent1Wins ? 2 : 0, result: opponent1Wins ? 'win' : 'loss' },
      opponent2: { score: opponent1Wins ? 0 : 2, result: opponent1Wins ? 'loss' : 'win' },
    },
  });
}

async function buildSixTeamBracket(
  service: BracketManagerService,
  format: 'single_elimination' | 'double_elimination' = 'double_elimination'
): Promise<void> {
  db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
  db().seed('teams', [
    { id: 'uuid-7', name: 'T7' },
    { id: 'uuid-8', name: 'T8' },
  ]);
  await service.createBracket({
    bracketId: BRACKET_ID,
    format,
    teams: Array.from({ length: 6 }, (_, i) => ({
      id: `uuid-${i + 1}`,
      name: `T${i + 1}`,
      seed: i + 1,
    })),
    grandFinalType: 'simple',
  });
}

/** All eight league teams: T1..T6 and T8 in division A (the bracket's), T7 in division B. */
function seedLeague() {
  db().seed(
    'teams',
    [1, 2, 3, 4, 5, 6].map((n) => ({ id: `uuid-${n}`, name: `T${n}`, division_id: 'div-a' }))
  );
  const [t7, t8] = db()
    .tableRows('teams')
    .filter((row) => row.id === 'uuid-7' || row.id === 'uuid-8');
  Object.assign(t7, { division_id: 'div-b' });
  Object.assign(t8, { division_id: 'div-a' });
  Object.assign(db().tableRows('brackets')[0], { division_id: 'div-a' });
}

/** Score every Ready match (opponent1 winning) until none is left. */
async function playToTheEnd(service: BracketManagerService): Promise<void> {
  for (let i = 0; i < 32; i++) {
    const ready = matchRows().find((m) => m.status === 2 || m.status === 3);
    if (!ready) return;
    await score(service, ready);
  }
  throw new Error('playToTheEnd did not converge');
}

beforeAll(() => {
  // The facade constructs BracketsManager with VERBOSE=true, which logs every
  // storage call straight to console.log — silence it for readable test output.
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

beforeEach(() => {
  db().reset();
  db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
});

describe('Edit teams (real service + real library over fake DB)', () => {
  it('replaces a round 1 team with a team new to the bracket, and the match plays on', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m2 = wbR1(2);
    const t4 = participantIdByName('T4');
    expect(m2).toMatchObject({ opponent1_id: t4, opponent2_id: participantIdByName('T5') });

    const result = await service.editMatchParticipants(editOf(m2, team(4), team(7)));

    const t7 = participantIdByName('T7');
    expect(db().rows('participant')).toContainEqual(
      expect.objectContaining({ id: t7, team_id: 'uuid-7', tournament_id: BRACKET_ID })
    );
    expect(wbR1(2)).toMatchObject({
      opponent1_id: t4,
      opponent1_position: m2.opponent1_position,
      opponent2_id: t7,
      opponent2_position: m2.opponent2_position,
      opponent2_score: null,
      opponent2_result: null,
      status: 2,
    });
    expect(result.message).toBe('Winners Round 1 Match 2 is now T4 vs T7.');

    // The library plays the edited match: T4 advances, T7 drops into the losers bracket.
    await score(service, m2);
    expect(matchBy(1, 2, 1).opponent2_id).toBe(t4);
    expect(matchBy(2, 1, 1)).toMatchObject({ opponent2_id: t7, opponent2_position: 2 });
  });

  it('refuses matches outside winners round 1', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);

    for (const match of [matchBy(1, 2, 1), matchBy(2, 1, 1)]) {
      await expect(service.editMatchParticipants(editOf(match, team(4), team(5)))).rejects.toThrow(
        /only works on first-round matches of the winners bracket/
      );
    }
  });

  it('refuses a match being played or already played', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);

    const m4 = wbR1(4);
    Object.assign(
      db()
        .tableRows('match')
        .find((row) => row.id === m4.id) ?? {},
      {
        status: 3,
        opponent1_score: 1,
        opponent2_score: 0,
      }
    );
    await expect(service.editMatchParticipants(editOf(m4, team(3), team(7)))).rejects.toThrow(
      "This match is being played, so its teams can't change."
    );

    const m2 = wbR1(2);
    await score(service, m2);
    await expect(service.editMatchParticipants(editOf(m2, team(4), team(7)))).rejects.toThrow(
      "This match has already been played, so its teams can't change."
    );
  });

  it('refuses a team that is already in another match', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await score(service, wbR1(2));

    // T5 lost Round 1 Match 2 and now sits in the losers bracket too.
    const before = matchRows();
    await expect(service.editMatchParticipants(editOf(wbR1(4), team(3), team(5)))).rejects.toThrow(
      'T5 is already in Winners Round 1 Match 2, which has already been played. ' +
        'A team can only be in one match.'
    );
    expect(matchRows()).toEqual(before);
  });

  it('refuses a screen opened before the match changed', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);
    const stale = editOf(m4, team(3), team(8));
    await service.editMatchParticipants(editOf(m4, team(3), team(7)));

    const before = matchRows();
    await expect(service.editMatchParticipants(stale)).rejects.toThrow(
      'This match changed since Edit teams was opened.'
    );
    expect(matchRows()).toEqual(before);
  });

  it('refuses the same team twice and an edit that changes nothing', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);

    await expect(service.editMatchParticipants(editOf(m4, team(7), team(7)))).rejects.toThrow(
      "A team can't be on both sides of a match."
    );
    await expect(service.editMatchParticipants(editOf(m4, team(3), team(6)))).rejects.toThrow(
      'Nothing to change'
    );
  });

  it('switches the two teams of a match between sides', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);

    await service.editMatchParticipants(editOf(m4, team(6), team(3)));

    expect(wbR1(4)).toMatchObject({
      opponent1_id: participantIdByName('T6'),
      opponent1_position: m4.opponent1_position,
      opponent2_id: participantIdByName('T3'),
      opponent2_position: m4.opponent2_position,
    });
  });

  it('fails loudly when the write reaches no row, and when it errors', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);
    const before = matchRows();

    db().interceptUpdates((table) => (table === 'match' ? 'zero-rows' : undefined));
    await expect(service.editMatchParticipants(editOf(m4, team(6), team(3)))).rejects.toThrow(
      'Not saved — only admins can edit brackets. Nothing was changed.'
    );
    expect(matchRows()).toEqual(before);

    db().interceptUpdates((table) => (table === 'match' ? 'error' : undefined));
    await expect(service.editMatchParticipants(editOf(m4, team(6), team(3)))).rejects.toMatchObject(
      { name: 'DatabaseError' }
    );
    expect(matchRows()).toEqual(before);
  });

  it('replaces a walkover winner, updating the round 2 slot it already reached', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t1 = participantIdByName('T1');
    expect(matchBy(1, 2, 1).opponent1_id).toBe(t1);

    const result = await service.editMatchParticipants(editOf(wbR1(1), team(7), { kind: 'bye' }));

    const t7 = participantIdByName('T7');
    expect(wbR1(1)).toMatchObject({
      opponent1_id: t7,
      opponent1_position: 1,
      opponent1_result: 'win',
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(1, 2, 1).opponent1_id).toBe(t7);
    expect(result.message).toContain(
      'T7 has no opponent in Winners Round 1 Match 1 and moves on to Winners Round 2 Match 1 automatically.'
    );
    // T1 is out of the bracket entirely.
    expect(matchRows().some((m) => m.opponent1_id === t1 || m.opponent2_id === t1)).toBe(false);
  });

  it('refuses two BYEs', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await expect(
      service.editMatchParticipants(editOf(wbR1(1), { kind: 'bye' }, { kind: 'bye' }))
    ).rejects.toThrow('A match needs at least one team');
  });
});

describe('Edit teams BYEs in single elimination (real service + real library over fake DB)', () => {
  it('turns a match into a walkover and back, and the bracket plays to the end', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service, 'single_elimination');
    const t1 = participantIdByName('T1');
    const t4 = participantIdByName('T4');
    const t5 = participantIdByName('T5');
    const m2 = wbR1(2);

    // T5 drops out: T4 wins Round 1 Match 2 by walkover and moves on.
    const bye = await service.editMatchParticipants(editOf(m2, team(4), { kind: 'bye' }));
    expect(wbR1(2)).toMatchObject({
      opponent1_id: t4,
      opponent1_result: 'win',
      opponent1_score: null,
      opponent2_id: null,
      opponent2_position: null,
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: t1, opponent2_id: t4, status: 2 });
    expect(bye.message).toBe(
      'Round 1 Match 2 is now T4 vs BYE. T4 has no opponent in Round 1 Match 2 and moves on ' +
        'to Round 2 Match 1 automatically.'
    );

    // Undo: T5 comes back in its seed slot, T4 leaves round 2 again.
    const undo = await service.editMatchParticipants(editOf(wbR1(2), team(4), team(5)));
    expect(wbR1(2)).toMatchObject({
      opponent1_id: t4,
      opponent1_result: null,
      opponent2_id: t5,
      opponent2_position: m2.opponent2_position,
      opponent2_result: null,
      status: 2,
    });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: t1, opponent2_id: null, status: 1 });
    expect(undo.message).toContain(
      'T4 is taken back out of Round 2 Match 1; that spot now waits for Round 1 Match 2 to be played.'
    );

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it("fills a top seed's BYE with a team new to the bracket", async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service, 'single_elimination');
    const t1 = participantIdByName('T1');

    await service.editMatchParticipants(editOf(wbR1(1), team(1), team(7)));

    expect(wbR1(1)).toMatchObject({
      opponent1_id: t1,
      opponent1_result: null,
      opponent2_id: participantIdByName('T7'),
      // The seed number the slot was built for (seed 8 faces seed 1).
      opponent2_position: 8,
      opponent2_result: null,
      status: 2,
    });
    // Both round 2 spots now wait for round 1: the library calls that Locked (0).
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: null, opponent2_id: null, status: 0 });

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it('refuses when the round 2 match it would change is being played', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service, 'single_elimination');
    const roundTwo = matchBy(1, 2, 1);
    Object.assign(
      db()
        .tableRows('match')
        .find((row) => row.id === roundTwo.id) ?? {},
      {
        status: 3,
      }
    );

    await expect(service.editMatchParticipants(editOf(wbR1(1), team(1), team(7)))).rejects.toThrow(
      'This change needs to update Round 2 Match 1, but that match is currently being played.'
    );
  });

  it('finishes an interrupted edit when the same teams are saved again', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service, 'single_elimination');
    const params = editOf(wbR1(2), team(4), { kind: 'bye' });

    // Round 2 is written, then the edited match fails.
    db().interceptUpdates((table, index) =>
      table === 'match' && index === 1 ? 'error' : undefined
    );
    await expect(service.editMatchParticipants(params)).rejects.toThrow(
      'Only part of this change was saved. Open Edit teams on Round 1 Match 2 again ' +
        'and save the same teams to finish.'
    );
    expect(matchBy(1, 2, 1).opponent2_id).toBe(participantIdByName('T4'));
    expect(wbR1(2).opponent2_id).toBe(participantIdByName('T5'));

    db().interceptUpdates(null);
    await service.editMatchParticipants(params);
    expect(wbR1(2)).toMatchObject({ opponent2_result: 'bye', status: 0 });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent2_id: participantIdByName('T4'), status: 2 });
  });
});

describe('Edit teams BYEs in double elimination (real service + real library over fake DB)', () => {
  it('adds a BYE: the walkover moves on and the losers bracket passes the BYE along', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t1 = participantIdByName('T1');
    const t4 = participantIdByName('T4');

    const result = await service.editMatchParticipants(editOf(wbR1(2), team(4), { kind: 'bye' }));

    expect(wbR1(2)).toMatchObject({
      opponent1_id: t4,
      opponent1_result: 'win',
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: t1, opponent2_id: t4, status: 2 });
    // Round 1 Match 2 has no loser any more: its losers spot is a BYE, the
    // BYE-vs-BYE match passes its BYE on, and round 2's carry spot takes it.
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_result: 'bye',
      opponent2_id: null,
      opponent2_position: null,
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(2, 2, 1)).toMatchObject({ opponent1_id: null, opponent2_result: 'bye' });
    expect(result.message).toContain(
      'Losers Round 1 Match 1 is left with no teams; a BYE passes on to the next round.'
    );

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it("undoes a seed's BYE: the losers spot gets its feeder marker back and plays", async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t7 = participantIdByName('T6') + 1; // the next participant id, created by the edit

    await service.editMatchParticipants(editOf(wbR1(1), team(1), team(7)));

    expect(participantIdByName('T7')).toBe(t7);
    expect(wbR1(1)).toMatchObject({ opponent2_id: t7, opponent2_position: 8, status: 2 });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: null });
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_id: null,
      opponent1_position: 1,
      opponent1_result: null,
      opponent2_id: null,
      opponent2_position: 2,
      opponent2_result: null,
      status: 1,
    });

    // Both round 1 losers drop into the right spots and the match scores.
    await score(service, wbR1(1));
    await score(service, wbR1(2));
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_id: t7,
      opponent2_id: participantIdByName('T5'),
      status: 2,
    });
    await score(service, matchBy(2, 1, 1));
    expect(matchBy(2, 2, 1).opponent2_id).toBe(t7);
  });

  it('puts every team, BYE and losers-bracket marker back after a BYE is added and removed', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    // Who sits where: ids, feeder markers and BYEs. (Statuses of untouched
    // waiting matches follow the rearrange tool's convention, not creation's.)
    const layout = () =>
      matchRows().map((m) => ({
        id: m.id,
        slots: [
          [m.opponent1_id, m.opponent1_position, m.opponent1_result === 'bye'],
          [m.opponent2_id, m.opponent2_position, m.opponent2_result === 'bye'],
        ],
      }));
    const before = layout();

    await service.editMatchParticipants(editOf(wbR1(4), team(3), { kind: 'bye' }));
    await service.editMatchParticipants(editOf(wbR1(4), team(3), team(6)));

    expect(layout()).toEqual(before);
    const stage = db().rows('stage')[0] as { type: string; settings: Record<string, unknown> };
    const markers = await computeLbFeederMarkers(stage);
    expect(matchBy(2, 1, 2).opponent2_position).toBe(markers.markerOf(1, 2, 'opponent2'));

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it("undoes a BYE after the losers bracket's walkover moved on", async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t6 = participantIdByName('T6');
    await score(service, wbR1(4));
    // T6 dropped next to Round 1 Match 3's BYE and walked over into round 2.
    expect(matchBy(2, 1, 2)).toMatchObject({ opponent2_id: t6, opponent2_result: 'win' });
    expect(matchBy(2, 2, 2).opponent2_id).toBe(t6);

    const result = await service.editMatchParticipants(editOf(wbR1(3), team(2), team(7)));

    expect(matchBy(2, 1, 2)).toMatchObject({
      opponent1_position: 3,
      opponent1_result: null,
      opponent2_id: t6,
      opponent2_result: null,
      status: 1,
    });
    expect(matchBy(2, 2, 2)).toMatchObject({ opponent2_id: null });
    expect(result.message).toContain(
      'T6 is removed from Losers Round 2 Match 2; that spot now waits for an earlier match.'
    );
  });

  it('refuses once a losers-bracket match the change reaches has been played', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await score(service, wbR1(2));
    await score(service, wbR1(4));
    await score(service, matchBy(1, 2, 1));
    await score(service, matchBy(2, 2, 2));

    const before = matchRows();
    await expect(service.editMatchParticipants(editOf(wbR1(3), team(2), team(7)))).rejects.toThrow(
      'This change needs to change Losers Round 1 Match 2 automatically'
    );
    expect(matchRows()).toEqual(before);
    expect(
      db()
        .rows('participant')
        .some((p) => p.name === 'T7')
    ).toBe(false);
  });

  it('finishes an interrupted losers-bracket cascade when the same teams are saved again', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await service.editMatchParticipants(editOf(wbR1(2), team(4), { kind: 'bye' }));
    const clean = matchRows();

    db().reset();
    db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
    await buildSixTeamBracket(service);
    const params = editOf(wbR1(2), team(4), { kind: 'bye' });
    // The first losers write lands, the second fails.
    db().interceptUpdates((table, index) =>
      table === 'match' && index === 1 ? 'error' : undefined
    );
    await expect(service.editMatchParticipants(params)).rejects.toThrow(
      'Only part of this change was saved.'
    );
    expect(matchRows()).not.toEqual(clean);

    db().interceptUpdates(null);
    await service.editMatchParticipants(params);
    expect(matchRows()).toEqual(clean);
  });
});

describe('Edit teams trading places (real service + real library over fake DB)', () => {
  it('trades two teams between round 1 matches in one step', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const [m2, m4] = [wbR1(2), wbR1(4)];

    const result = await service.editMatchParticipants(editOf(m2, team(4), team(6)));

    expect(wbR1(2)).toMatchObject({
      opponent2_id: participantIdByName('T6'),
      opponent2_position: m2.opponent2_position,
    });
    expect(wbR1(4)).toMatchObject({
      opponent1_id: participantIdByName('T3'),
      opponent2_id: participantIdByName('T5'),
      opponent2_position: m4.opponent2_position,
    });
    expect(result.message).toBe(
      'Winners Round 1 Match 2 is now T4 vs T6. Winners Round 1 Match 4 is now T3 vs T5.'
    );
  });

  it('trades a walkover team, handing the walkover and its round 2 spot to the other team', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t1 = participantIdByName('T1');
    const t5 = participantIdByName('T5');

    await service.editMatchParticipants(editOf(wbR1(2), team(4), team(1)));

    expect(wbR1(1)).toMatchObject({ opponent1_id: t5, opponent1_result: 'win', status: 0 });
    expect(wbR1(2)).toMatchObject({ opponent2_id: t1, opponent2_result: null, status: 2 });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: t5, opponent2_id: null });

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it("trades a BYE: a seed's walkover moves to the other match, losers bracket included", async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const t4 = participantIdByName('T4');

    const result = await service.editMatchParticipants(editOf(wbR1(1), team(1), team(5)));

    expect(wbR1(1)).toMatchObject({ opponent2_id: participantIdByName('T5'), status: 2 });
    expect(wbR1(2)).toMatchObject({
      opponent1_id: t4,
      opponent1_result: 'win',
      opponent2_result: 'bye',
      status: 0,
    });
    expect(matchBy(1, 2, 1)).toMatchObject({ opponent1_id: null, opponent2_id: t4 });
    expect(matchBy(2, 1, 1)).toMatchObject({
      opponent1_position: 1,
      opponent1_result: null,
      opponent2_position: null,
      opponent2_result: 'bye',
    });
    expect(result.message).toContain('Winners Round 1 Match 2 is now T4 vs BYE.');

    await playToTheEnd(service);
    expect(db().rows('brackets')[0]).toMatchObject({ state: 'completed' });
  });

  it('refuses a trade that would leave a match with two BYEs', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await expect(service.editMatchParticipants(editOf(wbR1(1), team(1), team(2)))).rejects.toThrow(
      'This trade would leave Winners Round 1 Match 3 with two BYEs and no team.'
    );
  });

  it('refuses trading with two matches in one save', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    await expect(service.editMatchParticipants(editOf(wbR1(2), team(3), team(1)))).rejects.toThrow(
      'One save can trade places with only one other match.'
    );
  });

  it('refuses a trade when the picked team moved since the screen was opened', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const stale: EditMatchTeamsParams = {
      ...editOf(wbR1(2), team(4), team(6)),
      expectedPickLocations: { 'uuid-6': wbR1(4).id },
    };
    // Someone else trades T6 into Round 1 Match 3's BYE spot first.
    await service.editMatchParticipants(editOf(wbR1(3), team(2), team(6)));

    await expect(service.editMatchParticipants(stale)).rejects.toThrow(
      'This match changed since Edit teams was opened.'
    );
  });
});

describe('Edit teams finishing an interrupted trade (real service + real library over fake DB)', () => {
  /** The save the admin makes, with the token the screen was opened with. */
  async function openScreen(
    service: BracketManagerService,
    matchId: number,
    opponent1: TeamChoice,
    opponent2: TeamChoice
  ): Promise<EditMatchTeamsParams> {
    const options = await service.getEditTeamsOptions(matchId);
    return {
      matchId,
      opponent1,
      opponent2,
      expectedOpponent1Id: options.expectedOpponent1Id,
      expectedOpponent2Id: options.expectedOpponent2Id,
      expectedPickLocations: options.expectedPickLocations,
    };
  }

  async function freshBracket(service: BracketManagerService): Promise<void> {
    db().reset();
    db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
    await buildSixTeamBracket(service);
    seedLeague();
  }

  it.each([
    { trade: 'two teams', edited: 2, picks: [team(4), team(6)] },
    { trade: 'a walkover team', edited: 2, picks: [team(4), team(1)] },
    { trade: 'a BYE', edited: 1, picks: [team(1), team(5)] },
  ])(
    'finishes a trade of $trade when the same teams are saved again, wherever it stopped',
    async ({ edited, picks: [opponent1, opponent2] }) => {
      const service = new BracketManagerService();
      await freshBracket(service);
      let writeCount = 0;
      db().interceptUpdates((table) => {
        if (table === 'match') writeCount += 1;
        return undefined;
      });
      await service.editMatchParticipants(
        await openScreen(service, wbR1(edited).id, opponent1, opponent2)
      );
      const clean = matchRows();
      expect(writeCount).toBeGreaterThan(1);

      for (let failing = 0; failing < writeCount; failing++) {
        for (const retry of ['same screen', 'reopened screen'] as const) {
          await freshBracket(service);
          const params = await openScreen(service, wbR1(edited).id, opponent1, opponent2);
          db().interceptUpdates((table, index) =>
            table === 'match' && index === failing ? 'error' : undefined
          );
          await expect(service.editMatchParticipants(params)).rejects.toThrow();
          db().interceptUpdates(null);

          await service.editMatchParticipants(
            retry === 'same screen'
              ? params
              : await openScreen(service, wbR1(edited).id, opponent1, opponent2)
          );
          expect(matchRows(), `write ${failing} failed, retried on the ${retry}`).toEqual(clean);
        }
      }
    }
  );
});

describe('Edit teams options, eligibility and preview (real service + real library over fake DB)', () => {
  it('groups every league team by how it can be picked, with the save token', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    seedLeague();
    await score(service, wbR1(4));
    const m2 = wbR1(2);

    const options = await service.getEditTeamsOptions(m2.id);

    expect(options).toMatchObject({
      ok: true,
      reason: null,
      matchLabel: 'Winners Round 1 Match 2',
      slots: [
        { side: 'opponent1', kind: 'team', teamId: 'uuid-4', name: 'T4' },
        { side: 'opponent2', kind: 'team', teamId: 'uuid-5', name: 'T5' },
      ],
      expectedOpponent1Id: m2.opponent1_id,
      expectedOpponent2Id: m2.opponent2_id,
    });
    expect(options.candidates.map((c) => [c.name, c.group, c.where, c.reason])).toEqual([
      ['T4', 'here', null, null],
      ['T5', 'here', null, null],
      ['T1', 'trade', 'Winners Round 1 Match 1', null],
      ['T2', 'trade', 'Winners Round 1 Match 3', null],
      ['T8', 'available', null, null],
      ['T7', 'available', null, null],
      ['T3', 'taken', 'Winners Round 1 Match 4', 'has already been played'],
      ['T6', 'taken', 'Winners Round 1 Match 4', 'has already been played'],
    ]);
    expect(options.expectedPickLocations).toMatchObject({
      'uuid-1': wbR1(1).id,
      'uuid-4': m2.id,
      'uuid-7': null,
    });
  });

  it('says why a match cannot be edited', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);

    expect(await service.checkEditTeamsEligibility(wbR1(2).id)).toEqual({ ok: true, reason: null });
    const later = await service.checkEditTeamsEligibility(matchBy(1, 2, 1).id);
    expect(later.ok).toBe(false);
    expect(later.reason).toMatch(/only works on first-round matches of the winners bracket/);
    const options = await service.getEditTeamsOptions(matchBy(1, 2, 1).id);
    expect(options).toMatchObject({ ok: false, candidates: [] });
  });

  it('previews an edit without writing, and reports a refused one', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const before = matchRows();

    const preview = await service.previewEditMatchTeams(editOf(wbR1(2), team(4), { kind: 'bye' }));
    expect(preview).toMatchObject({
      ok: true,
      problems: [],
      changes: ['Winners Round 1 Match 2 is now T4 vs BYE.'],
    });
    expect(preview.consequences).toContain(
      'T4 has no opponent in Winners Round 1 Match 2 and moves on to Winners Round 2 Match 1 automatically.'
    );

    const refused = await service.previewEditMatchTeams(editOf(wbR1(2), team(4), team(4)));
    expect(refused).toEqual({
      ok: false,
      problems: ["A team can't be on both sides of a match."],
      changes: [],
      consequences: [],
    });
    expect(matchRows()).toEqual(before);
    expect(db().rows('participant')).toHaveLength(6);
  });
});
