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
 * A slot with a null id is 'TBD' only when the row distinguishes it; in SQL
 * storage both BYE and TBD slots are null ids, so we follow the service's own
 * convention: null id + null result = TBD, null id + a result on the other
 * side of a bye row still renders TBD. (The library-side BYE distinction only
 * exists in brackets-manager's object model, not in the SQL columns.)
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
 * Score the lowest-id playable match through the real service until none
 * remain. "Playable" is status 2 (Ready) or 3 (Running): the current SQL
 * adapter re-inflates empty scores as null, which brackets-manager reads as
 * "match started", so populated-but-unplayed matches sit at 3 — a
 * characterized artifact of the current adapter (production data shows the
 * same, which is how status 3 ended up in the playoff_matches sync trigger).
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
        'WB R1 M1: T1:win vs TBD [Locked]',
        'WB R1 M2: T4 vs T5 [Ready]',
        'WB R1 M3: T2:win vs TBD [Locked]',
        'WB R1 M4: T3 vs T6 [Ready]',
        'WB R2 M1: T1 vs TBD [Waiting]',
        'WB R2 M2: T2 vs TBD [Waiting]',
        'WB R3 M1: TBD vs TBD [Locked]',
        'LB R1 M1: TBD vs TBD [Locked]',
        'LB R1 M2: TBD vs TBD [Locked]',
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

      // CURRENT BEHAVIOR (changes in the core-refactor step). The library-
      // native result (suite A) would be 'LB R1 M1: T4:win(2) vs T3:loss(0)'
      // — T3 and T4 play a real losers-bracket match. Instead, the storage
      // adapter's lossy round-trip confuses the library's first loser drop,
      // the defensive merge turns it into a duplicate, and normalizeLosersR1
      // "fixes" the duplicate by hard-completing the match as a fake bye win
      // (win, score 0, status 4) BEFORE the second loser arrives. T3 is then
      // dropped into an already-completed match with a bare 'loss' — the
      // second WB loser never gets to play their losers-bracket match.
      expect(snapshotSqlGrid()).toEqual([
        'WB R1 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R1 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: T4:win(0) vs T3:loss [Completed]',
        'LB R2 M1: T2:win(2) vs T4:loss(0) [Archived]',
        'GF R1 M1: T1:win(2) vs T2:loss(0) [Completed]',
      ]);
      expect(bracketState()).toBe('completed');
    });

    it('double elimination, 6 teams with BYEs: playthrough completes (current repair layer reshapes LB bye rows)', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });
      await playAllReadyMatches(service, { opponent2WinsMatchIds: [] });

      // CURRENT BEHAVIOR (changes in the core-refactor step). Same fake-bye
      // artifact as the DE-4 scenario, on both LB R1 bye-side matches: the
      // WB losers T5/T6 are hard-completed as 'win(0) vs TBD' instead of the
      // library-native 'BYE vs T5:win'. Note also GF2 played after a decisive
      // GF1 (the ghost reset match), and the inconsistent archival of
      // repair-written rows (LB R3 stays Completed instead of Archived).
      expect(snapshotSqlGrid()).toEqual([
        'WB R1 M1: T1:win vs TBD [Archived]',
        'WB R1 M2: T4:win(2) vs T5:loss(0) [Archived]',
        'WB R1 M3: T2:win vs TBD [Archived]',
        'WB R1 M4: T3:win(2) vs T6:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R2 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R3 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: T5:win(0) vs TBD [Completed]',
        'LB R1 M2: T6:win(0) vs TBD [Completed]',
        'LB R2 M1: T3:win(2) vs T5:loss(0) [Archived]',
        'LB R2 M2: T4:win(2) vs T6:loss(0) [Archived]',
        'LB R3 M1: T3:win(2) vs T4:loss(0) [Completed]',
        'LB R4 M1: T2:win(2) vs T3:loss(0) [Archived]',
        'GF R1 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'GF R2 M1: T1:win(2) vs T2:loss(0) [Completed]',
      ]);
      expect(bracketState()).toBe('completed');
    });
  });

  describe('current behavior: BYE bypass (replaced in core-refactor step)', () => {
    it('scoring a creation-resolved BYE match rides the direct-SQL bypass and hard-completes it', async () => {
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(6),
        grandFinalType: 'double',
      });

      // WB R1 M1 is T1 vs BYE — auto-resolved by the library at creation
      // (status Locked, result win). The current update path detects the null
      // opponent and bypasses the library entirely, forcing status 4.
      const byeMatch = mustFindMatch(
        (m) => m.number === 1 && m.opponent2_id === null,
        'WB R1 bye match'
      );
      await service.updateMatch({
        matchId: byeMatch.id,
        scores: { opponent1: { score: 21, result: 'win' } },
      });

      const after = matchRows().find((m) => m.id === byeMatch.id);
      expect(after).toMatchObject({
        status: 4,
        opponent1_score: 21,
        opponent1_result: 'win',
      });
    });
  });

  describe('completion detection (markBracketCompleteIfDone)', () => {
    it('KNOWN BUG (fixed in core-refactor step): unpopulated TBD matches do not block completion', async () => {
      // A downstream match whose opponent slots were never populated (silent
      // propagation failure) is excluded from the "playable" filter, so the
      // bracket is marked completed while a real match still awaits players.
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

      // CURRENT (buggy) behavior: the unplayed final is invisible to the check.
      expect(bracketState()).toBe('completed');
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

      // inner_outer pairing with the new order: 1v4-slot, 2v3-slot.
      // Status is Running (3), not Ready (2): update.seeding makes the
      // library RE-READ existing matches through the SQL adapter, whose
      // null-score inflation reads as "match started" — the same current
      // adapter artifact characterized in playAllReadyMatches.
      const grid = snapshotSqlGrid();
      expect(grid[0]).toBe('WB R1 M1: T1 vs T3 [Running]');
      expect(grid[1]).toBe('WB R1 M2: T2 vs T4 [Running]');
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

      // Score it again — the current bypass re-completes and re-propagates.
      await service.updateMatch({
        matchId: lbByeMatch.id,
        scores: { opponent1: { score: 0 } },
      });
      const recompleted = matchRows().find((m) => m.id === lbByeMatch.id);
      expect(recompleted).toMatchObject({ status: 4, opponent1_result: 'win' });
    });
  });

  describe('final standings (server-side RPC)', () => {
    it('refuses while any populated match is unresolved — including the ghost reset match after a decisive GF1', async () => {
      // With grandFinal 'double', the library leaves GF2 populated+Ready when
      // the WB champion decisively wins GF1. The standings pre-check (and the
      // server RPC) treat that ghost match as unresolved, so standings are
      // never written. Characterized here; the core-refactor step archives
      // the ghost match so completion and standings agree with the library's
      // own decisive-match semantics.
      seedBracketRow();
      const service = new BracketManagerService();
      await service.createBracket({
        bracketId: BRACKET_ID,
        format: 'double_elimination',
        teams: teams(4),
        grandFinalType: 'double',
      });

      // Play everything except the reset match (GF R2).
      const gfGroup = (db().rows('group') as { id: number; number: number }[]).find(
        (g) => g.number === 3
      );
      const gfRound2 = (
        db().rows('round') as { id: number; group_id: number; number: number }[]
      ).find((r) => r.group_id === gfGroup?.id && r.number === 2);
      const gf2 = matchRows().find((m) => m.round_id === gfRound2?.id);
      await playAllReadyMatches(service, { skipMatchIds: gf2 ? [gf2.id] : [] });

      const result = await service.calculateFinalStandings(BRACKET_ID);
      expect(result).toEqual({ written: false, reason: 'incomplete-matches' });
      expect(db().rpcCalls).toHaveLength(0);
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
