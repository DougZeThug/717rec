import { bracketLog } from '@/utils/logger';

import type { SimpleBracketData } from './useBracketData';

interface RawMatch {
  id: number;
  opponent1_id: number | null;
  opponent2_id: number | null;
  opponent1_result: string | null;
  opponent2_result: string | null;
  opponent1_score: number | null;
  opponent2_score: number | null;
  status: number;
  group_id: number;
  round_id: number;
  number: number;
}

interface RawParticipant {
  id: number;
  name: string;
  position: number;
  tournament_id: string;
}

interface RawGroup {
  id: number;
  number: number;
  stage_id: number;
}

interface TeamDetail {
  id: string;
  name: string;
  image_url?: string;
}

/** Map group.number to matchType string. */
const getMatchType = (groupNumber: number): string => {
  switch (groupNumber) {
    case 1:
      return 'winners';
    case 2:
      return 'losers';
    case 3:
      return 'finals';
    default:
      return 'winners';
  }
};

/** Map numeric status to string. */
const getStatusName = (status: number): string => {
  if (status === 4) return 'completed';
  if (status === 3) return 'running';
  if (status === 2) return 'ready';
  return 'pending';
};

interface TransformBracketsManagerDataInput {
  bracket: {
    id: string;
    title: string;
    format: string | null;
    state: string | null;
    divisions: { display_division: string; name: string } | null;
  };
  stageId: number;
  participants: RawParticipant[];
  groups: RawGroup[];
  matches: RawMatch[];
  teamDetails: TeamDetail[];
}

/**
 * Pure function that transforms raw brackets-manager SQL data into
 * the SimpleBracketData format used by the UI.
 */
export const transformBracketsManagerData = ({
  bracket,
  stageId,
  participants,
  groups,
  matches,
  teamDetails,
}: TransformBracketsManagerDataInput): SimpleBracketData => {
  // Build group_id to group.number mapping
  const groupIdToNumberMap = new Map<number, number>();
  groups.forEach((group) => {
    groupIdToNumberMap.set(group.id, group.number);
  });
  bracketLog('Groups mapped:', groupIdToNumberMap.size);

  // Build participant ID to name mapping
  const participantToTeamMap = new Map<number, string>();
  participants.forEach((p) => {
    participantToTeamMap.set(p.id, p.name);
  });

  // Build team name to team detail lookup
  const teamLookup = new Map<string, TeamDetail>();
  teamDetails.forEach((team) => {
    teamLookup.set(team.name, team);
  });

  bracketLog('Teams fetched:', teamDetails.length);

  // Transform matches
  const transformedMatches = matches.map((match) => {
    const team1Name = match.opponent1_id ? participantToTeamMap.get(match.opponent1_id) : null;
    const team2Name = match.opponent2_id ? participantToTeamMap.get(match.opponent2_id) : null;
    const team1 = team1Name ? teamLookup.get(team1Name) : null;
    const team2 = team2Name ? teamLookup.get(team2Name) : null;

    let winnerId = null;
    if (match.opponent1_result === 'win' && team1) winnerId = team1.id;
    else if (match.opponent2_result === 'win' && team2) winnerId = team2.id;

    const groupNumber = groupIdToNumberMap.get(match.group_id) || 1;

    return {
      id: `match-${match.id}`,
      round: match.round_id + 1,
      position: match.number,
      team1Id: team1?.id || null,
      team2Id: team2?.id || null,
      team1Name: team1?.name,
      team2Name: team2?.name,
      team1Logo: team1?.image_url,
      team2Logo: team2?.image_url,
      winnerId,
      team1Score: match.opponent1_score ?? null,
      team2Score: match.opponent2_score ?? null,
      matchType: getMatchType(groupNumber),
      status: getStatusName(match.status),
      nextWinMatchId: null,
      nextLoseMatchId: null,
      team1Seed: null,
      team2Seed: null,
    };
  });

  bracketLog('Matches transformed:', transformedMatches.length);

  // Transform participants
  const transformedParticipants = participants.map((p) => {
    const team = teamLookup.get(p.name);
    return {
      position: p.position,
      team_id: team?.id || '',
      name: p.name,
      image_url: team?.image_url,
    };
  });

  return {
    id: bracket.id,
    name: bracket.title,
    title: bracket.title,
    format: bracket.format || 'Single Elimination',
    state: bracket.state || 'pending',
    division: bracket.divisions?.display_division || bracket.divisions?.name || 'Unknown',
    uses_brackets_manager: true,
    matches: transformedMatches,
    teams: Array.from(teamLookup.values()),
    participants: transformedParticipants,
    stageId,
  };
};
