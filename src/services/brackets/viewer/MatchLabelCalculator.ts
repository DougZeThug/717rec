import { BYE_RESULT_SENTINEL } from '@/services/brackets/manager/SupabaseSqlStorage/matchTransforms';

import { BracketGroupRow, BracketRoundRow, ViewerMatch } from './types';

/**
 * Human-visible match labels and slot flow hints for the rendered bracket.
 *
 * brackets-viewer prints a label on every match card ("WB 1.2", "WB Semi 1",
 * "LB Final") via its internal getMatchLabel(). These helpers rebuild that
 * exact naming from the viewer dataset so post-render decorations can refer to
 * matches by the labels the user actually sees on screen.
 */

export interface SlotHintEntry {
  opponent1?: string;
  opponent2?: string;
}

export type SlotHintMap = Map<string, SlotHintEntry>;

/**
 * Matches in these statuses have already sent their winner/loser onward — a
 * slot still empty at that point (e.g. after a double forfeit) can never
 * fill, so a flow hint pointing at it would never resolve. Note this does NOT
 * cover BYE feeders: brackets-manager leaves bye matches 'locked', which is
 * why BYE slots are additionally skipped via their result sentinel below.
 */
const TERMINAL_STATUSES = new Set<ViewerMatch['status']>(['completed', 'archived']);

/**
 * Build a map of match id (string) -> the label brackets-viewer prints on that
 * match card. Mirrors the library's getMatchLabel() naming: the last round of
 * a bracket is "Final", the round before it "Semi {match}", everything else
 * "{prefix} {round}.{match}" with prefix WB/LB (double elim) or M (single).
 */
export function buildMatchLabelMap(
  matches: ViewerMatch[],
  groups: BracketGroupRow[],
  rounds: BracketRoundRow[],
  stageType?: string
): Map<string, string> {
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  // The upstream round query is not stage-filtered — drop rows whose group
  // belongs to a different bracket before computing round counts.
  const knownRounds = rounds.filter((r) => groupsById.has(r.group_id));
  const roundsById = new Map(knownRounds.map((r) => [r.id, r]));

  const roundCountByGroup = new Map<number, number>();
  for (const round of knownRounds) {
    const count = roundCountByGroup.get(round.group_id) ?? 0;
    roundCountByGroup.set(round.group_id, Math.max(count, round.number));
  }

  const isSingleElim = stageType === 'single_elimination' || !groups.some((g) => g.number === 2);

  const labels = new Map<string, string>();
  for (const match of matches) {
    const round = roundsById.get(match.round_id);
    const group = round ? groupsById.get(round.group_id) : undefined;
    if (!round || !group) continue;

    labels.set(
      String(match.id),
      getMatchLabel(match, round, group, roundCountByGroup, isSingleElim)
    );
  }
  return labels;
}

function getMatchLabel(
  match: ViewerMatch,
  round: BracketRoundRow,
  group: BracketGroupRow,
  roundCountByGroup: Map<number, number>,
  isSingleElim: boolean
): string {
  const roundCount = roundCountByGroup.get(group.id) ?? round.number;

  if (isSingleElim) {
    if (group.number === 2) return 'Consolation Final';
    if (round.number === roundCount) return 'Final';
    if (round.number === roundCount - 1) return `Semi ${match.number}`;
    return `M ${round.number}.${match.number}`;
  }

  if (group.number === 3) {
    return roundCount === 1 ? 'Grand Final' : `GF Round ${round.number}`;
  }

  const prefix = group.number === 2 ? 'LB' : 'WB';
  if (round.number === roundCount) return `${prefix} Final`;
  if (round.number === roundCount - 1) return `${prefix} Semi ${match.number}`;
  return `${prefix} ${round.number}.${match.number}`;
}

/**
 * Build a map of match id (string) -> per-slot flow hint text ("Winner of
 * WB 1.1", "Loser of WB Semi 1") for slots that are still TBD, driven by the
 * source_node_id/source_type fields calculateSourceNodeIds() attaches for
 * connector drawing.
 */
export function buildSlotHints(
  matches: ViewerMatch[],
  groups: BracketGroupRow[],
  rounds: BracketRoundRow[],
  stageType?: string
): SlotHintMap {
  const labels = buildMatchLabelMap(matches, groups, rounds, stageType);
  const matchesById = new Map(matches.map((m) => [String(m.id), m]));
  const groupsById = new Map(groups.map((g) => [g.id, g]));
  const roundsById = new Map(rounds.map((r) => [r.id, r]));
  const hasLoserBracket = groups.some((g) => g.number === 2);

  const hints: SlotHintMap = new Map();
  for (const match of matches) {
    const round = roundsById.get(match.round_id);
    const group = round ? groupsById.get(round.group_id) : undefined;
    if (!round || !group) continue;

    // Grand Final reset: SourceNodeCalculator points its slots at the WB/LB
    // finals so connectors draw, but both teams actually come from Grand
    // Final round 1 — a "Winner of WB Final" hint there would be wrong.
    if (hasLoserBracket && group.number === 3 && round.number > 1) continue;

    const entry: SlotHintEntry = {};
    for (const side of ['opponent1', 'opponent2'] as const) {
      const opponent = match[side];
      if (!opponent || opponent.id !== null || !opponent.source_node_id) continue;

      // A BYE slot (SQL sentinel) never receives a team — its bye feeder
      // match stays 'locked', so the terminal-source guard can't catch it.
      // Pre-marked walkover slots ({id: null, result: 'win'}) DO fill and
      // keep their hint.
      if (opponent.result === BYE_RESULT_SENTINEL) continue;

      const source = matchesById.get(String(opponent.source_node_id));
      const label = source ? labels.get(String(source.id)) : undefined;
      if (!source || !label) continue;
      if (TERMINAL_STATUSES.has(source.status)) continue;

      entry[side] = `${opponent.source_type === 'loser' ? 'Loser' : 'Winner'} of ${label}`;
    }
    if (entry.opponent1 || entry.opponent2) hints.set(String(match.id), entry);
  }
  return hints;
}
