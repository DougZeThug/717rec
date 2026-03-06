import { InMemoryDatabase } from 'brackets-memory-db';

import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, debugLog, errorLog, warnLog } from '@/utils/logger';
import {
  PlayoffBracket,
  PlayoffGame,
  PlayoffMatch,
  PlayoffTeam,
} from '@/utils/playoffs/playoffTypes';

import {
  BracketGroupRow,
  BracketRoundRow,
  ViewerData,
  ViewerDataWithMapping,
  ViewerMatch,
  ViewerMatchGame,
  ViewerParticipant,
  ViewerStage,
} from './types';

export class BracketsViewerAdapter {
  private static teamIdMap: Map<string, number> = new Map();

  /**
   * Transform from brackets-manager SQL tables
   */
  static async transformFromSql(bracketId: string): Promise<ViewerDataWithMapping> {
    bracketLog('transformFromSql: Fetching from SQL tables for bracket:', bracketId);

    // Reset team map
    this.teamIdMap.clear();

    // First get stage to find stage_id
    const { data: stages, error: stageError } = await supabase
      .from('stage')
      .select('id, name, type, tournament_id')
      .eq('tournament_id', bracketId);

    if (stageError) handleDatabaseError(stageError, 'Failed to fetch stage for bracket');
    if (!stages || stages.length === 0) {
      throw new NotFoundError('Stage', bracketId);
    }

    const stageId = stages[0].id;

    // Fetch all data from SQL tables including groups and rounds for connectors
    const [matchesResult, matchGamesResult, participantsResult, groupsResult, roundsResult] =
      await Promise.all([
        supabase
          .from('match')
          .select(
            'id, stage_id, group_id, round_id, number, child_count, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result, status'
          )
          .eq('stage_id', stageId),
        supabase
          .from('match_game')
          .select('id, number, match_id, status, opponent1_score, opponent2_score'),
        supabase
          .from('participant')
          .select('id, name, tournament_id, position')
          .eq('tournament_id', bracketId),
        supabase.from('group').select('id, number, stage_id').eq('stage_id', stageId),
        supabase.from('round').select('id, group_id, number'),
      ]);

    if (matchesResult.error) handleDatabaseError(matchesResult.error, 'Failed to fetch bracket matches');
    if (matchGamesResult.error) handleDatabaseError(matchGamesResult.error, 'Failed to fetch bracket match games');
    if (participantsResult.error) handleDatabaseError(participantsResult.error, 'Failed to fetch bracket participants');
    if (groupsResult.error) handleDatabaseError(groupsResult.error, 'Failed to fetch bracket groups');
    if (roundsResult.error) handleDatabaseError(roundsResult.error, 'Failed to fetch bracket rounds');

    const matches = matchesResult.data || [];
    const participants = participantsResult.data || [];
    const groups = groupsResult.data || [];
    const rounds = roundsResult.data || [];

    debugLog(
      'Raw participants from DB:',
      participants.map((p) => ({ id: p.id, name: p.name }))
    );

    // Fetch team data to get logos - participant names match team names
    const teamNames = participants.filter((p) => p.name !== null).map((p) => p.name);

    debugLog('Fetching logos for teams:', teamNames);

    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select('name, logo_url, image_url')
      .in('name', teamNames);

    if (teamsError) {
      errorLog('Error fetching team logos:', teamsError);
    }

    debugLog('Teams data fetched:', teamsData);

    // Create a map of team name -> logo/image
    const teamLogoMap = new Map<string, { logo_url?: string; image_url?: string }>();
    (teamsData || []).forEach((team) => {
      teamLogoMap.set(team.name, {
        logo_url: team.logo_url,
        image_url: team.image_url,
      });
    });

    debugLog('Team logo map size:', teamLogoMap.size);

    // Transform participants to include logos
    const transformedParticipants = participants.map((p) => {
      const teamData = p.name ? teamLogoMap.get(p.name) : null;
      const hasLogo = !!(teamData?.logo_url || teamData?.image_url);

      debugLog(`Participant "${p.name}":`, {
        id: p.id,
        hasTeamData: !!teamData,
        hasLogo,
        logo_url: teamData?.logo_url,
        image_url: teamData?.image_url,
      });

      return {
        id: p.id,
        tournament_id: p.tournament_id,
        name: p.name,
        image: teamData?.image_url || teamData?.logo_url || undefined,
        position: p.position,
      };
    });

    // Filter match games by the matches we have
    const matchIds = new Set(matches.map((m) => m.id));
    const matchGames = (matchGamesResult.data || []).filter((g) => matchIds.has(g.match_id));

    // Build reverse match ID map: brackets-manager match.id (integer) -> match.id as string
    const reverseMatchIdMap = new Map<number, string>();
    matches.forEach((match) => {
      reverseMatchIdMap.set(match.id, match.id.toString());
    });

    // Build participant position map for seeding display
    const positionMap = new Map<number, number>();
    participants.forEach((p) => {
      if (p.id !== null && p.position !== null) {
        positionMap.set(p.id, p.position);
      }
    });
    bracketLog('Position map built:', positionMap.size, 'participants with positions');

    // Identify WB R1 round IDs — position (seed number) is only meaningful for
    // first-round seeding display. Setting position on later-round opponents triggers
    // brackets-viewer's completeWithBlankMatches() Toornament detection, which
    // reorders/hides LB R1 matches after bye advancement.
    const wbGroup = groups.find((g: BracketGroupRow) => g.number === 1);
    const wbR1RoundIds = new Set(
      rounds
        .filter((r: BracketRoundRow) => r.group_id === wbGroup?.id && r.number === 1)
        .map((r: BracketRoundRow) => r.id)
    );

    // Transform matches to viewer format (always create opponent objects for connectors)
    const transformedMatches = matches.map((match) => {
      // Only pass seed position for WB R1 matches (where seeding labels are shown)
      const showPosition = wbR1RoundIds.has(match.round_id);

      return {
        id: match.id,
        stage_id: match.stage_id,
        group_id: match.group_id,
        round_id: match.round_id,
        number: match.number,
        child_count: match.child_count,
        opponent1: BracketsViewerAdapter.toViewerOpponent(
          match.opponent1_id,
          match.opponent1_score,
          match.opponent1_result,
          showPosition && match.opponent1_id ? positionMap.get(match.opponent1_id) : undefined
        ),
        opponent2: BracketsViewerAdapter.toViewerOpponent(
          match.opponent2_id,
          match.opponent2_score,
          match.opponent2_result,
          showPosition && match.opponent2_id ? positionMap.get(match.opponent2_id) : undefined
        ),
        status: this.mapStatusToString(match.status),
      };
    });

    // Calculate source_node_id for connectors
    const matchesWithSources = this.calculateSourceNodeIds(transformedMatches, groups, rounds);

    bracketLog('Calculated source_node_ids:', {
      totalMatches: matchesWithSources.length,
      matchesWithSources: matchesWithSources.filter(
        (m) => m.opponent1?.source_node_id || m.opponent2?.source_node_id
      ).length,
      sampleWithSources: matchesWithSources.slice(5, 8).map((m) => ({
        id: m.id,
        round: m.round_id,
        opp1_source: m.opponent1?.source_node_id,
        opp2_source: m.opponent2?.source_node_id,
      })),
    });

    // Transform match games to viewer format
    const transformedMatchGames = matchGames.map((game) => ({
      id: game.id,
      number: game.number,
      stage_id: 1,
      parent_id: game.match_id,
      status: this.mapStatusToString(game.status),
      opponent1: {
        score: game.opponent1_score ?? undefined,
      },
      opponent2: {
        score: game.opponent2_score ?? undefined,
      },
    }));

    bracketLog('transformFromSql: Fetched data:', {
      stages: stages.length,
      groups: groups.length,
      rounds: rounds.length,
      matches: transformedMatches.length,
      matchGames: transformedMatchGames.length,
      participants: transformedParticipants.length,
      reverseMatchIdMapSize: reverseMatchIdMap.size,
      teamsWithLogos: transformedParticipants.filter((p) => p.image).length,
      participantsSample: transformedParticipants.slice(0, 3),
      matchesWithChildCount: transformedMatches.filter((m) => m.child_count > 0).length,
      sampleMatches: transformedMatches.slice(0, 3).map((m) => ({
        id: m.id,
        child_count: m.child_count,
        round_id: m.round_id,
        group_id: m.group_id,
      })),
    });

    return {
      data: {
        stages: stages as unknown as ViewerStage[],
        groups: groups as BracketGroupRow[],
        rounds: rounds as BracketRoundRow[],
        matches: matchesWithSources,
        matchGames: transformedMatchGames as unknown as ViewerMatchGame[],
        participants: transformedParticipants as unknown as ViewerParticipant[],
      },
      getPlayoffMatchId: (viewerMatchId: number) => {
        const result = reverseMatchIdMap.get(viewerMatchId);
        debugLog('getPlayoffMatchId:', viewerMatchId, '→', result);
        return result;
      },
    };
  }

  /**
   * Normalize opponent to viewer format (per Toornament API specification)
   * Always creates an object even when participant ID is null (for TBD slots)
   * This allows calculateSourceNodeIds() to populate source_node_id for connectors
   *
   * @see https://developer.toornament.com/v2/doc/viewer_bracket_nodes
   */
  private static toViewerOpponent(
    id: number | null | undefined,
    score?: number | null,
    result?: string | null,
    position?: number
  ): NonNullable<ViewerMatch['opponent1']> {
    return {
      id: id ?? null,
      score: score ?? undefined,
      result: result as 'win' | 'loss' | undefined,
      position: position, // Seeding position for display (e.g., #1, #2)
      // These will be populated by calculateSourceNodeIds() for connector drawing
      source_node_id: undefined as string | undefined,
      source_type: undefined as ('winner' | 'loser') | undefined,
    };
  }

  /**
   * Ensure opponent object exists for in-place mutation
   */
  private static ensureOpponentObject(match: ViewerMatch, key: 'opponent1' | 'opponent2') {
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
  private static calculateSourceNodeIds(
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
    const matchesById = new Map(matches.map((m) => [m.id, m]));
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
    for (const [key, arr] of matchesByGroupRound) {
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
        const o1 = this.ensureOpponentObject(match, 'opponent1');
        o1.source_node_id = String(prevMatch1.id);
        o1.source_type = 'winner';
      }

      if (prevMatch2) {
        const o2 = this.ensureOpponentObject(match, 'opponent2');
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
        const o1 = this.ensureOpponentObject(match, 'opponent1');
        if (!o1.source_node_id) {
          o1.source_node_id = String(prevMatch1.id);
          o1.source_type = 'winner';
        }
      }

      if (prevMatch2) {
        const o2 = this.ensureOpponentObject(match, 'opponent2');
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
          const o1 = this.ensureOpponentObject(match, 'opponent1');
          o1.source_node_id = String(wbMatch1.id);
          o1.source_type = 'loser';
        }

        if (wbMatch2) {
          const o2 = this.ensureOpponentObject(match, 'opponent2');
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
      const o1 = this.ensureOpponentObject(match, 'opponent1');
      const o2 = this.ensureOpponentObject(match, 'opponent2');
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
          const o1 = this.ensureOpponentObject(match, 'opponent1');
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
          const o2 = this.ensureOpponentObject(match, 'opponent2');
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
      if (s1 && !ids.has(String(s1))) {
        warnLog('Dangling source_node_id (o1)', m.id, '→', s1);
        dangling++;
      }
      if (s2 && !ids.has(String(s2))) {
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

  /**
   * Transform from JSONB bracket_data (brackets-manager's native format)
   */
  static transformFromJsonb(
    bracketData: InMemoryDatabase['data'],
    bracketId: string
  ): ViewerDataWithMapping {
    // Reset team map
    this.teamIdMap.clear();

    bracketLog('transformFromJsonb: Using in-memory data');

    // Create match ID mapping (brackets-manager match ID -> playoff match UUID)
    const matchIdMap = new Map<string, number>();
    const reverseMatchIdMap = new Map<number, string>();

    const matches = (bracketData.match || []) as unknown as ViewerMatch[];
    const groups = (bracketData.group || []) as BracketGroupRow[];
    const rounds = (bracketData.round || []) as BracketRoundRow[];

    // Calculate source_node_id for connectors (CRITICAL FIX)
    const matchesWithSources = this.calculateSourceNodeIds(matches, groups, rounds);

    bracketLog('transformFromJsonb: Wired sources for JSONB path', {
      totalMatches: matchesWithSources.length,
      withSources: matchesWithSources.filter(
        (m) => m.opponent1?.source_node_id || m.opponent2?.source_node_id
      ).length,
    });

    return {
      data: {
        stages: (bracketData.stage || []) as unknown as ViewerStage[],
        groups: groups,
        rounds: rounds,
        matches: matchesWithSources,
        matchGames: (bracketData.match_game || []) as ViewerMatchGame[],
        participants: (bracketData.participant || []) as ViewerParticipant[],
      },
      getPlayoffMatchId: (viewerMatchId: number) => reverseMatchIdMap.get(viewerMatchId),
    };
  }

  /**
   * Main transformation function - returns data and ID mapping function
   */
  static transform(
    bracket: PlayoffBracket,
    teams: PlayoffTeam[],
    storedParticipants?: Array<{
      position: number;
      team_id: string;
      name: string;
      logo_url?: string;
      image_url?: string;
    }>
  ): ViewerDataWithMapping {
    // Reset team map for each transformation
    this.teamIdMap.clear();

    // Create a local match ID map for this transformation
    const matchIdMap = new Map<string, number>();
    const reverseMatchIdMap = new Map<number, string>();

    // Use stored participants if available, otherwise fall back to teams
    const participants =
      storedParticipants && storedParticipants.length > 0
        ? this.transformStoredParticipants(storedParticipants)
        : this.transformParticipants(teams);

    const stage = this.transformBracket(bracket);
    const matches = this.transformMatches(
      bracket.matches || [],
      bracket.id,
      matchIdMap,
      reverseMatchIdMap
    );
    const matchGames = this.transformGames(bracket.matches || [], matchIdMap);

    // Build groups and rounds arrays for connector calculation (CRITICAL FIX)
    const isDoubleElim = bracket.format === 'Double Elimination';
    const groups = isDoubleElim
      ? [
          { id: 1, stage_id: 1, number: 1 }, // Winners bracket
          { id: 2, stage_id: 1, number: 2 }, // Losers bracket
        ]
      : [{ id: 1, stage_id: 1, number: 1 }]; // Single elimination

    // Build rounds based on match data
    const roundsMap = new Map<
      number,
      { id: number; stage_id: number; group_id: number; number: number }
    >();
    matches.forEach((match) => {
      const roundKey = match.round_id;
      if (!roundsMap.has(roundKey)) {
        roundsMap.set(roundKey, {
          id: roundKey,
          stage_id: 1,
          group_id: match.group_id,
          number: roundKey,
        });
      }
    });
    const rounds = Array.from(roundsMap.values());

    // Wire source_node_id for connectors (CRITICAL FIX)
    const matchesWithSources = this.calculateSourceNodeIds(matches, groups, rounds);

    bracketLog('transform: Wired sources for internal transform path', {
      totalMatches: matchesWithSources.length,
      withSources: matchesWithSources.filter(
        (m) => m.opponent1?.source_node_id || m.opponent2?.source_node_id
      ).length,
      groupsCount: groups.length,
      roundsCount: rounds.length,
    });

    return {
      data: {
        stages: [stage],
        groups: groups as BracketGroupRow[],
        rounds: rounds as BracketRoundRow[],
        matches: matchesWithSources,
        matchGames,
        participants,
      },
      getPlayoffMatchId: (viewerMatchId: number) => reverseMatchIdMap.get(viewerMatchId),
    };
  }

  /**
   * Transform bracket → stage
   */
  private static transformBracket(bracket: PlayoffBracket): ViewerStage {
    const isDoubleElim = bracket.format === 'Double Elimination';

    // Extract grandFinalType from bracket metadata
    let grandFinalType: 'simple' | 'double' | undefined = 'simple';
    if (isDoubleElim && bracket.participants && typeof bracket.participants === 'object') {
      const metadata = bracket.participants as unknown as { grandFinalType?: string };
      grandFinalType = (metadata.grandFinalType as 'simple' | 'double' | undefined) || 'simple';
    }

    return {
      id: 1,
      tournament_id: 1,
      name: bracket.name || 'Playoff Bracket',
      type: isDoubleElim ? 'double_elimination' : 'single_elimination',
      number: 1,
      settings: {
        size: this.calculateBracketSize(bracket.matches || []),
        grandFinal: isDoubleElim ? grandFinalType : undefined,
      },
    };
  }

  /**
   * Transform stored participants (with seed positions)
   */
  private static transformStoredParticipants(
    storedParticipants: Array<{
      position: number;
      team_id: string;
      name: string;
      logo_url?: string;
      image_url?: string;
    }>
  ): ViewerParticipant[] {
    return storedParticipants
      .sort((a, b) => a.position - b.position)
      .map((participant, index) => {
        const participantId = index + 1;
        this.teamIdMap.set(participant.team_id, participantId);

        return {
          id: participantId,
          tournament_id: 1,
          name: participant.name,
          image: participant.image_url || participant.logo_url || undefined,
          position: participant.position,
        };
      });
  }

  /**
   * Transform teams → participants (fallback)
   */
  private static transformParticipants(teams: PlayoffTeam[]): ViewerParticipant[] {
    return teams.map((team, index) => {
      const participantId = index + 1;
      this.teamIdMap.set(team.id, participantId);

      return {
        id: participantId,
        tournament_id: 1,
        name: team.name,
        image: team.image_url || team.logo_url || undefined,
        position: index + 1,
      };
    });
  }

  /**
   * Transform playoff_matches → viewer matches
   */
  private static transformMatches(
    playoffMatches: PlayoffMatch[],
    bracketId: string,
    matchIdMap: Map<string, number>,
    reverseMatchIdMap: Map<number, string>
  ): ViewerMatch[] {
    // Group by match_type
    const winnerMatches = playoffMatches
      .filter((m) => m.matchType === 'winners')
      .sort((a, b) => a.round - b.round || a.position - b.position);

    const loserMatches = playoffMatches
      .filter((m) => m.matchType === 'losers')
      .sort((a, b) => a.round - b.round || a.position - b.position);

    const finalMatches = playoffMatches
      .filter((m) => m.matchType === 'finals')
      .sort((a, b) => a.round - b.round || a.position - b.position);

    const matches: ViewerMatch[] = [];
    let matchNumber = 1;

    // Transform winner bracket (group 1)
    winnerMatches.forEach((m) => {
      const viewerMatch = this.transformMatch(m, 1, 1, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    // Transform loser bracket (group 2)
    loserMatches.forEach((m) => {
      const viewerMatch = this.transformMatch(m, 1, 2, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    // Transform finals (group 3)
    finalMatches.forEach((m) => {
      const viewerMatch = this.transformMatch(m, 1, 3, matchNumber++);
      matchIdMap.set(m.id, viewerMatch.id);
      reverseMatchIdMap.set(viewerMatch.id, m.id);
      matches.push(viewerMatch);
    });

    return matches;
  }

  /**
   * Transform single match
   */
  private static transformMatch(
    playoffMatch: PlayoffMatch,
    stageId: number,
    groupId: number,
    matchNumber: number
  ): ViewerMatch {
    const team1ParticipantId = playoffMatch.team1Id
      ? this.teamIdMap.get(playoffMatch.team1Id)
      : null;

    const team2ParticipantId = playoffMatch.team2Id
      ? this.teamIdMap.get(playoffMatch.team2Id)
      : null;

    return {
      id: matchNumber,
      stage_id: stageId,
      group_id: groupId,
      round_id: playoffMatch.round,
      number: matchNumber,
      opponent1: {
        id: team1ParticipantId ?? null,
        position: playoffMatch.team1Seed || undefined,
        result:
          playoffMatch.winnerId === playoffMatch.team1Id
            ? 'win'
            : playoffMatch.loserId === playoffMatch.team1Id
              ? 'loss'
              : undefined,
        score: playoffMatch.team1GameWins ?? playoffMatch.team1Score ?? undefined,
        source_node_id: undefined,
        source_type: undefined,
      },
      opponent2: {
        id: team2ParticipantId ?? null,
        position: playoffMatch.team2Seed || undefined,
        result:
          playoffMatch.winnerId === playoffMatch.team2Id
            ? 'win'
            : playoffMatch.loserId === playoffMatch.team2Id
              ? 'loss'
              : undefined,
        score: playoffMatch.team2GameWins ?? playoffMatch.team2Score ?? undefined,
        source_node_id: undefined,
        source_type: undefined,
      },
      status:
        playoffMatch.status === 'completed'
          ? 'completed'
          : team1ParticipantId && team2ParticipantId
            ? 'ready'
            : 'waiting',
    };
  }

  /**
   * Transform playoff_games → viewer match games
   */
  private static transformGames(
    playoffMatches: PlayoffMatch[],
    matchIdMap: Map<string, number>
  ): ViewerMatchGame[] {
    const games: ViewerMatchGame[] = [];
    let gameId = 1;

    playoffMatches.forEach((match) => {
      const viewerMatchId = matchIdMap.get(match.id);
      if (!viewerMatchId) return;

      const team1ParticipantId = match.team1Id ? this.teamIdMap.get(match.team1Id) : undefined;
      const team2ParticipantId = match.team2Id ? this.teamIdMap.get(match.team2Id) : undefined;

      if (match.games && match.games.length > 0) {
        match.games.forEach((game, gameNumber) => {
          games.push({
            id: gameId++,
            number: gameNumber + 1,
            stage_id: 1,
            parent_id: viewerMatchId,
            status: game.winnerId ? 'completed' : 'ready',
            opponent1: {
              id: team1ParticipantId,
              score: game.team1Score ?? undefined,
              result: game.winnerId === match.team1Id ? 'win' : game.winnerId ? 'loss' : undefined,
            },
            opponent2: {
              id: team2ParticipantId,
              score: game.team2Score ?? undefined,
              result: game.winnerId === match.team2Id ? 'win' : game.winnerId ? 'loss' : undefined,
            },
          });
        });
      }
    });

    return games;
  }

  /**
   * Helper: Map integer status to string status
   */
  private static mapStatusToString(status: number): ViewerMatch['status'] {
    const statusMap: Record<number, ViewerMatch['status']> = {
      0: 'locked',
      1: 'waiting',
      2: 'ready',
      3: 'running',
      4: 'completed',
      5: 'archived',
    };
    return statusMap[status] || 'waiting';
  }

  /**
   * Helper: Calculate bracket size (power of 2)
   */
  private static calculateBracketSize(matches: PlayoffMatch[]): number {
    if (matches.length === 0) return 8;

    const seeds = matches
      .flatMap((m) => [m.team1Seed, m.team2Seed])
      .filter((seed): seed is number => seed !== null && seed !== undefined);

    if (seeds.length === 0) return 8;

    const maxSeed = Math.max(...seeds);
    return Math.pow(2, Math.ceil(Math.log2(maxSeed || 8)));
  }
}
