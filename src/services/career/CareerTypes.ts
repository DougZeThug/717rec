import { ArchivedMatchData, MatchData, PlayoffMatchData, SeasonStats } from '@/utils/career/types';

export interface TeamData {
  divisions: { division_weight: number | null } | null;
}

export interface TeamDetailsArchive {
  team_id: string;
  season_id: string;
  divisionname: string | null;
}

export interface CareerData {
  teamData: TeamData | null;
  seasonStats: SeasonStats[] | null;
  currentMatches: MatchData[] | null;
  archivedMatches: ArchivedMatchData[] | null;
  playoffMatches: PlayoffMatchData[] | null;
  teamDivisionMap: Map<string, string>;
  bracketDivisionWeights: Record<string, number>;
  bracketDivisionDisplayNames: Record<string, string>;
  bracketSeasonMap: Record<string, string>;
  // The team's current division weight. null = no division or no weight (unrated).
  teamDivisionWeight: number | null;
  currentSeasonId: string | null;
}
