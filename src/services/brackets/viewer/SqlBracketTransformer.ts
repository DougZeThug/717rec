import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, debugLog, errorLog } from '@/utils/logger';

import { mapStatusToString } from './bracketViewerUtils';
import { calculateSourceNodeIds, toViewerOpponent } from './SourceNodeCalculator';
import {
  BracketGroupRow,
  BracketRoundRow,
  ViewerDataWithMapping,
  ViewerMatchGame,
  ViewerParticipant,
  ViewerStage,
} from './types';

/**
 * Boundary cast — see ANY_PHASE_2.
 * Centralizes the unchecked casts at the brackets-viewer adapter boundary
 * where upstream rows (Supabase / brackets-manager JSONB) are handed off to
 * the viewer's expected shapes. No runtime validation is performed.
 */
const teamIdMap: Map<string, number> = new Map();

function castToViewer<T>(value: unknown): T {
  return value as T;
}

/**
 * Transform from brackets-manager SQL tables
 */
export async function transformFromSql(bracketId: string): Promise<ViewerDataWithMapping> {
  bracketLog('transformFromSql: Fetching from SQL tables for bracket:', bracketId);

  // Reset team map
  teamIdMap.clear();

  // First get stage to find stage_id
  const { data: stages, error: stageError } = await supabase
    .from('stage')
    .select('id, name, type, tournament_id, number, settings')
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
        .select('id, name, tournament_id, position, team_id')
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

  // Fetch team data (logos + canonical names) by participant.team_id —
  // id-keyed so a mid-playoffs team rename can't break logos or labels.
  const teamIds = participants.map((p) => p.team_id).filter((id): id is string => id !== null);

  debugLog('Fetching team details for team ids:', teamIds);

  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, logo_url, image_url')
    .in('id', teamIds);

  if (teamsError) {
    errorLog('Error fetching team logos:', teamsError);
  }

  debugLog('Teams data fetched:', teamsData);

  // Map of team id -> team detail
  const teamDetailMap = new Map<string, { name: string; logo_url?: string; image_url?: string }>();
  (teamsData || []).forEach((team) => {
    teamDetailMap.set(team.id, {
      name: team.name,
      logo_url: team.logo_url ?? undefined,
      image_url: team.image_url ?? undefined,
    });
  });

  debugLog('Team detail map size:', teamDetailMap.size);

  // Transform participants to include logos; display name prefers the
  // canonical teams.name, falling back to the participant snapshot name.
  const transformedParticipants = participants.map((p) => {
    const teamData = p.team_id ? teamDetailMap.get(p.team_id) : null;
    const hasLogo = Boolean(teamData?.logo_url || teamData?.image_url);

    debugLog(`Participant "${p.name}":`, {
      id: p.id,
      hasTeamData: Boolean(teamData),
      hasLogo,
      logo_url: teamData?.logo_url,
      image_url: teamData?.image_url,
    });

    return {
      id: p.id,
      tournament_id: p.tournament_id,
      name: teamData?.name ?? p.name,
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
      stages: castToViewer<ViewerStage[]>(stages),
      groups: groups as BracketGroupRow[],
      rounds: rounds as BracketRoundRow[],
      matches: matchesWithSources,
      matchGames: castToViewer<ViewerMatchGame[]>(transformedMatchGames),
      participants: castToViewer<ViewerParticipant[]>(transformedParticipants),
    },
    getPlayoffMatchId: (viewerMatchId: number) => {
      const result = reverseMatchIdMap.get(viewerMatchId);
      debugLog('getPlayoffMatchId:', viewerMatchId, '→', result);
      return result;
    },
  };
}
