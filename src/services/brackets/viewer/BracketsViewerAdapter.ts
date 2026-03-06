import { InMemoryDatabase } from 'brackets-memory-db';

import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, debugLog, errorLog } from '@/utils/logger';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { mapStatusToString } from './bracketViewerUtils';
import { transformBracket, transformGames, transformMatches } from './MatchTransformer';
import { transformParticipants, transformStoredParticipants } from './ParticipantTransformer';
import { calculateSourceNodeIds, toViewerOpponent } from './SourceNodeCalculator';
import {
  BracketGroupRow,
  BracketRoundRow,
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

    if (matchesResult.error)
      handleDatabaseError(matchesResult.error, 'Failed to fetch bracket matches');
    if (matchGamesResult.error)
      handleDatabaseError(matchGamesResult.error, 'Failed to fetch bracket match games');
    if (participantsResult.error)
      handleDatabaseError(participantsResult.error, 'Failed to fetch bracket participants');
    if (groupsResult.error)
      handleDatabaseError(groupsResult.error, 'Failed to fetch bracket groups');
    if (roundsResult.error)
      handleDatabaseError(roundsResult.error, 'Failed to fetch bracket rounds');

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
        opponent1: toViewerOpponent(
          match.opponent1_id,
          match.opponent1_score,
          match.opponent1_result,
          showPosition && match.opponent1_id ? positionMap.get(match.opponent1_id) : undefined
        ),
        opponent2: toViewerOpponent(
          match.opponent2_id,
          match.opponent2_score,
          match.opponent2_result,
          showPosition && match.opponent2_id ? positionMap.get(match.opponent2_id) : undefined
        ),
        status: mapStatusToString(match.status),
      };
    });

    // Calculate source_node_id for connectors
    const matchesWithSources = calculateSourceNodeIds(transformedMatches, groups, rounds);

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
      status: mapStatusToString(game.status),
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
    const reverseMatchIdMap = new Map<number, string>();

    const matches = (bracketData.match || []) as unknown as ViewerMatch[];
    const groups = (bracketData.group || []) as BracketGroupRow[];
    const rounds = (bracketData.round || []) as BracketRoundRow[];

    // Calculate source_node_id for connectors (CRITICAL FIX)
    const matchesWithSources = calculateSourceNodeIds(matches, groups, rounds);

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
        matchGames: (bracketData.match_game || []) as unknown as ViewerMatchGame[],
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
        ? transformStoredParticipants(storedParticipants, this.teamIdMap)
        : transformParticipants(teams, this.teamIdMap);

    const stage = transformBracket(bracket);
    const matches = transformMatches(
      bracket.matches || [],
      matchIdMap,
      reverseMatchIdMap,
      this.teamIdMap
    );
    const matchGames = transformGames(bracket.matches || [], matchIdMap, this.teamIdMap);

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
    const matchesWithSources = calculateSourceNodeIds(matches, groups, rounds);

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
}
