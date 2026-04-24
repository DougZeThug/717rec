import type { BracketInfo, MatchRecord, PlayoffMatchRecord } from './types';

export const buildTeamDivisionMap = (
  allTeamSeasonStats: { team_id: string; season_id: string; division_name: string | null }[] | null
): Map<string, string> => {
  const map = new Map<string, string>();
  if (!allTeamSeasonStats) {
    return map;
  }

  for (const stat of allTeamSeasonStats) {
    if (stat.team_id && stat.season_id && stat.division_name) {
      map.set(`${stat.team_id}_${stat.season_id}`, stat.division_name);
    }
  }

  return map;
};

export const buildBracketInfoMap = (
  brackets:
    | {
        id: string;
        season_id: string | null;
        divisions: { division_weight: number } | null;
      }[]
    | null
): Record<string, BracketInfo> => {
  const bracketInfoMap: Record<string, BracketInfo> = {};

  for (const bracket of brackets || []) {
    bracketInfoMap[bracket.id] = {
      season_id: bracket.season_id || '',
      division_weight: bracket.divisions?.division_weight ?? 0.85,
    };
  }

  return bracketInfoMap;
};

export const groupMatchesBySeason = (
  allMatches: MatchRecord[],
  playoffMatches: PlayoffMatchRecord[]
): {
  matchesBySeason: Map<string, MatchRecord[]>;
  playoffMatchesBySeason: Map<string, PlayoffMatchRecord[]>;
} => {
  const matchesBySeason = new Map<string, MatchRecord[]>();
  const playoffMatchesBySeason = new Map<string, PlayoffMatchRecord[]>();

  for (const match of allMatches) {
    if (!match.season_id) {
      continue;
    }

    const existing = matchesBySeason.get(match.season_id) || [];
    existing.push(match);
    matchesBySeason.set(match.season_id, existing);
  }

  for (const match of playoffMatches) {
    const seasonId = match.bracketInfo?.season_id;
    if (!seasonId) {
      continue;
    }

    const existing = playoffMatchesBySeason.get(seasonId) || [];
    existing.push(match);
    playoffMatchesBySeason.set(seasonId, existing);
  }

  return { matchesBySeason, playoffMatchesBySeason };
};
