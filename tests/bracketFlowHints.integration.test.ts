/**
 * Integration guard for bracket flow hints across every bracket size the app
 * can create (4-17 teams, i.e. bracket sizes 4/8/16/32 with 0-15 BYEs).
 *
 * Spans the REAL brackets-manager (pinned 1.11.0) + brackets-memory-db, the
 * SQL storage adapter's BYE sentinel round-trip, SourceNodeCalculator and
 * MatchLabelCalculator — hence an integration test rather than a unit test.
 *
 * The invariant: a flow hint printed on an empty slot must name a match that
 * can actually deliver the promised team. Two ways it can lie, both of which
 * only appear in BYE-heavy brackets:
 *   1. the hinted slot is a strict BYE — no participant will ever occupy it;
 *   2. "Loser of X" where X is a BYE match — X has no loser to give.
 *
 * BYE matches are auto-resolved at creation but keep status Locked (see
 * bracketManagerLibraryNative.test.ts), so a status-based guard cannot catch
 * either case — the BYE result sentinel is what distinguishes them.
 */
import { BracketsManager } from 'brackets-manager';
import { InMemoryDatabase } from 'brackets-memory-db';
import { describe, expect, it } from 'vitest';

import { BYE_RESULT_SENTINEL } from '@/services/brackets/manager/SupabaseSqlStorage/matchTransforms';
import { mapStatusToString } from '@/services/brackets/viewer/bracketViewerUtils';
import {
  buildMatchLabelMap,
  buildSlotHints,
} from '@/services/brackets/viewer/MatchLabelCalculator';
import {
  calculateSourceNodeIds,
  SlotPositionMarkers,
  toViewerOpponent,
} from '@/services/brackets/viewer/SourceNodeCalculator';
import type {
  BracketGroupRow,
  BracketRoundRow,
  ViewerMatch,
} from '@/services/brackets/viewer/types';

type RawSlot = { id: number | null; position?: number; result?: string } | null;

interface RawMatch {
  id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  number: number;
  child_count: number;
  status: number;
  opponent1: RawSlot;
  opponent2: RawSlot;
}

/** Mirrors BracketCreationService's size-dependent loser seed orderings. */
const LB_ORDERINGS: Record<number, string[]> = {
  4: ['natural', 'reverse'],
  8: ['natural', 'reverse', 'natural'],
  16: ['natural', 'reverse_half_shift', 'reverse', 'natural'],
};

const buildBracket = async (teamCount: number) => {
  const size = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const storage = new InMemoryDatabase();
  const manager = new BracketsManager(storage as never);

  await manager.create.stage({
    name: 'Playoffs',
    tournamentId: 0,
    type: 'double_elimination',
    seeding: [
      ...Array.from({ length: teamCount }, (_, i) => `T${i + 1}`),
      ...Array(size - teamCount).fill(null),
    ],
    settings: {
      seedOrdering: ['inner_outer', ...(LB_ORDERINGS[size] || LB_ORDERINGS[16])],
      grandFinal: 'double',
    },
  } as never);

  const db = (storage as unknown as { data: Record<string, unknown[]> }).data;
  return {
    groups: db.group as BracketGroupRow[],
    rounds: db.round as BracketRoundRow[],
    raw: db.match as RawMatch[],
  };
};

/**
 * Flatten + inflate a slot the way SupabaseSqlStorage does: a strict BYE
 * (`null`) is persisted as the sentinel in the result column, so it reaches
 * the viewer as `{ id: null, result: 'bye' }` rather than as `null`.
 */
const throughSqlRoundTrip = (slot: RawSlot) =>
  slot === null
    ? { id: null as number | null, result: BYE_RESULT_SENTINEL as string | undefined }
    : { id: slot.id, result: slot.result };

const toViewerData = (raw: RawMatch[], groups: BracketGroupRow[], rounds: BracketRoundRow[]) => {
  const matches = raw.map((m) => {
    const o1 = throughSqlRoundTrip(m.opponent1);
    const o2 = throughSqlRoundTrip(m.opponent2);
    return {
      id: m.id,
      stage_id: m.stage_id,
      group_id: m.group_id,
      round_id: m.round_id,
      number: m.number,
      child_count: m.child_count,
      opponent1: toViewerOpponent(o1.id, undefined, o1.result, undefined),
      opponent2: toViewerOpponent(o2.id, undefined, o2.result, undefined),
      status: mapStatusToString(m.status),
    };
  }) as ViewerMatch[];

  const slotPositions = new Map<string, SlotPositionMarkers>();
  raw.forEach((m) => {
    const p1 = m.opponent1?.position;
    const p2 = m.opponent2?.position;
    if (p1 != null || p2 != null) {
      slotPositions.set(String(m.id), { opponent1: p1, opponent2: p2 });
    }
  });

  return calculateSourceNodeIds(matches, groups, rounds, slotPositions);
};

/** Every hint that promises a team which can never arrive. */
const findImpossibleHints = (
  raw: RawMatch[],
  groups: BracketGroupRow[],
  rounds: BracketRoundRow[]
): string[] => {
  const withSources = toViewerData(raw, groups, rounds);
  const hints = buildSlotHints(withSources, groups, rounds, 'double_elimination');
  const labels = buildMatchLabelMap(withSources, groups, rounds, 'double_elimination');
  const rawById = new Map(raw.map((m) => [String(m.id), m]));
  const viewerById = new Map(withSources.map((m) => [String(m.id), m]));
  const byeMatchIds = new Set(
    raw.filter((m) => m.opponent1 === null || m.opponent2 === null).map((m) => String(m.id))
  );

  const problems: string[] = [];
  for (const [matchId, entry] of hints) {
    for (const side of ['opponent1', 'opponent2'] as const) {
      const hint = entry[side];
      if (!hint) continue;

      const label = labels.get(matchId) ?? matchId;
      if (rawById.get(matchId)?.[side] === null) {
        problems.push(`${label} ${side}: "${hint}" on a strict BYE slot`);
        continue;
      }

      const sourceId = viewerById.get(matchId)?.[side]?.source_node_id;
      if (hint.startsWith('Loser of') && sourceId && byeMatchIds.has(String(sourceId))) {
        problems.push(`${label} ${side}: "${hint}" but the source is a BYE match`);
      }
    }
  }
  return problems;
};

describe('bracket flow hints across bracket sizes', () => {
  const teamCounts = Array.from({ length: 14 }, (_, i) => i + 4); // 4..17

  it.each(teamCounts)('never promises an impossible team for %i teams', async (teamCount) => {
    const { groups, rounds, raw } = await buildBracket(teamCount);

    expect(findImpossibleHints(raw, groups, rounds)).toEqual([]);
  });

  it('still produces useful hints (guards against vacuous passing)', async () => {
    const { groups, rounds, raw } = await buildBracket(8);
    const withSources = toViewerData(raw, groups, rounds);
    const hints = buildSlotHints(withSources, groups, rounds, 'double_elimination');

    const texts = [...hints.values()].flatMap((e) => [e.opponent1, e.opponent2].filter(Boolean));
    expect(texts).toContain('Loser of WB 1.1');
    expect(texts).toContain('Winner of WB Final');
    expect(texts).toContain('Winner of LB Final');
  });

  it('keeps the hint on a walkover slot that a real loser still drops into', async () => {
    // 6 teams: every LB R1 match pairs a strict BYE with a pre-marked
    // walkover slot fed by a REAL winners-bracket match. The walkover slot
    // does receive that loser, so its hint must survive.
    const { groups, rounds, raw } = await buildBracket(6);
    const withSources = toViewerData(raw, groups, rounds);
    const hints = buildSlotHints(withSources, groups, rounds, 'double_elimination');
    const lbGroup = groups.find((g) => g.number === 2);
    const lbR1 = rounds.find((r) => r.group_id === lbGroup?.id && r.number === 1);
    const lbR1Matches = raw.filter((m) => m.round_id === lbR1?.id);

    const walkoverSlots = lbR1Matches.flatMap((m) =>
      (['opponent1', 'opponent2'] as const)
        .filter((side) => m[side] !== null && m[side]?.id === null && m[side]?.result === 'win')
        .map((side) => ({ matchId: String(m.id), side }))
    );

    expect(walkoverSlots.length).toBeGreaterThan(0);
    for (const { matchId, side } of walkoverSlots) {
      expect(hints.get(matchId)?.[side]).toMatch(/^Loser of WB /);
    }
  });
});
