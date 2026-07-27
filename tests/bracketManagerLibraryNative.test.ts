/**
 * Characterization suite A — the REAL brackets-manager (pinned 1.11.0) running
 * against its in-memory reference storage (brackets-memory-db). No app code.
 *
 * Purpose: pin the library's exact native semantics so the PR-13 refactor
 * ("trust the library") is evidence-based. Every assertion below was generated
 * by running the pinned library and sanity-checking the output by hand — these
 * are recorded facts, not aspirations. If a library upgrade changes any of
 * them, this suite is the early-warning system.
 *
 * Probe outcomes that later refactor steps rely on:
 *  - SE stages REQUIRE exactly one seedOrdering entry; a multi-entry list makes
 *    `create.stage` throw (an app bug fixed in the identity step).
 *  - DE stages accept a short list and resolve the rest from the library's own
 *    size-keyed `defaultMinorOrdering`, so the app supplies only 'inner_outer'
 *    and gets the right lower bracket at 4/8/16/32 alike.
 *  - Seeding with objects ({ name, team_id }) persists extra fields onto
 *    participant rows, in seeding order → team_id identity needs no name match.
 *  - BYE matches are auto-resolved AT CREATION (result 'win', status stays
 *    Locked) and winners are propagated; the LB bye cascade auto-resolves
 *    during play. No update-time BYE handling is ever needed for new brackets.
 *  - Illegal updates throw "The match is locked." / "Match not found." —
 *    nothing is silently tolerated.
 *  - With grandFinal 'double', the library populates GF2 (Ready) even when the
 *    WB champion decisively won GF1; its own standings then IGNORE GF2
 *    (getGrandFinalDecisiveMatch). Completion logic must not block on it.
 */
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import type { Group, Match, Participant, ParticipantResult, Round, Stage } from 'brackets-model';
import { describe, expect, it } from 'vitest';

const STATUS_NAMES: Record<number, string> = {
  0: 'Locked',
  1: 'Waiting',
  2: 'Ready',
  3: 'Running',
  4: 'Completed',
  5: 'Archived',
};

interface TestContext {
  storage: InMemoryDatabase;
  manager: BracketsManager;
}

function createContext(): TestContext {
  const storage = new InMemoryDatabase();
  const manager = new BracketsManager(storage);
  return { storage, manager };
}

const teamNames = (count: number): string[] => Array.from({ length: count }, (_, i) => `T${i + 1}`);

/**
 * Mirrors BracketCreationService sizing: next power of two, nulls for BYEs.
 */
function seedingWithByes(names: string[]): (string | null)[] {
  let bracketSize = 2;
  while (bracketSize < names.length) bracketSize *= 2;
  return [...names, ...Array<null>(bracketSize - names.length).fill(null)];
}

/**
 * Mirrors BracketCreationService: the app supplies only the WB first-round
 * method and lets the library resolve every LB ordering from its own
 * size-keyed `defaultMinorOrdering` table. SE requires exactly one entry
 * (pinned below); DE accepts a short list and fills in the rest.
 */
function appSeedOrdering(): string[] {
  return ['inner_outer'];
}

async function createStage(
  ctx: TestContext,
  format: 'single_elimination' | 'double_elimination',
  count: number,
  grandFinal: 'none' | 'simple' | 'double' = 'none'
): Promise<Stage> {
  const seeding = seedingWithByes(teamNames(count));
  return ctx.manager.create.stage({
    name: 'characterization',
    tournamentId: 0,
    type: format,
    seeding,
    settings: {
      seedOrdering: appSeedOrdering() as never,
      grandFinal,
    },
  });
}

/**
 * Renders the full bracket as compact strings, one per match:
 *   "WB R1 M1: T1:win vs BYE [Locked]"
 * Opponents: null → BYE, { id: null } → TBD, else name[:result][(score)].
 */
async function snapshotGrid(ctx: TestContext, stageId: number): Promise<string[]> {
  const groups = ((await ctx.storage.select<Group>('group', { stage_id: stageId })) ??
    []) as Group[];
  const rounds = ((await ctx.storage.select<Round>('round', { stage_id: stageId })) ??
    []) as Round[];
  const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
    []) as Match[];
  const participants = ((await ctx.storage.select<Participant>('participant')) ??
    []) as Participant[];

  const participantName = (id: number): string =>
    participants.find((p) => p.id === id)?.name ?? `#${id}`;

  const renderOpponent = (opponent: ParticipantResult | null): string => {
    if (opponent === null) return 'BYE';
    if (opponent.id === null || opponent.id === undefined) return 'TBD';
    let rendered = participantName(opponent.id as number);
    if (opponent.result) rendered += `:${opponent.result}`;
    if (opponent.score !== undefined) rendered += `(${opponent.score})`;
    return rendered;
  };

  const groupLabel = (groupId: number): string => {
    if (groups.length === 1) return 'B';
    const group = groups.find((g) => g.id === groupId);
    return { 1: 'WB', 2: 'LB', 3: 'GF' }[group?.number ?? 0] ?? `G${group?.number}`;
  };

  const roundNumber = (roundId: number): number | undefined =>
    rounds.find((r) => r.id === roundId)?.number;

  return matches
    .slice()
    .sort((a, b) => (a.id as number) - (b.id as number))
    .map(
      (m) =>
        `${groupLabel(m.group_id as number)} R${roundNumber(m.round_id as number)} M${m.number}: ` +
        `${renderOpponent(m.opponent1)} vs ${renderOpponent(m.opponent2)} [${STATUS_NAMES[m.status]}]`
    );
}

/**
 * Renders only the lower bracket, by drop-in slot rather than by participant:
 *   "LB R2 M1: p8 vs TBD"
 * `position` is the marker the library writes to say which upper-bracket loser
 * feeds this slot — it is exactly what the LB seed orderings permute, so this
 * is the view that shows an ordering change.
 */
async function lbSlotPositions(ctx: TestContext, stageId: number): Promise<string[]> {
  const groups = ((await ctx.storage.select<Group>('group', { stage_id: stageId })) ??
    []) as Group[];
  const rounds = ((await ctx.storage.select<Round>('round', { stage_id: stageId })) ??
    []) as Round[];
  const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
    []) as Match[];

  const lbGroupId = groups.find((g) => g.number === 2)?.id;
  if (lbGroupId === undefined) throw new Error('no lower-bracket group');

  const renderSlot = (opponent: ParticipantResult | null): string => {
    if (opponent === null) return 'BYE';
    const { position } = opponent as ParticipantResult & { position?: number };
    if (position !== undefined) return `p${position}`;
    return opponent.id === null || opponent.id === undefined ? 'TBD' : `#${opponent.id}`;
  };

  return matches
    .filter((m) => m.group_id === lbGroupId)
    .sort((a, b) => (a.id as number) - (b.id as number))
    .map(
      (m) =>
        `LB R${rounds.find((r) => r.id === m.round_id)?.number} M${m.number}: ` +
        `${renderSlot(m.opponent1)} vs ${renderSlot(m.opponent2)}`
    );
}

/**
 * Repeatedly scores the lowest-id Ready match until none remain.
 * pickOpponent1Winner decides the winner side per match (default: opponent1).
 */
async function playAllReadyMatches(
  ctx: TestContext,
  stageId: number,
  pickOpponent1Winner: (match: Match) => boolean = () => true
): Promise<void> {
  for (let i = 0; i < 32; i++) {
    const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
      []) as Match[];
    const ready = matches
      .filter((m) => m.status === 2)
      .sort((a, b) => (a.id as number) - (b.id as number))[0];
    if (!ready) return;
    const opponent1Wins = pickOpponent1Winner(ready);
    await ctx.manager.update.match({
      id: ready.id,
      opponent1: { score: opponent1Wins ? 2 : 0, result: opponent1Wins ? 'win' : 'loss' },
      opponent2: { score: opponent1Wins ? 0 : 2, result: opponent1Wins ? 'loss' : 'win' },
    });
  }
  throw new Error('playAllReadyMatches did not converge in 32 iterations');
}

async function gfGroupId(ctx: TestContext, stageId: number): Promise<number> {
  const groups = ((await ctx.storage.select<Group>('group', { stage_id: stageId })) ??
    []) as Group[];
  const gf = groups.find((g) => g.number === 3);
  if (!gf) throw new Error('no grand-final group');
  return gf.id as number;
}

describe('brackets-manager library-native characterization', () => {
  describe('stage creation constraints', () => {
    it('rejects a multi-entry seedOrdering for single elimination', async () => {
      // BracketCreationService once passed the full DE ordering list for every
      // format; the pinned library refuses it for SE. This was the root cause of
      // broken SE bracket creation, fixed in the identity step. Pinned here so
      // the single-entry SE contract cannot be broken again.
      const ctx = createContext();
      await expect(
        ctx.manager.create.stage({
          name: 'characterization',
          tournamentId: 0,
          type: 'single_elimination',
          seeding: teamNames(4),
          settings: {
            seedOrdering: ['inner_outer', 'natural', 'reverse'] as never,
            grandFinal: 'none',
          },
        })
      ).rejects.toThrow('You must specify one seed ordering method.');
    });

    it('persists settings (incl. grandFinal) onto the stage row', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 6, 'double');
      const stored = (await ctx.storage.select<Stage>('stage', stage.id as number)) as Stage;
      expect(stored.settings).toMatchObject({
        grandFinal: 'double',
        // The app supplies only 'inner_outer'; the library resolves the LB
        // orderings from defaultMinorOrdering[8] and writes the full list back
        // (ensureSeedOrdering). The last minor round is skipped — one
        // participant to order — so no fourth entry is ever resolved.
        seedOrdering: ['inner_outer', 'natural', 'reverse'],
        size: 8,
      });
    });

    it.each([
      [4, ['inner_outer', 'natural']],
      [8, ['inner_outer', 'natural', 'reverse']],
      [16, ['inner_outer', 'natural', 'reverse_half_shift', 'reverse']],
      [32, ['inner_outer', 'natural', 'reverse', 'half_shift', 'natural']],
    ])(
      'resolves the library LB orderings for a %i-team double elimination',
      async (size, expected) => {
        // Regression guard for the 32-team bug: BracketCreationService used to
        // hard-code the LB list for 4/8/16 only and fall back to the 16-team
        // list for anything larger, so size 32 got 'reverse_half_shift, reverse'
        // where the library intends 'reverse, half_shift'. Sizes 4/8/16 are
        // included to pin that delegating to the library did NOT change them.
        const ctx = createContext();
        const stage = await createStage(ctx, 'double_elimination', size, 'double');
        const stored = (await ctx.storage.select<Stage>('stage', stage.id as number)) as Stage;
        expect(stored.settings).toMatchObject({ seedOrdering: expected, size });
      }
    );

    it('places 32-team LB seeds differently than the old 16-team fallback', async () => {
      // The fix is invisible unless something asserts the match layout actually
      // moved. 12 of the 30 LB matches change; LB round 2 is the clearest.
      const fixed = createContext();
      const fixedStage = await createStage(fixed, 'double_elimination', 32, 'double');

      const legacy = createContext();
      const legacyStage = await legacy.manager.create.stage({
        name: 'characterization',
        tournamentId: 0,
        type: 'double_elimination',
        seeding: seedingWithByes(teamNames(32)),
        settings: {
          seedOrdering: [
            'inner_outer',
            'natural',
            'reverse_half_shift',
            'reverse',
            'natural',
          ] as never,
          grandFinal: 'double',
        },
      });

      const fixedLb = await lbSlotPositions(fixed, fixedStage.id as number);
      const legacyLb = await lbSlotPositions(legacy, legacyStage.id as number);

      expect(fixedLb).toHaveLength(30);
      expect(fixedLb.filter((line, i) => line !== legacyLb[i])).toHaveLength(12);

      // LB round 1 is identical (it is fed by the WB first round, ordered by
      // 'inner_outer' in both). Round 2 is where the orderings diverge.
      expect(fixedLb.slice(0, 8)).toEqual(legacyLb.slice(0, 8));
      expect(fixedLb.slice(8, 16)).toEqual([
        'LB R2 M1: p8 vs TBD',
        'LB R2 M2: p7 vs TBD',
        'LB R2 M3: p6 vs TBD',
        'LB R2 M4: p5 vs TBD',
        'LB R2 M5: p4 vs TBD',
        'LB R2 M6: p3 vs TBD',
        'LB R2 M7: p2 vs TBD',
        'LB R2 M8: p1 vs TBD',
      ]);
      expect(legacyLb.slice(8, 16)).toEqual([
        'LB R2 M1: p4 vs TBD',
        'LB R2 M2: p3 vs TBD',
        'LB R2 M3: p2 vs TBD',
        'LB R2 M4: p1 vs TBD',
        'LB R2 M5: p8 vs TBD',
        'LB R2 M6: p7 vs TBD',
        'LB R2 M7: p6 vs TBD',
        'LB R2 M8: p5 vs TBD',
      ]);
    });
  });

  describe('seeding with custom participant objects', () => {
    it('persists extra fields (team_id) onto participant rows, in seeding order', async () => {
      const ctx = createContext();
      await ctx.manager.create.stage({
        name: 'characterization',
        tournamentId: 0,
        type: 'single_elimination',
        seeding: [
          { name: 'T1', team_id: 'uuid-1' },
          { name: 'T2', team_id: 'uuid-2' },
          { name: 'T3', team_id: 'uuid-3' },
          null, // BYE — must not create a participant row
        ] as never,
        settings: { seedOrdering: ['inner_outer'] as never, grandFinal: 'none' },
      });
      const participants = ((await ctx.storage.select<Participant>('participant')) ??
        []) as (Participant & {
        team_id?: string;
      })[];
      expect(
        participants
          .slice()
          .sort((a, b) => (a.id as number) - (b.id as number))
          .map((p) => ({ name: p.name, team_id: p.team_id }))
      ).toEqual([
        { name: 'T1', team_id: 'uuid-1' },
        { name: 'T2', team_id: 'uuid-2' },
        { name: 'T3', team_id: 'uuid-3' },
      ]);
    });
  });

  describe('creation grids (BYEs auto-resolved at creation)', () => {
    it('single elimination, 4 teams', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 4);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'B R1 M1: T1 vs T4 [Ready]',
        'B R1 M2: T2 vs T3 [Ready]',
        'B R2 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('single elimination, 5 teams (3 BYEs): bye winners pre-advanced, bye matches stay Locked with a win result', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 5);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'B R1 M1: T1:win vs BYE [Locked]',
        'B R1 M2: T4 vs T5 [Ready]',
        'B R1 M3: T2:win vs BYE [Locked]',
        'B R1 M4: T3:win vs BYE [Locked]',
        'B R2 M1: T1 vs TBD [Waiting]',
        'B R2 M2: T2 vs T3 [Ready]',
        'B R3 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('single elimination, 6 teams (2 BYEs)', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 6);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'B R1 M1: T1:win vs BYE [Locked]',
        'B R1 M2: T4 vs T5 [Ready]',
        'B R1 M3: T2:win vs BYE [Locked]',
        'B R1 M4: T3 vs T6 [Ready]',
        'B R2 M1: T1 vs TBD [Waiting]',
        'B R2 M2: T2 vs TBD [Waiting]',
        'B R3 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('single elimination, 8 teams (no BYEs)', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 8);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'B R1 M1: T1 vs T8 [Ready]',
        'B R1 M2: T4 vs T5 [Ready]',
        'B R1 M3: T2 vs T7 [Ready]',
        'B R1 M4: T3 vs T6 [Ready]',
        'B R2 M1: TBD vs TBD [Locked]',
        'B R2 M2: TBD vs TBD [Locked]',
        'B R3 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('double elimination, 4 teams, simple grand final (single GF match)', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 4, 'simple');
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'WB R1 M1: T1 vs T4 [Ready]',
        'WB R1 M2: T2 vs T3 [Ready]',
        'WB R2 M1: TBD vs TBD [Locked]',
        'LB R1 M1: TBD vs TBD [Locked]',
        'LB R2 M1: TBD vs TBD [Locked]',
        'GF R1 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('double elimination, 6 teams, double grand final: LB R1 has strict-null BYE slots awaiting WB losers', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 6, 'double');
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
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
    });

    it('double elimination, 8 teams, double grand final', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 8, 'double');
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'WB R1 M1: T1 vs T8 [Ready]',
        'WB R1 M2: T4 vs T5 [Ready]',
        'WB R1 M3: T2 vs T7 [Ready]',
        'WB R1 M4: T3 vs T6 [Ready]',
        'WB R2 M1: TBD vs TBD [Locked]',
        'WB R2 M2: TBD vs TBD [Locked]',
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
    });
  });

  describe('full playthroughs — update.match alone performs every propagation', () => {
    it('single elimination, 5 teams: bye matches archive as rounds resolve; final stays Completed', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 5);
      await playAllReadyMatches(ctx, stage.id as number);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'B R1 M1: T1:win vs BYE [Archived]',
        'B R1 M2: T4:win(2) vs T5:loss(0) [Archived]',
        'B R1 M3: T2:win vs BYE [Archived]',
        'B R1 M4: T3:win vs BYE [Archived]',
        'B R2 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'B R2 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'B R3 M1: T1:win(2) vs T2:loss(0) [Completed]',
      ]);
    });

    it('double elimination, 4 teams, simple grand final: LB fed automatically, one GF match, champion decided', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 4, 'simple');
      await playAllReadyMatches(ctx, stage.id as number);
      expect(await snapshotGrid(ctx, stage.id as number)).toEqual([
        'WB R1 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R1 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: T4:win(2) vs T3:loss(0) [Archived]',
        'LB R2 M1: T2:win(2) vs T4:loss(0) [Archived]',
        'GF R1 M1: T1:win(2) vs T2:loss(0) [Completed]',
      ]);
    });

    it('double elimination, 6 teams with BYEs: the LB bye cascade auto-resolves during play', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 6, 'double');
      const stageId = stage.id as number;

      // Play ONLY the two real WB R1 matches, then inspect the LB bye matches:
      // the library must have dropped the WB losers into LB R1 and resolved the
      // byes without any update call targeting those matches.
      const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
        []) as Match[];
      const readyR1 = matches
        .filter((m) => m.status === 2)
        .sort((a, b) => (a.id as number) - (b.id as number));
      expect(readyR1).toHaveLength(2);
      for (const m of readyR1) {
        await ctx.manager.update.match({
          id: m.id,
          opponent1: { score: 2, result: 'win' },
          opponent2: { score: 0, result: 'loss' },
        });
      }

      // The WB losers were dropped into the LB bye matches, those matches were
      // auto-completed (status 4 — they archive later, when downstream rounds
      // consume them), and the survivors advanced into LB R2. All without any
      // update call targeting an LB match.
      expect(await snapshotGrid(ctx, stageId)).toEqual([
        'WB R1 M1: T1:win vs BYE [Locked]',
        'WB R1 M2: T4:win(2) vs T5:loss(0) [Completed]',
        'WB R1 M3: T2:win vs BYE [Locked]',
        'WB R1 M4: T3:win(2) vs T6:loss(0) [Completed]',
        'WB R2 M1: T1 vs T4 [Ready]',
        'WB R2 M2: T2 vs T3 [Ready]',
        'WB R3 M1: TBD vs TBD [Locked]',
        'LB R1 M1: BYE vs T5:win [Completed]',
        'LB R1 M2: BYE vs T6:win [Completed]',
        'LB R2 M1: TBD vs T5 [Waiting]',
        'LB R2 M2: TBD vs T6 [Waiting]',
        'LB R3 M1: TBD vs TBD [Locked]',
        'LB R4 M1: TBD vs TBD [Locked]',
        'GF R1 M1: TBD vs TBD [Locked]',
        'GF R2 M1: TBD vs TBD [Locked]',
      ]);
    });

    it('double elimination, 4 teams, double grand final: LB champ wins GF1 → reset match played to the end', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 4, 'double');
      const stageId = stage.id as number;
      const gfGroup = await gfGroupId(ctx, stageId);
      // opponent2 (the LB champ side in GF) wins GF matches; opponent1 wins elsewhere
      await playAllReadyMatches(ctx, stageId, (match) => match.group_id !== gfGroup);
      expect(await snapshotGrid(ctx, stageId)).toEqual([
        'WB R1 M1: T1:win(2) vs T4:loss(0) [Archived]',
        'WB R1 M2: T2:win(2) vs T3:loss(0) [Archived]',
        'WB R2 M1: T1:win(2) vs T2:loss(0) [Archived]',
        'LB R1 M1: T4:win(2) vs T3:loss(0) [Archived]',
        'LB R2 M1: T2:win(2) vs T4:loss(0) [Archived]',
        'GF R1 M1: T1:loss(0) vs T2:win(2) [Archived]',
        'GF R2 M1: T1:loss(0) vs T2:win(2) [Completed]',
      ]);
    });
  });

  describe('double grand final decisive semantics', () => {
    it('leaves the reset match (GF2) populated and Ready even when the WB champion decisively won GF1', async () => {
      // Load-bearing fact for completion logic: the library does NOT archive
      // the unneeded reset match. Its own standings ignore GF2 when GF1's
      // winner is opponent1 (helpers.getGrandFinalDecisiveMatch). A strict
      // "every match finished" completion rule would deadlock here.
      const ctx = createContext();
      const stage = await createStage(ctx, 'double_elimination', 4, 'double');
      const stageId = stage.id as number;
      const gfGroup = await gfGroupId(ctx, stageId);

      // Play everything except GF2; WB champ (opponent1) wins GF1.
      for (let i = 0; i < 16; i++) {
        const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
          []) as Match[];
        const gfMatches = matches
          .filter((m) => m.group_id === gfGroup)
          .sort((a, b) => (a.number as number) - (b.number as number));
        const ready = matches
          .filter((m) => m.status === 2 && m.id !== gfMatches[1]?.id)
          .sort((a, b) => (a.id as number) - (b.id as number))[0];
        if (!ready) break;
        await ctx.manager.update.match({
          id: ready.id,
          opponent1: { score: 2, result: 'win' },
          opponent2: { score: 0, result: 'loss' },
        });
      }

      const grid = await snapshotGrid(ctx, stageId);
      expect(grid).toContain('GF R1 M1: T1:win(2) vs T2:loss(0) [Completed]');
      expect(grid).toContain('GF R2 M1: T1 vs T2 [Ready]');

      // The library's final standings nevertheless crown T1 from GF1 alone.
      const standings = await ctx.manager.get.finalStandings(stageId);
      expect(standings[0]).toMatchObject({ name: 'T1' });
    });
  });

  describe('illegal updates throw — nothing is silently tolerated', () => {
    it('throws "The match is locked." for Locked, Waiting, BYE, and Archived matches; "Match not found." for unknown ids', async () => {
      const ctx = createContext();
      const stage = await createStage(ctx, 'single_elimination', 5);
      const stageId = stage.id as number;
      const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
        []) as Match[];

      const requireMatch = (match: Match | undefined, label: string): Match => {
        if (!match) throw new Error(`SE-5 fixture is missing a ${label} match`);
        return match;
      };
      const locked = requireMatch(
        matches.find((m) => m.status === 0),
        'Locked'
      );
      const waiting = requireMatch(
        matches.find((m) => m.status === 1),
        'Waiting'
      );
      const bye = requireMatch(
        matches.find((m) => m.opponent1 === null || m.opponent2 === null),
        'BYE'
      );
      const payload = {
        opponent1: { score: 2, result: 'win' as const },
        opponent2: { score: 0, result: 'loss' as const },
      };

      await expect(ctx.manager.update.match({ id: locked.id, ...payload })).rejects.toThrow(
        'The match is locked.'
      );
      await expect(ctx.manager.update.match({ id: waiting.id, ...payload })).rejects.toThrow(
        'The match is locked.'
      );
      await expect(ctx.manager.update.match({ id: bye.id, ...payload })).rejects.toThrow(
        'The match is locked.'
      );
      await expect(ctx.manager.update.match({ id: 999, ...payload })).rejects.toThrow(
        'Match not found.'
      );

      // Archived: finish the bracket, then try to edit an early match.
      await playAllReadyMatches(ctx, stageId);
      const finished = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
        []) as Match[];
      const archived = requireMatch(
        finished.find((m) => m.status === 5),
        'Archived'
      );
      await expect(ctx.manager.update.match({ id: archived.id, ...payload })).rejects.toThrow(
        'The match is locked.'
      );
    });
  });
});
