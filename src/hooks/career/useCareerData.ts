import { supabase } from '@/integrations/supabase/client';
import { ArchivedMatchData, MatchData, PlayoffMatchData, SeasonStats } from '@/utils/career/types';
import { errorLog, warnLog } from '@/utils/logger';

interface TeamData {
  divisions: { division_weight: number } | null;
}

interface TeamDetailsArchive {
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
  teamDivisionWeight: number;
  currentSeasonId: string | null;
}

/**
 * Fetches all career-related data for a team in parallel.
 * Returns raw data that can be processed by calculation utilities.
 */
export const fetchCareerData = async (teamId: string): Promise<CareerData | null> => {
  // Fetch all independent queries in parallel
  const [
    teamDataResult,
    seasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    allTeamSeasonStatsResult,
    playoffMatchesResult,
    activeSeasonResult,
  ] = await Promise.all([
    // Get team's current division weight
    supabase.from('teams').select('divisions(division_weight)').eq('id', teamId).single(),
    // Get career stats from team_season_stats with division info and season_id
    supabase
      .from('team_season_stats')
      .select(
        `
        match_wins,
        match_losses,
        game_wins,
        game_losses,
        champion,
        runner_up,
        playoff_rank,
        sos,
        division_name,
        season_id,
        seasons!inner(name)
      `
      )
      .eq('team_id', teamId),
    // Get current season matches with opponent team info
    supabase
      .from('matches')
      .select(
        `
        winner_id,
        loser_id,
        team1_game_wins,
        team2_game_wins,
        team1_id,
        team2_id,
        season_id,
        team1:teams!matches_team1_id_fkey(id, divisions(name)),
        team2:teams!matches_team2_id_fkey(id, divisions(name))
      `
      )
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
    // Get archived matches for sweep rate and division records
    supabase
      .from('matches_archive')
      .select(
        `
        winner_id,
        loser_id,
        team1_game_wins,
        team2_game_wins,
        team1_id,
        team2_id,
        season_id
      `
      )
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
    // Fetch historical team divisions from team_details_archive (authoritative source for past seasons)
    supabase.from('team_details_archive').select('team_id, season_id, divisionname'),
    // Get playoff matches with bracket information
    supabase
      .from('playoff_matches')
      .select(
        `
        winner_id,
        loser_id,
        team1_score,
        team2_score,
        team1_id,
        team2_id,
        bracket_id
      `
      )
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .not('winner_id', 'is', null),
    // Get the current active season (authoritative source)
    supabase.from('seasons').select('id').eq('is_active', true).single(),
  ]);

  // Handle critical error
  if (seasonStatsResult.error) {
    errorLog('Error fetching team season stats:', seasonStatsResult.error);
    return null;
  }

  // Log non-critical errors
  if (currentMatchesResult.error) {
    warnLog('Error fetching current matches:', currentMatchesResult.error);
  }
  if (archivedMatchesResult.error) {
    warnLog('Error fetching archived matches:', archivedMatchesResult.error);
  }
  if (playoffMatchesResult.error) {
    warnLog('Error fetching playoff matches:', playoffMatchesResult.error);
  }

  const teamData = teamDataResult.data as TeamData | null;
  const seasonStats = seasonStatsResult.data as SeasonStats[] | null;
  const currentMatches = currentMatchesResult.data as unknown as MatchData[] | null;
  const archivedMatches = archivedMatchesResult.data as ArchivedMatchData[] | null;
  const allTeamDetailsArchive = allTeamSeasonStatsResult.data as TeamDetailsArchive[] | null;
  const playoffMatches = playoffMatchesResult.data as PlayoffMatchData[] | null;
  const activeSeason = activeSeasonResult.data as { id: string } | null;

  const teamDivisionWeight = teamData?.divisions?.division_weight || 0.85;

  // Get bracket division weights for competitive playoff detection
  const bracketDivisionWeights: Record<string, number> = {};
  if (playoffMatches && playoffMatches.length > 0) {
    const bracketIds = [
      ...new Set(playoffMatches.map((match) => match.bracket_id).filter(Boolean)),
    ] as string[];

    if (bracketIds.length > 0) {
      const { data: bracketData } = await supabase
        .from('brackets')
        .select(
          `
          id,
          divisions(division_weight)
        `
        )
        .in('id', bracketIds);

      if (bracketData) {
        for (const bracket of bracketData) {
          const divisions = bracket.divisions as { division_weight: number } | null;
          bracketDivisionWeights[bracket.id] = divisions?.division_weight || 0.85;
        }
      }
    }
  }

  // Build lookup map: "teamId_seasonId" -> divisionname (from team_details_archive)
  const teamDivisionMap = new Map<string, string>();
  if (allTeamDetailsArchive) {
    for (const archive of allTeamDetailsArchive) {
      if (archive.team_id && archive.season_id && archive.divisionname) {
        teamDivisionMap.set(`${archive.team_id}_${archive.season_id}`, archive.divisionname);
      }
    }
  }

  // Use the authoritative active season from seasons table
  const currentSeasonId = activeSeason?.id || null;

  return {
    teamData,
    seasonStats,
    currentMatches,
    archivedMatches,
    playoffMatches,
    teamDivisionMap,
    bracketDivisionWeights,
    teamDivisionWeight,
    currentSeasonId,
  };
};
