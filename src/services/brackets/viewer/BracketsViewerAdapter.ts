import { InMemoryDatabase } from 'brackets-memory-db';

import { bracketLog } from '@/utils/logger';
import { PlayoffBracket, PlayoffTeam } from '@/utils/playoffs/playoffTypes';

import { transformBracket, transformGames, transformMatches } from './MatchTransformer';
import { transformParticipants, transformStoredParticipants } from './ParticipantTransformer';
import { calculateSourceNodeIds } from './SourceNodeCalculator';
import { transformFromSql } from './SqlBracketTransformer';
import {
  BracketGroupRow,
  BracketRoundRow,
  ViewerDataWithMapping,
  ViewerMatch,
  ViewerMatchGame,
  ViewerParticipant,
  ViewerStage,
} from './types';

const teamIdMap: Map<string, number> = new Map();

/**
 * Boundary cast — see ANY_PHASE_2.
 * Centralizes the unchecked casts at the brackets-viewer adapter boundary
 * where upstream rows (Supabase / brackets-manager JSONB) are handed off to
 * the viewer's expected shapes. No runtime validation is performed.
 */
function castToViewer<T>(value: unknown): T {
  return value as T;
}

export const BracketsViewerAdapter = {
  /**
   * Transform from brackets-manager SQL tables
   */
  transformFromSql(bracketId: string): Promise<ViewerDataWithMapping> {
    return transformFromSql(bracketId);
  },

  /**
   * Transform from JSONB bracket_data (brackets-manager's native format)
   */
  transformFromJsonb(
    bracketData: InMemoryDatabase['data'],
    _bracketId: string
  ): ViewerDataWithMapping {
    // Reset team map
    teamIdMap.clear();

    bracketLog('transformFromJsonb: Using in-memory data');

    // Create match ID mapping (brackets-manager match ID -> playoff match UUID)
    const reverseMatchIdMap = new Map<number, string>();

    const matches = castToViewer<ViewerMatch[]>(bracketData.match || []);
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
        stages: castToViewer<ViewerStage[]>(bracketData.stage || []),
        groups: groups,
        rounds: rounds,
        matches: matchesWithSources,
        matchGames: castToViewer<ViewerMatchGame[]>(bracketData.match_game || []),
        participants: (bracketData.participant || []) as ViewerParticipant[],
      },
      getPlayoffMatchId: (viewerMatchId: number) => reverseMatchIdMap.get(viewerMatchId),
    };
  },

  /**
   * Main transformation function - returns data and ID mapping function
   */
  transform(
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
    teamIdMap.clear();

    // Create a local match ID map for this transformation
    const matchIdMap = new Map<string, number>();
    const reverseMatchIdMap = new Map<number, string>();

    // Use stored participants if available, otherwise fall back to teams
    const participants =
      storedParticipants && storedParticipants.length > 0
        ? transformStoredParticipants(storedParticipants, teamIdMap)
        : transformParticipants(teams, teamIdMap);

    const stage = transformBracket(bracket);
    const matches = transformMatches(
      bracket.matches || [],
      matchIdMap,
      reverseMatchIdMap,
      teamIdMap
    );
    const matchGames = transformGames(bracket.matches || [], matchIdMap, teamIdMap);

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
  },
};
