/**
 * Characterization suite B — the REAL BracketManagerService + REAL
 * SupabaseSqlStorage + REAL brackets-manager, running over a relational
 * in-memory fake of the Supabase client (tests/fakes/fakeSupabaseBracketDb).
 * Nothing in the code under test is mocked.
 *
 * This suite pins the service layer's CURRENT observable behavior — including
 * behavior that is a known bug or a repair-layer artifact. Those tests are
 * explicitly labeled "current behavior" / "KNOWN BUG" and are flipped in the
 * same commit that changes the behavior (the core-refactor step), so any
 * regression bisects to exactly one change.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FakeSupabaseBracketDb } from './fakes/fakeSupabaseBracketDb';

vi.mock('@/integrations/supabase/client', async () => {
  const { FakeSupabaseBracketDb } = await import('./fakes/fakeSupabaseBracketDb');
  const db = new FakeSupabaseBracketDb();
  (globalThis as Record<string, unknown>).__fakeBracketDb = db;
  return { supabase: db.client };
});

// Silence the very chatty bracket logging; every export is a function.
vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.keys(actual).map((key) => [key, vi.fn()]));
});

import { BracketManagerService } from '@/services/brackets/manager/BracketManagerService';
import type { BracketUpdateContext } from '@/services/brackets/manager/services/BracketUpdate';
import { markBracketCompleteIfDone } from '@/services/brackets/manager/services/BracketUpdate';

const db = (): FakeSupabaseBracketDb =>
  (globalThis as Record<string, unknown>).__fakeBracketDb as FakeSupabaseBracketDb;

const BRACKET_ID = 'bracket-uuid-1';

const STATUS_NAMES: Record<number, string> = {
  0: 'Locked',
  1: 'Waiting',
  2: 'Ready',
  3: 'Running',
  4: 'Completed',
  5: 'Archived',
};

interface MatchRow {
  id: number;
  stage_id: number;
  group_id: number;
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

function teams(count: number): { id: string; name: string; seed: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `uuid-${i + 1}`,
    name: `T${i + 1}`,
    seed: i + 1,
  }));
}

function seedBracketRow(): void {
  db().seed('brackets', [{ id: BRACKET_ID, state: 'pending', uses_brackets_manager: true }]);
}

function bracketState(): unknown {
  return db()
    .rows('brackets')
    .find((b) => b.id === BRACKET_ID)?.state;
}

function matchRows(): MatchRow[] {
  return (db().rows('match') as unknown as MatchRow[]).sort((a, b) => a.id - b.id);
}

function mustFindMatch(predicate: (m: MatchRow) => boolean, label: string): MatchRow {
  const match = matchRows().find(predicate);
  if (!match) throw new Error(`test fixture: no match found for "${label}"`);
  return match;
}

/**
 * Same rendering as suite A (tests/bracketManagerLibraryNative.test.ts), but
 * reading the fake's SQL rows: "WB R1 M1: T1:win(2) vs BYE [Locked]".
 * The storage adapter persists a 'bye' sentinel in the result column for
 * strict-null BYE slots, so the SQL rows now carry the BYE/TBD distinction:
 * a null id renders as BYE when the sentinel is present, TBD otherwise.
 */
function snapshotSqlGrid(): string[] {
  const groups = db().rows('group') as { id: number; number: number }[];
  const rounds = db().rows('round') as { id: number; number: number }[];
  const participants = db().rows('participant') as { id: number; name: string | null }[];

  const participantName = (id: number | null): string => {
    if (id === null) return 'TBD';
    return participants.find((p) => p.id === id)?.name ?? `#${id}`;
  };
  const renderSide = (id: number | null, score: number | null, result: string | null): string => {
    if (result === 'bye') return 'BYE';
    if (id === null) return 'TBD';
    let rendered = participantName(id);
    if (result) rendered += `:${result}`;
    if (score !== null) rendered += `(${score})`;
    return rendered;
  };
  const groupLabel = (groupId: number): string => {
    if (groups.length === 1) return 'B';
    const group = groups.find((g) => g.id === groupId);
    return { 1: 'WB', 2: 'LB', 3: 'GF' }[group?.number ?? 0] ?? `G${group?.number}`;
  };
  const roundNumber = (roundId: number): number | undefined =>
    rounds.find((r) => r.id === roundId)?.number;

  return matchRows().map(
    (m) =>
      `${groupLabel(m.group_id)} R${roundNumber(m.round_id)} M${m.number}: ` +
      `${renderSide(m.opponent1_id, m.opponent1_score, m.opponent1_result)} vs ` +
      `${renderSide(m.opponent2_id, m.opponent2_score, m.opponent2_result)} [${STATUS_NAMES[m.status]}]`
  );
}

/**
 * Score the lowest-id playable match (Ready 2 or Running 3) through the real
 * service until none remain. With the faithful storage adapter, unplayed
 * populated matches sit at Ready (2); Running (3) only appears for partially
 * scored matches.
 */
async function playAllReadyMatches(
  service: BracketManagerService,
  options: { skipMatchIds?: number[]; opponent2WinsMatchIds?: number[] } = {}
): Promise<void> {
  const { skipMatchIds = [], opponent2WinsMatchIds = [] } = options;
  for (let i = 0; i < 32; i++) {
    const ready = matchRows()
      .filter((m) => (m.status === 2 || m.status === 3) && !skipMatchIds.includes(m.id))
      .sort((a, b) => a.id - b.id)[0];
    if (!ready) return;
    const opponent1Wins = !opponent2WinsMatchIds.includes(ready.id);
    await service.updateMatch({
      matchId: ready.id,
      scores: {
        opponent1: { score: opponent1Wins ? 2 : 0, result: opponent1Wins ? 'win' : 'loss' },
        opponent2: { score: opponent1Wins ? 0 : 2, result: opponent1Wins ? 'loss' : 'win' },
      },
    });
  }
  throw new Error('playAllReadyMatches did not converge in 32 iterations');
}

beforeAll(() => {
  // The facade constructs BracketsManager with VERBOSE=true, which logs every
  // storage call straight to console.log — silence it for readable test output.
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

beforeEach(() => {
  db().reset();
  db().setRpcHandler('finalize_bracket_standings', () => ({ data: 0, error: null }));
});

describe('bracket service characterization (real service + real library over fake DB)', () => {
  describe('creation', () => {
    it('single elimination, 4 teams: creates the library-native grid (fixed: SE used to reject the DE seedOrdering list)', async () => {
      // Before the identity step, BracketCreationService passed the 3-entry
      // double-elimination seedOrdering list for every format and the library
      // rejected SE creation outright ("You must specify one seed ordering
      // method."). SE now gets exactly one ordering entry.
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'single_elimination',
        teams: teams(4),
      });

      expect(snapshotSqlGrid()).toEqual([
        'B R1 M1: T1 vs T4 [Ready]',
        'B R1 M2: T2 vs T3 [Ready]',
        'B R2 M1: TBD vs TBD [Locked]',
      ]);
      const participants = db().rows('participant') as {
        name: string | null;
        team_id: string | null;
        position: number | null;
      }[];
      expect(
        participants
          .map((p) => ({ name: p.name, team_id: p.team_id, position: p.position }))
          .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      ).toEqual([
        { name: 'T1', team_id: 'uuid-1', position: 1 },
        { name: 'T2', team_id: 'uuid-2', position: 2 },
        { name: 'T3', team_id: 'uuid-3', position: 3 },
        { name: 'T4', team_id: 'uuid-4', position: 4 },
      ]);
    });

    it('double elimination, 6 teams: creates the library-native grid and links participants to teams', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });

      expect(snapshotSqlGrid()).toEqual([
        'WB R1 M1: T1:win vs BYE [Locked]',
        'WB R1 M2: T4 vs T5 [Ready]',
        'WB R1 M3: T2:win vs BYE [Locked]',
        'WB R1 M4: T3 vs T6 [Ready]',
        'WB R2 M1: T1 vs TBD [Waiting]',
        'WB R2 M2: T2 vs TBD [Waiting]',
        'WB R3 M1: TBD vs TBD [Locked]',
        'LB R1 M1: BYE vs TBD [Locked]',
        'LB R1 M2: BYE vs TBD [Locked]',
        'LB R2 M1: TBD vs TBD [Locked]',
        'LB R2 M2: TBD vs TBD [Locked]',
        'LB R3 M1: TBD vs TBD [Locked]',
        'LB R4 M1: TBD vs TBD [Locked]',
        'GF R1 M1: TBD vs TBD [Locked]',
        'GF R2 M1: TBD vs TBD [Locked]',
      ]);

      // Identity: every participant row carries the right team_id and seed
      // position. (Today this is synced by name-matching; the assertion
      // targets values, not the mechanism, so the identity step won't churn it.)
      const participants = db().rows('participant') as {
        name: string | null;
        team_id: string | null;
        position: number | null;
      }[];
      expect(
        participants
          .map((p) => ({ name: p.name, team_id: p.team_id, position: p.position }))
          .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      ).toEqual([
        { name: 'T1', team_id: 'uuid-1', position: 1 },
        { name: 'T2', team_id: 'uuid-2', position: 2 },
        { name: 'T3', team_id: 'uuid-3', position: 3 },
        { name: 'T4', team_id: 'uuid-4', position: 4 },
        { name: 'T5', team_id: 'uuid-5', position: 5 },
        { name: 'T6', team_id: 'uuid-6', position: 6 },
      ]);

      // grandFinalType is persisted library-natively in stage.settings.
      const stage = db().rows('stage')[0] as { settings: { grandFinal?: string } };
      expect(stage.settings.grandFinal).toBe('double');
    });
  });

  describe('creation guards', () => {
    it('rejects two selected teams that share a display name (the library resolves seeding by name)', async () => {
      // brackets-manager maps object seeding back to its participant rows BY
      // NAME, so a duplicated name would silently seed the same participant
      // into both slots. The service must refuse up front.
      seedBracketRow();
      const service = new BracketManagerService();
      const clashing = teams(4);
      clashing[2] = { ...clashing[2], name: clashing[3].name };

      await expect(
        service.createBracket({
          bracketId: BRACKET_ID,
          format: 'double_elimination',
          teams: clashing,
          grandFinalType: 'simple',
        })
      ).rejects.toThrow('are both named "T4"');

      // Nothing was persisted.
      expect(matchRows()).toHaveLength(0);
      expect(db().rows('participant')).toHaveLength(0);
    });
  });

  describe('full playthroughs through the real service', () => {
    it('double elimination, 4 teams, simple grand final: completes and marks the bracket completed', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });
      await playAllReadyMatches(service);

      // Library-native end state through the faithful adapter — identical to
      // suite A's memory-db playthrough. (Before the core refactor, the lossy
      // round-trip + defensive merge produced a fake bye win in LB R1 and T3
      // never played their losers-bracket match.)
      expect(snapshotSqlGrid()).toEqual([
        'WB R1 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R1 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: T4:win(2) vs T3:loss(0) [Archived]',
        'LB R2 M1: T2:win(2) vs T4:loss(0) [Archived]',
        'GF R1 M1: T1:win(2) vs T2:loss(0) [Completed]',
      ]);
      expect(bracketState()).toBe('completed');
    });

    it('double elimination, 6 teams with BYEs: library-native playthrough, ghost reset archived', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });
      await playAllReadyMatches(service, { opponent2WinsMatchIds: [] });

      // Library-native end state, identical to suite A's memory-db semantics:
      // BYE matches auto-resolved with the sentinel layout, the LB bye
      // cascade handled by the library, and — because the WB champion won GF1
      // decisively — the ghost reset match (GF R2) archived unplayed instead
      // of being offered as a playable match.
      expect(snapshotSqlGrid()).toEqual([
        'WB R1 M1: T1:win vs BYE [Archived]',
        'WB R1 M2: T4:win(2) vs T5:loss(0) [Archived]',
        'WB R1 M3: T2:win vs BYE [Archived]',
        'WB R1 M4: T3:win(2) vs T6:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R2 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R3 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: BYE vs T5:win [Archived]',
        'LB R1 M2: BYE vs T6:win [Archived]',
        'LB R2 M1: T3:win(2) vs T5:loss(0) [Archived]',
        'LB R2 M2: T4:win(2) vs T6:loss(0) [Archived]',
        'LB R3 M1: T3:win(2) vs T4:loss(0) [Archived]',
        'LB R4 M1: T2:win(2) vs T3:loss(0) [Archived]',
        'GF R1 M1: T1:win(2) vs T2:loss(0) [Completed]',
        'GF R2 M1: T1 vs T2 [Archived]',
      ]);
      expect(bracketState()).toBe('completed');
    });
  });

  describe('one-sided matches: normal scoring refused, explicit admin action instead', () => {
    it('updateMatch refuses BYE and TBD matches with actionable errors', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });

      // WB R1 M1 is T1 vs BYE — auto-resolved by the library at creation.
      const byeMatch = mustFindMatch(
        (m) => m.number === 1 && m.opponent2_id === null && m.opponent2_result === 'bye',
        'WB R1 bye match'
      );
      await expect(
        service.updateMatch({
          matchId: byeMatch.id,
          scores: { opponent1: { score: 21, result: 'win' } },
        })
      ).rejects.toThrow('This match has a BYE and resolves automatically');

      // WB R3 M1 is TBD vs TBD — waiting on earlier rounds.
      const tbdMatch = mustFindMatch(
        (m) => m.opponent1_id === null && m.opponent1_result === null && m.status === 0,
        'a TBD match'
      );
      await expect(
        service.updateMatch({
          matchId: tbdMatch.id,
          scores: { opponent1: { score: 2, result: 'win' } },
        })
      ).rejects.toThrow('This match is still waiting on earlier results');
    });

    it('adminCompleteByeMatch records a walkover score on a one-sided match (legacy tool)', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });

      const byeMatch = mustFindMatch(
        (m) => m.number === 1 && m.opponent2_result === 'bye',
        'WB R1 bye match'
      );
      const result = await service.adminCompleteByeMatch(byeMatch.id, 21);
      expect(result).toMatchObject({ matchId: byeMatch.id, placedInMatchId: null });

      const after = matchRows().find((m) => m.id === byeMatch.id);
      expect(after).toMatchObject({
        status: 4,
        opponent1_score: 21,
        opponent1_result: 'win',
        // The BYE sentinel on the empty side is preserved.
        opponent2_result: 'bye',
      });
    });

    it('marks the bracket completed when the walkover settles the last outstanding match', async () => {
      // Legacy shape: a one-sided final with no BYE sentinel reads as
      // "T1 vs TBD" and blocks completion — and it is the only unfinished
      // match. Completing it through the admin tool must run the same
      // completion re-evaluation a normal score save runs.
      seedBracketRow();
      db().seed('stage', [
        {
          id: 1,
          tournament_id: BRACKET_ID,
          name: 'S',
          type: 'single_elimination',
          number: 1,
          settings: {},
        },
      ]);
      db().seed('group', [{ id: 1, stage_id: 1, number: 1 }]);
      db().seed('round', [
        { id: 1, stage_id: 1, group_id: 1, number: 1 },
        { id: 2, stage_id: 1, group_id: 1, number: 2 },
      ]);
      db().seed('participant', [
        { id: 1, tournament_id: BRACKET_ID, name: 'T1', team_id: 'uuid-1', position: 1 },
        { id: 2, tournament_id: BRACKET_ID, name: 'T2', team_id: 'uuid-2', position: 2 },
      ]);
      db().seed('match', [
        {
          id: 1,
          stage_id: 1,
          group_id: 1,
          round_id: 1,
          number: 1,
          status: 5,
          child_count: 0,
          opponent1_id: 1,
          opponent1_score: 2,
          opponent1_result: 'win',
          opponent2_id: 2,
          opponent2_score: 0,
          opponent2_result: 'loss',
        },
        // The final: T1 arrived, the other slot never got populated.
        {
          id: 2,
          stage_id: 1,
          group_id: 1,
          round_id: 2,
          number: 1,
          status: 2,
          child_count: 0,
          opponent1_id: 1,
          opponent1_score: null,
          opponent1_result: null,
          opponent2_id: null,
          opponent2_score: null,
          opponent2_result: null,
        },
      ]);

      const service = new BracketManagerService();
      const result = await service.adminCompleteByeMatch(2, 21);

      expect(result.placedInMatchId).toBeNull();
      expect(bracketState()).toBe('completed');
    });
  });

  describe('completion detection (markBracketCompleteIfDone)', () => {
    it('unpopulated TBD matches BLOCK completion (fixed: they used to be skipped)', async () => {
      // A downstream match whose opponent slots were never populated (silent
      // propagation failure) must keep the bracket incomplete — before the
      // core refactor it was excluded from the check and the bracket was
      // marked completed prematurely.
      seedBracketRow();
      db().seed('stage', [
        {
          id: 1,
          tournament_id: BRACKET_ID,
          name: 'S',
          type: 'single_elimination',
          number: 1,
          settings: {},
        },
      ]);
      db().seed('group', [{ id: 1, stage_id: 1, number: 1 }]);
      db().seed('round', [
        { id: 1, stage_id: 1, group_id: 1, number: 1 },
        { id: 2, stage_id: 1, group_id: 1, number: 2 },
      ]);
      db().seed('participant', [
        { id: 1, tournament_id: BRACKET_ID, name: 'T1', team_id: 'uuid-1', position: 1 },
        { id: 2, tournament_id: BRACKET_ID, name: 'T2', team_id: 'uuid-2', position: 2 },
        { id: 3, tournament_id: BRACKET_ID, name: 'T3', team_id: 'uuid-3', position: 3 },
        { id: 4, tournament_id: BRACKET_ID, name: 'T4', team_id: 'uuid-4', position: 4 },
      ]);
      db().seed('match', [
        // Both semifinals played...
        {
          id: 1,
          stage_id: 1,
          group_id: 1,
          round_id: 1,
          number: 1,
          status: 5,
          child_count: 0,
          opponent1_id: 1,
          opponent1_score: 2,
          opponent1_result: 'win',
          opponent2_id: 4,
          opponent2_score: 0,
          opponent2_result: 'loss',
        },
        {
          id: 2,
          stage_id: 1,
          group_id: 1,
          round_id: 1,
          number: 2,
          status: 5,
          child_count: 0,
          opponent1_id: 2,
          opponent1_score: 2,
          opponent1_result: 'win',
          opponent2_id: 3,
          opponent2_score: 0,
          opponent2_result: 'loss',
        },
        // ...but the final never received its players (propagation failure).
        {
          id: 3,
          stage_id: 1,
          group_id: 1,
          round_id: 2,
          number: 1,
          status: 0,
          child_count: 0,
          opponent1_id: null,
          opponent1_score: null,
          opponent1_result: null,
          opponent2_id: null,
          opponent2_score: null,
          opponent2_result: null,
        },
      ]);

      const service = new BracketManagerService();
      const ctx = {
        storage: service.getStorage(),
        manager: undefined,
        normalizationService: undefined,
      } as unknown as BracketUpdateContext;
      await markBracketCompleteIfDone(ctx, BRACKET_ID);

      // The unplayed final blocks completion.
      expect(bracketState()).toBe('pending');
    });
  });

  describe('admin correction of an archived match', () => {
    it('unlocks 5→4 and lets the library update the score in place', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });
      await playAllReadyMatches(service);

      const archived = mustFindMatch((m) => m.status === 5, 'an archived match');
      await service.updateMatch({
        matchId: archived.id,
        scores: {
          opponent1: { score: 3, result: 'win' },
          opponent2: { score: 1, result: 'loss' },
        },
      });

      const corrected = matchRows().find((m) => m.id === archived.id);
      expect(corrected).toMatchObject({
        status: 4,
        opponent1_score: 3,
        opponent2_score: 1,
        opponent1_result: 'win',
      });
    });
  });

  describe('seeding update before play', () => {
    it('reorders an unplayed bracket and re-syncs participant team links', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });

      // Swap T3 and T4 in the seed order.
      await service.updateSeeding({
        bracketId: BRACKET_ID,
        newSeeding: [
          { id: 'uuid-1', name: 'T1', seed: 1 },
          { id: 'uuid-2', name: 'T2', seed: 2 },
          { id: 'uuid-4', name: 'T4', seed: 3 },
          { id: 'uuid-3', name: 'T3', seed: 4 },
        ],
      });

      const participants = db().rows('participant') as {
        name: string | null;
        team_id: string | null;
        position: number | null;
      }[];
      expect(
        participants
          .map((p) => ({ name: p.name, team_id: p.team_id, position: p.position }))
          .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
      ).toEqual([
        { name: 'T1', team_id: 'uuid-1', position: 1 },
        { name: 'T2', team_id: 'uuid-2', position: 2 },
        { name: 'T4', team_id: 'uuid-4', position: 3 },
        { name: 'T3', team_id: 'uuid-3', position: 4 },
      ]);

      // inner_outer pairing with the new order: 1v4-slot, 2v3-slot. The
      // faithful adapter keeps unplayed matches at Ready (the old null-score
      // inflation used to flip them to Running here).
      const grid = snapshotSqlGrid();
      expect(grid[0]).toBe('WB R1 M1: T1 vs T3 [Ready]');
      expect(grid[1]).toBe('WB R1 M2: T2 vs T4 [Ready]');
    });

    it('rejects a seeding update where two teams share a display name', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });
      const gridBefore = snapshotSqlGrid();

      await expect(
        service.updateSeeding({
          bracketId: BRACKET_ID,
          newSeeding: [
            { id: 'uuid-1', name: 'T1', seed: 1 },
            { id: 'uuid-2', name: 'T2', seed: 2 },
            // uuid-3 renamed to clash with uuid-2.
            { id: 'uuid-3', name: 'T2', seed: 3 },
            { id: 'uuid-4', name: 'T4', seed: 4 },
          ],
        })
      ).rejects.toThrow('are both named "T2"');

      // The bracket is untouched.
      expect(snapshotSqlGrid()).toEqual(gridBefore);
    });
  });

  describe('admin BYE toggle lifecycle (legacy-bracket tool)', () => {
    it('reopens a completed LB bye-side match with downstream clearing, then re-completion re-propagates', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });

      // Play only the two real WB R1 matches (the only playable ones at creation).
      const readyAtCreation = matchRows()
        .filter((m) => m.status === 2)
        .map((m) => m.id);
      expect(readyAtCreation).toHaveLength(2);
      for (const matchId of readyAtCreation) {
        await service.updateMatch({
          matchId,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        });
      }

      // The WB losers dropped into the LB R1 bye-side matches, which the
      // repair layer completed. Pick the first one.
      const lbGroup = (db().rows('group') as { id: number; number: number }[]).find(
        (g) => g.number === 2
      );
      const lbRound1 = (
        db().rows('round') as { id: number; group_id: number; number: number }[]
      ).find((r) => r.group_id === lbGroup?.id && r.number === 1);
      const lbByeMatch = mustFindMatch(
        (m) => m.round_id === lbRound1?.id && m.status === 4,
        'a completed LB R1 bye-side match'
      );

      const eligibility = await service.checkByeEligibility(lbByeMatch.id);
      expect(eligibility.ok).toBe(true);

      // Reopen it, cascading a clear of the downstream chain.
      const reopened = await service.adminToggleByeReady(lbByeMatch.id, false, true);
      expect(reopened).toMatchObject({ status: 2, statusName: 'Ready' });
      const afterReopen = matchRows().find((m) => m.id === lbByeMatch.id);
      expect(afterReopen).toMatchObject({
        status: 2,
        opponent1_result: null,
        opponent1_score: null,
      });

      // Score it again through the explicit admin action — it re-completes
      // and re-propagates the winner downstream.
      await service.adminCompleteByeMatch(lbByeMatch.id, 0);
      const recompleted = matchRows().find((m) => m.id === lbByeMatch.id);
      expect(recompleted?.status).toBe(4);
      expect([recompleted?.opponent1_result, recompleted?.opponent2_result]).toContain('win');
    });
  });

  describe('explicit admin repair (repairBracket)', () => {
    it('re-propagates a blanked slot, readies the match, and reports an auditable summary', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });

      // Play the first four playable matches (WB R1 ×2, WB R2, LB R1) so the
      // LB final (LB R2) is populated: T2 (WB R2 loser) vs T4 (LB R1 winner).
      for (let i = 0; i < 4; i++) {
        const playable = matchRows()
          .filter((m) => m.status === 2 || m.status === 3)
          .sort((a, b) => a.id - b.id)[0];
        expect(playable).toBeDefined();
        await service.updateMatch({
          matchId: playable.id,
          scores: {
            opponent1: { score: 2, result: 'win' },
            opponent2: { score: 0, result: 'loss' },
          },
        });
      }

      // Corrupt the LB final the way a silent propagation failure would:
      // blank the slot fed by LB R1 and lock the match.
      const lbGroup = (db().rows('group') as { id: number; number: number }[]).find(
        (g) => g.number === 2
      );
      const lbRound2 = (
        db().rows('round') as { id: number; group_id: number; number: number }[]
      ).find((r) => r.group_id === lbGroup?.id && r.number === 2);
      const lbFinal = mustFindMatch((m) => m.round_id === lbRound2?.id, 'the LB final');
      expect(lbFinal.opponent2_id).not.toBeNull();
      const liveRow = db()
        .tableRows('match')
        .find((row) => row.id === lbFinal.id);
      Object.assign(liveRow ?? {}, {
        opponent2_id: null,
        opponent2_score: null,
        opponent2_result: null,
        status: 1,
      });

      // One explicit repair pass restores the slot and makes it playable.
      const summary = await service.repairBracket(BRACKET_ID);
      expect(summary).toMatchObject({ stagesRepaired: 1, bracketMarkedCompleted: false });
      expect(summary.matchesChanged).toBeGreaterThanOrEqual(1);

      const repaired = mustFindMatch((m) => m.id === lbFinal.id, 'the repaired LB final');
      expect(repaired.opponent2_id).toBe(lbFinal.opponent2_id);
      expect(repaired.status).toBe(2);

      // The bracket plays on to completion afterwards.
      await playAllReadyMatches(service);
      expect(bracketState()).toBe('completed');
    });

    it('reports nothing to repair on a healthy bracket and throws for an unknown one', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });

      const summary = await service.repairBracket(BRACKET_ID);
      expect(summary).toMatchObject({
        stagesRepaired: 1,
        bracketMarkedCompleted: false,
        statusesNormalized: 0,
      });

      await expect(service.repairBracket('missing-bracket')).rejects.toThrow(
        "Bracket stage with ID 'missing-bracket' not found"
      );
    });
  });

  describe('final standings (server-side RPC)', () => {
    it('a decisive GF1 archives the ghost reset match, so standings can finalize (fixed: it used to block)', async () => {
      // With grandFinal 'double', the library leaves GF2 populated+Ready when
      // the WB champion decisively wins GF1 (its own standings ignore it via
      // getGrandFinalDecisiveMatch). The update service now archives the
      // ghost match, so the bracket completes and the standings pre-check
      // passes instead of reporting incomplete-matches forever.
      seedBracketRow();
      db().setRpcHandler('finalize_bracket_standings', () => ({ data: 4, error: null }));
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'double',
      });

      // The WB champion (opponent1) wins every match including GF1; the reset
      // match is never playable and gets archived automatically.
      await playAllReadyMatches(service);

      const gfGroup = (db().rows('group') as { id: number; number: number }[]).find(
        (g) => g.number === 3
      );
      const gfRound2 = (
        db().rows('round') as { id: number; group_id: number; number: number }[]
      ).find((r) => r.group_id === gfGroup?.id && r.number === 2);
      const ghostReset = mustFindMatch((m) => m.round_id === gfRound2?.id, 'the reset match');
      expect(ghostReset.status).toBe(5);
      expect(bracketState()).toBe('completed');

      const result = await service.calculateFinalStandings(BRACKET_ID);
      expect(result).toEqual({ written: true });
      expect(db().rpcCalls).toEqual([
        { name: 'finalize_bracket_standings', args: { p_bracket_id: BRACKET_ID } },
      ]);
    });

    it('invokes the finalize RPC once the bracket is fully resolved', async () => {
      seedBracketRow();
      db().setRpcHandler('finalize_bracket_standings', () => ({ data: 4, error: null }));
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'simple',
      });
      await playAllReadyMatches(service);

      const result = await service.calculateFinalStandings(BRACKET_ID);
      expect(result).toEqual({ written: true });
      expect(db().rpcCalls).toEqual([
        { name: 'finalize_bracket_standings', args: { p_bracket_id: BRACKET_ID } },
      ]);
    });
  });
});
