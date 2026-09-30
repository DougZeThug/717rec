/**
 * Edit teams — a match scored in another tab between the edit's checks and its
 * write. The checks run on a snapshot read at the start; the write must still
 * refuse a match that has been played (or is being played) since.
 *
 * Same fixture as tests/bracketEditTeams.integration.test.ts: a 6-team double
 * elimination whose round 1 is M1 = T1 vs BYE, M2 = T4 vs T5, M3 = T2 vs BYE,
 * M4 = T3 vs T6.
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

const db = (): FakeSupabaseBracketDb =>
  (globalThis as Record<string, unknown>).__fakeBracketDb as FakeSupabaseBracketDb;

const BRACKET_ID = 'bracket-uuid-1';
const STALE = /This match changed since Edit teams was opened/;

interface MatchRow {
  id: number;
  round_id: number;
  number: number;
  status: number;
  opponent1_id: number | null;
  opponent1_score: number | null;
  opponent1_result: string | null;
  opponent2_id: number | null;
  opponent2_score: number | null;
  opponent2_result: string | null;
}

const team = (n: number): TeamChoice => ({ kind: 'team', teamId: `uuid-${n}` });

const matchRows = (): MatchRow[] => db().rows('match') as unknown as MatchRow[];

function participantIdByName(name: string): number {
  const participant = (db().rows('participant') as { id: number; name: string | null }[]).find(
    (p) => p.name === name
  );
  if (!participant) throw new Error(`test fixture: no participant named ${name}`);
  return participant.id;
}

/** Winners bracket (group 1) round 1 match. */
function wbR1(matchNumber: number): MatchRow {
  const group = (db().rows('group') as { id: number; number: number }[]).find(
    (g) => g.number === 1
  );
  const round = (db().rows('round') as { id: number; group_id: number; number: number }[]).find(
    (r) => r.group_id === group?.id && r.number === 1
  );
  const match = matchRows().find((m) => m.round_id === round?.id && m.number === matchNumber);
  if (!match) throw new Error(`test fixture: no winners round 1 match ${matchNumber}`);
  return match;
}

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

async function buildSixTeamBracket(service: BracketManagerService): Promise<void> {
  db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
  db().seed('teams', [
    { id: 'uuid-7', name: 'T7' },
    { id: 'uuid-8', name: 'T8' },
  ]);
  await service.createBracket({
    bracketId: BRACKET_ID,
    format: 'double_elimination',
    teams: Array.from({ length: 6 }, (_, i) => ({
      id: `uuid-${i + 1}`,
      name: `T${i + 1}`,
      seed: i + 1,
    })),
    grandFinalType: 'simple',
  });
}

/** Another tab changes the match the moment the edit's first write is sent. */
function changeMatchWhenEditWrites(matchId: number, changes: Partial<MatchRow>): void {
  db().interceptUpdates((table, index) => {
    if (table === 'match' && index === 0) {
      // tableRows returns the live rows, so this is what the write meets.
      Object.assign(
        db()
          .tableRows('match')
          .find((row) => row.id === matchId) ?? {},
        changes
      );
    }
    return undefined;
  });
}

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

beforeEach(() => {
  db().reset();
  db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
});

describe('Edit teams when the match is scored during the save', () => {
  it('refuses to swap the teams of a match that was played meanwhile', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);
    const t3 = participantIdByName('T3');
    const t6 = participantIdByName('T6');
    const edit = editOf(m4, team(6), team(3));

    changeMatchWhenEditWrites(m4.id, {
      status: 4,
      opponent1_result: 'win',
      opponent1_score: 2,
      opponent2_result: 'loss',
      opponent2_score: 0,
    });

    await expect(service.editMatchParticipants(edit)).rejects.toThrow(STALE);

    // The recorded result still belongs to the team that earned it.
    expect(wbR1(4)).toMatchObject({
      status: 4,
      opponent1_id: t3,
      opponent2_id: t6,
      opponent1_result: 'win',
      opponent1_score: 2,
      opponent2_result: 'loss',
      opponent2_score: 0,
    });
  });

  it('refuses a match that started being played meanwhile', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const m4 = wbR1(4);
    const t3 = participantIdByName('T3');
    const edit = editOf(m4, team(6), team(3));

    changeMatchWhenEditWrites(m4.id, { status: 3 });

    await expect(service.editMatchParticipants(edit)).rejects.toThrow(STALE);
    expect(wbR1(4)).toMatchObject({ status: 3, opponent1_id: t3 });
  });

  it('still says "Not saved" when nothing changed and the write reaches no row', async () => {
    const service = new BracketManagerService();
    await buildSixTeamBracket(service);
    const edit = editOf(wbR1(4), team(6), team(3));

    // Row-level security for a non-admin: zero rows, the match is still unplayed.
    db().interceptUpdates((table, index) =>
      table === 'match' && index === 0 ? 'zero-rows' : undefined
    );

    await expect(service.editMatchParticipants(edit)).rejects.toThrow(
      'Not saved — only admins can edit brackets. Nothing was changed.'
    );
  });
});
