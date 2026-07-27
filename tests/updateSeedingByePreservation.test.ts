/**
 * Regression suite — BYE preservation across `update.seeding()`.
 *
 * Companion to `bracketManagerLibraryNative.test.ts`. That suite pins how BYEs
 * behave at CREATION ("BYE matches are auto-resolved AT CREATION ... No
 * update-time BYE handling is ever needed for new brackets"). This suite pins
 * the part that sentence does not cover: what happens to those same BYEs when
 * an existing bracket is RE-SEEDED.
 *
 * The library's contract is two-step, and it is asymmetric with creation:
 *   - `update.seeding()` treats `null` entries as TBD placeholders. Internally
 *     it runs the stage creator with `setExisting(stageId, false)`, and the
 *     creator maps `null` slots to `{ id: null }` (see brackets-manager
 *     `base/stage/creator.js`: `if (this.updateMode && !this.enableByesInUpdate)`).
 *   - `update.confirmSeeding()` re-runs the creator with
 *     `setExisting(stageId, true)` after `convertTBDtoBYE`, restoring strict
 *     `null` BYE slots and propagating their winners.
 *
 * Skipping the second call leaves BYE matches shaped like `{ id: null }`, which
 * every downstream strict-null BYE check in the app reads as "a real opponent
 * we're still waiting on" — the match becomes unscorable and the bracket cannot
 * be completed. `BracketSeedingService.updateSeeding` must therefore always
 * confirm after seeding; the app-level guarantee is asserted in
 * `src/services/brackets/manager/services/__tests__/BracketSeedingService.test.ts`.
 */
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import type { Match, Participant, ParticipantResult } from 'brackets-model';
import { describe, expect, it } from 'vitest';

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

/** Mirrors BracketSeedingService sizing: next power of two, nulls for BYEs. */
function seedingWithByes(names: string[]): (string | null)[] {
  let bracketSize = 2;
  while (bracketSize < names.length) bracketSize *= 2;
  return [...names, ...Array<null>(bracketSize - names.length).fill(null)];
}

/**
 * Renders first-round matches as compact strings, one per match:
 *   "M1: T1:win vs BYE [Locked]"
 * Opponents: null → BYE, { id: null } → TBD, else name[:result].
 *
 * The BYE/TBD distinction is the whole point of this suite: `BYE` is a strict
 * `null` slot, `TBD` is the `{ id: null }` shape the app misreads as a team.
 */
async function firstRoundSnapshot(ctx: TestContext, stageId: number): Promise<string[]> {
  const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
    []) as Match[];
  const participants = ((await ctx.storage.select<Participant>('participant')) ??
    []) as Participant[];

  const renderOpponent = (opponent: ParticipantResult | null): string => {
    if (opponent === null) return 'BYE';
    if (opponent.id === null || opponent.id === undefined) return 'TBD';
    let rendered = participants.find((p) => p.id === opponent.id)?.name ?? `#${opponent.id}`;
    if (opponent.result) rendered += `:${opponent.result}`;
    return rendered;
  };

  const firstRoundId = Math.min(...matches.map((m) => m.round_id as number));

  return matches
    .filter((m) => m.round_id === firstRoundId)
    .sort((a, b) => (a.number as number) - (b.number as number))
    .map((m) => `M${m.number}: ${renderOpponent(m.opponent1)} vs ${renderOpponent(m.opponent2)}`);
}

/** Counts first-round slots that are strict-null BYEs. */
async function byeSlotCount(ctx: TestContext, stageId: number): Promise<number> {
  const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
    []) as Match[];
  return matches.reduce(
    (total, m) => total + (m.opponent1 === null ? 1 : 0) + (m.opponent2 === null ? 1 : 0),
    0
  );
}

/**
 * Creates a 5-team single elimination stage (bracket size 8 → 3 BYEs), then
 * returns the stage id. Matches how BracketCreationService builds a stage.
 */
async function createFiveTeamStage(ctx: TestContext): Promise<number> {
  const stage = await ctx.manager.create.stage({
    name: 'seeding-regression',
    tournamentId: 0,
    type: 'single_elimination',
    seeding: seedingWithByes(teamNames(5)),
    settings: { seedOrdering: ['inner_outer'] as never, grandFinal: 'none' },
  });
  return stage.id as number;
}

/** Reseeds the same 5 teams in reverse order, padded to size with BYE nulls. */
function reversedSeeding(): (string | null)[] {
  return seedingWithByes([...teamNames(5)].reverse());
}

describe('brackets-manager update.seeding() BYE semantics (pinned 1.11.0)', () => {
  it('creation produces strict-null BYE slots with winners pre-advanced', async () => {
    const ctx = createContext();
    const stageId = await createFiveTeamStage(ctx);

    // Baseline: this is the shape the whole app is written against.
    expect(await firstRoundSnapshot(ctx, stageId)).toEqual([
      'M1: T1:win vs BYE',
      'M2: T4 vs T5',
      'M3: T2:win vs BYE',
      'M4: T3:win vs BYE',
    ]);
    expect(await byeSlotCount(ctx, stageId)).toBe(3);
  });

  it('update.seeding() alone DEGRADES BYE slots to { id: null } TBDs', async () => {
    const ctx = createContext();
    const stageId = await createFiveTeamStage(ctx);

    await ctx.manager.update.seeding(stageId, reversedSeeding(), true);

    // The regression: every BYE became a TBD. Nothing is a strict null any more.
    const snapshot = await firstRoundSnapshot(ctx, stageId);
    expect(snapshot).toContain('M1: T5 vs TBD');
    expect(snapshot.filter((row) => row.includes('TBD'))).toHaveLength(3);
    expect(snapshot.filter((row) => row.includes('BYE'))).toHaveLength(0);
    expect(await byeSlotCount(ctx, stageId)).toBe(0);

    // Pin the exact shape the app's strict-null checks trip over: `{ id: null }`
    // is truthy, so `!matchData.opponent2` is false and BYE handling is skipped.
    const matches = ((await ctx.storage.select<Match>('match', { stage_id: stageId })) ??
      []) as Match[];
    const degraded = matches.find((m) => m.number === 1 && m.opponent2 !== null);
    expect(degraded?.opponent2).toEqual({ id: null });
    expect(Boolean(degraded?.opponent2)).toBe(true);
  });

  it('confirmSeeding() after update.seeding() restores strict-null BYEs and re-advances winners', async () => {
    const ctx = createContext();
    const stageId = await createFiveTeamStage(ctx);

    await ctx.manager.update.seeding(stageId, reversedSeeding(), true);
    await ctx.manager.update.confirmSeeding(stageId);

    // Same structure as creation, reseeded: BYEs are strict nulls again and the
    // bye winners carry a 'win' result, so the bracket can progress.
    expect(await firstRoundSnapshot(ctx, stageId)).toEqual([
      'M1: T5:win vs BYE',
      'M2: T2 vs T1',
      'M3: T4:win vs BYE',
      'M4: T3:win vs BYE',
    ]);
    expect(await byeSlotCount(ctx, stageId)).toBe(3);
  });

  it('confirmSeeding() is idempotent — a second confirm leaves BYEs intact', async () => {
    const ctx = createContext();
    const stageId = await createFiveTeamStage(ctx);

    await ctx.manager.update.seeding(stageId, reversedSeeding(), true);
    await ctx.manager.update.confirmSeeding(stageId);
    const afterFirst = await firstRoundSnapshot(ctx, stageId);

    await ctx.manager.update.confirmSeeding(stageId);

    expect(await firstRoundSnapshot(ctx, stageId)).toEqual(afterFirst);
    expect(await byeSlotCount(ctx, stageId)).toBe(3);
  });

  it('a bracket with no BYEs is unaffected by the extra confirm', async () => {
    const ctx = createContext();
    const stage = await ctx.manager.create.stage({
      name: 'seeding-regression-full',
      tournamentId: 0,
      type: 'single_elimination',
      seeding: teamNames(8),
      settings: { seedOrdering: ['inner_outer'] as never, grandFinal: 'none' },
    });
    const stageId = stage.id as number;

    await ctx.manager.update.seeding(stageId, [...teamNames(8)].reverse(), true);
    const afterSeeding = await firstRoundSnapshot(ctx, stageId);
    await ctx.manager.update.confirmSeeding(stageId);

    // No BYEs to convert, so confirm is a no-op on the grid.
    expect(await firstRoundSnapshot(ctx, stageId)).toEqual(afterSeeding);
    expect(await byeSlotCount(ctx, stageId)).toBe(0);
  });
});
