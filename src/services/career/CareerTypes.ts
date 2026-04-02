import { ArchivedMatchData, MatchData, PlayoffMatchData, SeasonStats } from '@/utils/career/types';

export interface TeamData {
  divisions: { division_weight: number } | null;
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
  bracketSeasonMap: Record<string, string>;
  teamDivisionWeight: number;
  currentSeasonId: string | null;
}
