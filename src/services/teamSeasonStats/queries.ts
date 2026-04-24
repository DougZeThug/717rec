import { DivisionRelation } from '@/hooks/teams/seasonBreakdown/types';
import { supabase } from '@/integrations/supabase/client';

import type { MatchRecord, PlayoffMatchRecord, SeasonStatRow } from './types';

export interface FetchSeasonBreakdownQueryResults {
  seasonStatsResult: { data: SeasonStatRow[] | null; error: unknown | null };
  allTeamSeasonStatsResult: {
    data: { team_id: string; season_id: string; division_name: string | null }[] | null;
    error: unknown | null;
  };
  currentMatchesResult: { data: MatchRecord[] | null; error: unknown | null };
  archivedMatchesResult: { data: MatchRecord[] | null; error: unknown | null };
  playoffMatchesResult: { data: Omit<PlayoffMatchRecord, 'bracketInfo'>[] | null; error: unknown | null };
}

export const fetchSeasonBreakdownQueries = async (
  teamId: string
): Promise<FetchSeasonBreakdownQueryResults> => {
  const [
    seasonStatsResult,
    allTeamSeasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    playoffMatchesResult,
  ] = await Promise.all([
    supabase
      .from('team_season_stats')
      .select(
        `
        season_id,
        match_wins,
        match_losses,
        game_wins,
        game_losses,
        sos,
        power_score,
        champion,
        runner_up,
        playoff_rank,
        division_name,
        seasons!inner(id, name, start_date)
      `
      )
      .eq('team_id', teamId)
      .order('seasons(start_date)', { ascending: false }),
    supabase.from('team_season_stats').select('team_id, season_id, division_name'),
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
        season_id
      `
      )
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('iscompleted', true),
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
  ]);

  return {
    seasonStatsResult,
    allTeamSeasonStatsResult,
    currentMatchesResult,
    archivedMatchesResult,
    playoffMatchesResult,
  };
};

export const fetchBracketsByIds = async (bracketIds: string[]) => {
  if (bracketIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from('brackets')
    .select('id, season_id, divisions(division_weight)')
    .in('id', bracketIds);

  return {
    data:
      data?.map((bracket) => ({
        id: bracket.id,
        season_id: bracket.season_id,
        divisions: bracket.divisions as DivisionRelation | null,
      })) ?? null,
    error,
  };
};
