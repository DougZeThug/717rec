import { PlayoffBracket, PlayoffMatch } from '@/utils/playoffs/playoffTypes';

import { calculateBracketSize } from './bracketViewerUtils';
import { ViewerMatch, ViewerMatchGame, ViewerStage } from './types';

/**
 * Transform bracket metadata → ViewerStage
 */
export function transformBracket(bracket: PlayoffBracket): ViewerStage {
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
      size: calculateBracketSize(bracket.matches || []),
      grandFinal: isDoubleElim ? grandFinalType : undefined,
    },
  };
}

/**
 * Transform a single playoff match → ViewerMatch
 */
function transformMatch(
  playoffMatch: PlayoffMatch,
  stageId: number,
  groupId: number,
  matchNumber: number,
  teamIdMap: Map<string, number>
): ViewerMatch {
  const team1ParticipantId = playoffMatch.team1Id ? teamIdMap.get(playoffMatch.team1Id) : null;
  const team2ParticipantId = playoffMatch.team2Id ? teamIdMap.get(playoffMatch.team2Id) : null;

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
 * Transform playoff_matches → viewer matches, grouped by bracket section (winners / losers / finals).
 * Populates matchIdMap and reverseMatchIdMap for ID translation between the two systems.
 */
export function transformMatches(
  playoffMatches: PlayoffMatch[],
  matchIdMap: Map<string, number>,
  reverseMatchIdMap: Map<number, string>,
  teamIdMap: Map<string, number>
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
    const viewerMatch = transformMatch(m, 1, 1, matchNumber++, teamIdMap);
    matchIdMap.set(m.id, viewerMatch.id);
    reverseMatchIdMap.set(viewerMatch.id, m.id);
    matches.push(viewerMatch);
  });

  // Transform loser bracket (group 2)
  loserMatches.forEach((m) => {
    const viewerMatch = transformMatch(m, 1, 2, matchNumber++, teamIdMap);
    matchIdMap.set(m.id, viewerMatch.id);
    reverseMatchIdMap.set(viewerMatch.id, m.id);
    matches.push(viewerMatch);
  });

  // Transform finals (group 3)
  finalMatches.forEach((m) => {
    const viewerMatch = transformMatch(m, 1, 3, matchNumber++, teamIdMap);
    matchIdMap.set(m.id, viewerMatch.id);
    reverseMatchIdMap.set(viewerMatch.id, m.id);
    matches.push(viewerMatch);
  });

  return matches;
}

/**
 * Transform playoff_games → viewer match games
 */
export function transformGames(
  playoffMatches: PlayoffMatch[],
  matchIdMap: Map<string, number>,
  teamIdMap: Map<string, number>
): ViewerMatchGame[] {
  const games: ViewerMatchGame[] = [];
  let gameId = 1;

  playoffMatches.forEach((match) => {
    const viewerMatchId = matchIdMap.get(match.id);
    if (!viewerMatchId) return;

    const team1ParticipantId = match.team1Id ? teamIdMap.get(match.team1Id) : undefined;
    const team2ParticipantId = match.team2Id ? teamIdMap.get(match.team2Id) : undefined;

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
