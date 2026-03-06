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
    result: result as 'win' | 'loss' | undefined,
    position,
    // These will be populated by calculateSourceNodeIds() for connector drawing
    source_node_id: undefined as string | undefined,
    source_type: undefined as ('winner' | 'loser') | undefined,
  };
}

/**
 * Ensure opponent object exists for in-place mutation
 */
export function ensureOpponentObject(match: ViewerMatch, key: 'opponent1' | 'opponent2') {
  if (!match[key]) {
    match[key] = { id: null };
  }
  return match[key];
}

/**
 * Calculate source_node_id for each opponent in matches
 * This determines which previous match each opponent came from
 * Handles Winners→Winners, Losers→Losers, and Winners→Losers drop-ins
 */
export function calculateSourceNodeIds(
  matches: ViewerMatch[],
  groups: BracketGroupRow[],
  rounds: BracketRoundRow[]
): ViewerMatch[] {
  // AUDIT LOG: Track object references at start
  debugLog('AUDIT: calculateSourceNodeIds START', {
    matchCount: matches.length,
    sampleMatch: matches[0],
    opponent1Ref: matches[0]?.opponent1,
  });

  // Normalize all match IDs to strings for consistent comparisons
  for (const m of matches) {
    if (typeof m.id !== 'string') (m as any).id = String(m.id);
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
    if (!matchesByGroupRound.has(key)) matchesByGroupRound.set(key, []);
    matchesByGroupRound.get(key)!.push(m);
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

  // Helper: Add Losers→Losers progression sources
  const addLosersProgressionSources = (match: ViewerMatch) => {
    const currentRound = roundsById.get(match.round_id);
    if (!currentRound || currentRound.number === 1) return; // First LB round gets drop-ins only

    const keyPrev = `${currentRound.group_id}:${currentRound.number - 1}`;
    const prevMatches = matchesByGroupRound.get(keyPrev);
    if (!prevMatches) return;

    // Same binary pairing within losers bracket
    const prevMatch1 = prevMatches[(match.number - 1) * 2];
    const prevMatch2 = prevMatches[(match.number - 1) * 2 + 1];

    // Only set if not already sourced (to avoid overwriting drop-ins)
    if (prevMatch1) {
      const o1 = ensureOpponentObject(match, 'opponent1');
      if (!o1.source_node_id) {
        o1.source_node_id = String(prevMatch1.id);
        o1.source_type = 'winner';
      }
    }

    if (prevMatch2) {
      const o2 = ensureOpponentObject(match, 'opponent2');
      if (!o2.source_node_id) {
        o2.source_node_id = String(prevMatch2.id);
        o2.source_type = 'winner';
      }
    }
  };

  // Helper: Add Winners→Losers drop-in connectors
  const addWinnersToLosersDropIns = (match: ViewerMatch) => {
    const lbRound = roundsById.get(match.round_id);
    if (!lbRound) return;

    const lbGroup = groupsById.get(lbRound.group_id);
    if (!lbGroup || lbGroup.number !== 2) return; // Only losers bracket (group 2)

    // Find winners bracket group (group.number === 1)
    const wbGroup = [...groupsById.values()].find((g) => g.number === 1);
    if (!wbGroup) return;

    // FIX 1: LB Round 1 gets TWO sources from WB Round 1 (binary tree pairing)
    if (lbRound.number === 1) {
      const keyWB = `${wbGroup.id}:1`;
      const wbMatches = matchesByGroupRound.get(keyWB);
      if (!wbMatches) return;

      // LB R1 Match N gets losers from WB R1 matches (2N-1) and (2N)
      const wbMatch1 = wbMatches[(match.number - 1) * 2];
      const wbMatch2 = wbMatches[(match.number - 1) * 2 + 1];

      if (wbMatch1) {
        const o1 = ensureOpponentObject(match, 'opponent1');
        o1.source_node_id = String(wbMatch1.id);
        o1.source_type = 'loser';
      }

      if (wbMatch2) {
        const o2 = ensureOpponentObject(match, 'opponent2');
        o2.source_node_id = String(wbMatch2.id);
        o2.source_type = 'loser';
      }
      return;
    }

    // FIX 2: Later LB rounds get drop-ins on ODD rounds only (3, 5, 7...)
    // Standard DE layout: LB R3 = WB R2 losers, LB R5 = WB R3 losers, etc.
    const hasDropIns = lbRound.number % 2 === 1;
    if (!hasDropIns) return;

    // Map LB odd round to corresponding WB round
    const wbRoundNumber = Math.ceil(lbRound.number / 2);
    const keyWB = `${wbGroup.id}:${wbRoundNumber}`;
    const wbMatches = matchesByGroupRound.get(keyWB);
    if (!wbMatches) return;

    // Each WB loser drops into corresponding LB match by match number
    const wbMatch = wbMatches[match.number - 1];
    if (!wbMatch) return;

    // Fill the slot that doesn't already have a source (from LB progression)
    const o1 = ensureOpponentObject(match, 'opponent1');
    const o2 = ensureOpponentObject(match, 'opponent2');
    const targetSlot = o1.source_node_id ? 'opponent2' : 'opponent1';
    const targetOpp = targetSlot === 'opponent1' ? o1 : o2;

    targetOpp.source_node_id = String(wbMatch.id);
    targetOpp.source_type = 'loser';
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
      // Losers bracket: apply LB→LB first, then WB→LB drop-ins
      addLosersProgressionSources(match);
      addWinnersToLosersDropIns(match);
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
    if (s1 && !ids.has(String(s1) as any)) {
      warnLog('Dangling source_node_id (o1)', m.id, '→', s1);
      dangling++;
    }
    if (s2 && !ids.has(String(s2) as any)) {
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
      matches.length * 2 > 0
        ? Math.round((sourcedSlots / (matches.length * 2)) * 100) + '%'
        : '0%',
  });

  if (dangling > 0) {
    errorLog(`Found ${dangling} dangling source_node_id(s) - connectors will fail!`);
  }

  return matches;
}
