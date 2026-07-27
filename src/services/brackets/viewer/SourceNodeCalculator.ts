import { bracketLog, debugLog, errorLog, warnLog } from '@/utils/logger';

import { BracketGroupRow, BracketRoundRow, ViewerMatch } from './types';

/**
 * Normalize opponent to viewer format (per Toornament API specification)
 * Always creates an object even when participant ID is null (for TBD slots)
 * This allows calculateSourceNodeIds() to populate source_node_id for connectors
 *
 * @see https://developer.toornament.com/v2/doc/viewer_bracket_nodes
 */
export function toViewerOpponent(
  id: number | null | undefined,
  score?: number | null,
  result?: string | null,
  position?: number
): NonNullable<ViewerMatch['opponent1']> {
  return {
    id: id ?? null,
    score: score ?? undefined,
    result: result as 'win' | 'loss' | 'bye' | undefined,
    position,
    // These will be populated by calculateSourceNodeIds() for connector drawing
    source_node_id: undefined as string | undefined,
    source_type: undefined as ('winner' | 'loser') | undefined,
  };
}

/**
 * Ensure opponent object exists for in-place mutation
 */
function ensureOpponentObject(match: ViewerMatch, key: 'opponent1' | 'opponent2') {
  if (!match[key]) {
    match[key] = { id: null };
  }
  return match[key];
}

/**
 * brackets-manager's own feeder markers for a match's slots: the `position`
 * value it stores on a loser-bracket drop-in slot is the NUMBER of the
 * winners-bracket match (within its round) whose loser fills that slot,
 * already accounting for the stage's loser seed orderings (reverse,
 * reverse_half_shift, ...). Persisted as match.opponentN_position in SQL.
 */
export interface SlotPositionMarkers {
  opponent1?: number | null;
  opponent2?: number | null;
}

/**
 * Calculate source_node_id for each opponent in matches
 * This determines which previous match each opponent came from
 * Handles Winners→Winners, Losers→Losers, and Winners→Losers drop-ins
 *
 * Loser-bracket structure (matches brackets-manager's double_elimination):
 * round 1 pairs off WB round-1 losers; even rounds are minor rounds where one
 * slot is a WB drop-in (named by its position marker) and the other continues
 * the same-numbered LB match; odd rounds >= 3 pair the previous round's
 * winners. Do NOT pass seed positions as markers — only brackets-manager's
 * own opponent position markers (the legacy transform stores seeds there,
 * which is why markers are an explicit parameter and never read off opponents).
 */
export function calculateSourceNodeIds(
  matches: ViewerMatch[],
  groups: BracketGroupRow[],
  rounds: BracketRoundRow[],
  slotPositions?: Map<string, SlotPositionMarkers>
): ViewerMatch[] {
  // AUDIT LOG: Track object references at start
  debugLog('AUDIT: calculateSourceNodeIds START', {
    matchCount: matches.length,
    sampleMatch: matches[0],
    opponent1Ref: matches[0]?.opponent1,
  });

  // Normalize all match IDs to strings for consistent comparisons
  for (const m of matches) {
    if (typeof m.id !== 'string') (m as unknown as { id: string }).id = String(m.id);
  }

  // Build comprehensive indexes for O(1) lookups
  const roundsById = new Map(rounds.map((r) => [r.id, r]));
  const groupsById = new Map(groups.map((g) => [g.id, g]));

  // Index matches by group+round for fast lookup: "groupId:roundNumber" -> matches[]
  const matchesByGroupRound = new Map<string, ViewerMatch[]>();
  for (const m of matches) {
    const r = roundsById.get(m.round_id);
    if (!r) continue;
    const key = `${r.group_id}:${r.number}`;
    let matchesForRound = matchesByGroupRound.get(key);
    if (!matchesForRound) {
      matchesForRound = [];
      matchesByGroupRound.set(key, matchesForRound);
    }
    matchesForRound.push(m);
  }

  // Sort matches within each group+round by number (1-based indexing)
  for (const arr of matchesByGroupRound.values()) {
    arr.sort((a, b) => a.number - b.number);
  }

  // Helper: Add Winners→Winners progression sources
  const addWinnersProgressionSources = (match: ViewerMatch) => {
    const currentRound = roundsById.get(match.round_id);
    if (!currentRound || currentRound.number === 1) return; // First round has no sources

    const keyPrev = `${currentRound.group_id}:${currentRound.number - 1}`;
    const prevMatches = matchesByGroupRound.get(keyPrev);
    if (!prevMatches) return;

    // Binary tree pairing: match N gets winners from matches (2N-1) and (2N)
    const prevMatch1 = prevMatches[(match.number - 1) * 2];
    const prevMatch2 = prevMatches[(match.number - 1) * 2 + 1];

    if (prevMatch1) {
      const o1 = ensureOpponentObject(match, 'opponent1');
      o1.source_node_id = String(prevMatch1.id);
      o1.source_type = 'winner';
    }

    if (prevMatch2) {
      const o2 = ensureOpponentObject(match, 'opponent2');
      o2.source_node_id = String(prevMatch2.id);
      o2.source_type = 'winner';
    }
  };

  // Helper: Add all Losers-bracket sources (LB→LB progression + WB drop-ins)
  const addLoserBracketSources = (match: ViewerMatch) => {
    const lbRound = roundsById.get(match.round_id);
    if (!lbRound) return;

    const lbGroup = groupsById.get(lbRound.group_id);
    if (!lbGroup || lbGroup.number !== 2) return; // Only losers bracket (group 2)

    const wbGroup = [...groupsById.values()].find((g) => g.number === 1);
    const markers = slotPositions?.get(String(match.id));

    const setSource = (
      side: 'opponent1' | 'opponent2',
      source: ViewerMatch | undefined,
      type: 'winner' | 'loser'
    ) => {
      if (!source) return;
      const opponent = ensureOpponentObject(match, side);
      opponent.source_node_id = String(source.id);
      opponent.source_type = type;
    };

    const findWbMatch = (wbRoundNumber: number, matchNumber: number | null | undefined) =>
      wbGroup && matchNumber != null
        ? matchesByGroupRound
            .get(`${wbGroup.id}:${wbRoundNumber}`)
            ?.find((m) => m.number === matchNumber)
        : undefined;

    // LB Round 1: both slots receive WB Round 1 losers. The position marker
    // names the exact WB match number; fall back to binary pairing.
    if (lbRound.number === 1) {
      setSource('opponent1', findWbMatch(1, markers?.opponent1 ?? match.number * 2 - 1), 'loser');
      setSource('opponent2', findWbMatch(1, markers?.opponent2 ?? match.number * 2), 'loser');
      return;
    }

    const prevMatches = matchesByGroupRound.get(`${lbGroup.id}:${lbRound.number - 1}`);

    // Even (minor) LB rounds: one slot is a WB drop-in — the slot carrying the
    // position marker — and the other continues the same-numbered LB match.
    // LB round 2 receives WB round 2 losers, LB round 4 WB round 3, etc.
    if (lbRound.number % 2 === 0) {
      const dropSide =
        markers?.opponent2 != null && markers?.opponent1 == null ? 'opponent2' : 'opponent1';
      const carrySide = dropSide === 'opponent1' ? 'opponent2' : 'opponent1';
      const wbRoundNumber = lbRound.number / 2 + 1;

      setSource(dropSide, findWbMatch(wbRoundNumber, markers?.[dropSide] ?? match.number), 'loser');
      setSource(
        carrySide,
        prevMatches?.find((m) => m.number === match.number),
        'winner'
      );
      return;
    }

    // Odd LB rounds >= 3: internal halving round — binary pairing of the
    // previous round's winners, no WB drop-ins.
    setSource('opponent1', prevMatches?.[(match.number - 1) * 2], 'winner');
    setSource('opponent2', prevMatches?.[(match.number - 1) * 2 + 1], 'winner');
  };

  // Helper: Add Grand Final sources (WB Final winner + LB Final winner)
  const addGrandFinalSources = (match: ViewerMatch) => {
    const currentRound = roundsById.get(match.round_id);
    if (!currentRound) return;

    const currentGroup = groupsById.get(currentRound.group_id);
    if (!currentGroup || currentGroup.number !== 3) return; // Only finals group

    // Find last round of Winners Bracket (group 1)
    const wbRounds = rounds
      .filter((r) => {
        const g = groupsById.get(r.group_id);
        return g && g.number === 1;
      })
      .sort((a, b) => b.number - a.number);
    const wbFinalRound = wbRounds[0];

    // Find last round of Losers Bracket (group 2)
    const lbRounds = rounds
      .filter((r) => {
        const g = groupsById.get(r.group_id);
        return g && g.number === 2;
      })
      .sort((a, b) => b.number - a.number);
    const lbFinalRound = lbRounds[0];

    // WB Final winner → Grand Final opponent1
    if (wbFinalRound) {
      const keyWBFinal = `${wbFinalRound.group_id}:${wbFinalRound.number}`;
      const wbFinalMatches = matchesByGroupRound.get(keyWBFinal);
      const wbFinalMatch = wbFinalMatches?.[0];

      if (wbFinalMatch) {
        const o1 = ensureOpponentObject(match, 'opponent1');
        o1.source_node_id = String(wbFinalMatch.id);
        o1.source_type = 'winner';
      }
    }

    // LB Final winner → Grand Final opponent2
    if (lbFinalRound) {
      const keyLBFinal = `${lbFinalRound.group_id}:${lbFinalRound.number}`;
      const lbFinalMatches = matchesByGroupRound.get(keyLBFinal);
      const lbFinalMatch = lbFinalMatches?.[0];

      if (lbFinalMatch) {
        const o2 = ensureOpponentObject(match, 'opponent2');
        o2.source_node_id = String(lbFinalMatch.id);
        o2.source_type = 'winner';
      }
    }
  };

  // Process all matches and apply sources in correct order
  for (const match of matches) {
    const round = roundsById.get(match.round_id);
    if (!round) continue;

    const group = groupsById.get(round.group_id);
    if (!group) continue;

    if (group.number === 1) {
      // Winners bracket: simple progression
      addWinnersProgressionSources(match);
    } else if (group.number === 2) {
      // Losers bracket: LB→LB progression + WB→LB drop-ins
      addLoserBracketSources(match);
    } else if (group.number === 3) {
      // Grand Final: WB Final winner + LB Final winner
      addGrandFinalSources(match);
    }
  }

  // Apply Symbol identity tags to track object references downstream
  const TAG = Symbol('opponent_identity_tag');
  for (const m of matches) {
    if (m.opponent1) (m.opponent1 as Record<symbol, unknown>)[TAG] = `o1:${m.id}`;
    if (m.opponent2) (m.opponent2 as Record<symbol, unknown>)[TAG] = `o2:${m.id}`;
  }
  bracketLog('IDENTITY TAGS APPLIED to', matches.length, 'matches');

  // Detect dangling source_node_id references
  const ids = new Set(matches.map((m) => m.id));
  let dangling = 0;
  for (const m of matches) {
    const s1 = m.opponent1?.source_node_id;
    const s2 = m.opponent2?.source_node_id;
    if (s1 && !ids.has(String(s1) as unknown as number)) {
      warnLog('Dangling source_node_id (o1)', m.id, '→', s1);
      dangling++;
    }
    if (s2 && !ids.has(String(s2) as unknown as number)) {
      warnLog('Dangling source_node_id (o2)', m.id, '→', s2);
      dangling++;
    }
  }

  // Final connector stats
  const sourcedSlots = matches.reduce(
    (n, m) => n + (m.opponent1?.source_node_id ? 1 : 0) + (m.opponent2?.source_node_id ? 1 : 0),
    0
  );
  bracketLog('Connector Stats (final pre-render):', {
    matches: matches.length,
    sourcedSlots,
    percentage:
      matches.length * 2 > 0 ? Math.round((sourcedSlots / (matches.length * 2)) * 100) + '%' : '0%',
  });

  if (dangling > 0) {
    errorLog(`Found ${dangling} dangling source_node_id(s) - connectors will fail!`);
  }

  return matches;
}
