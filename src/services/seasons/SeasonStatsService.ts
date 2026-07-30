import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { handleDatabaseError } from '@/utils/errorHandler';

type SeasonStatsAccordionRow = Pick<
  Tables<'team_season_stats'>,
  | 'team_id'
  | 'season_id'
  | 'match_wins'
  | 'match_losses'
  | 'game_wins'
  | 'game_losses'
  | 'sos'
  | 'power_score'
  | 'champion'
  | 'runner_up'
  | 'division_name'
  | 'playoff_rank'
> & {
  teams: Pick<Tables<'teams'>, 'name' | 'logo_url' | 'image_url'> | null;
};

export const SeasonStatsService = {
  // From SeasonAccordion.tsx (useSeasonData queryFn)
  fetchSeasonStatsForAccordion: async (seasonId: string) => {
    const { data, error } = await supabase
      .from('team_season_stats')
      .select(
        `
            team_id,
            season_id,
            match_wins,
            match_losses,
            game_wins,
            game_losses,
            sos,
            power_score,
            champion,
            runner_up,
            division_name,
            playoff_rank,
            teams:team_id (
              name,
              logo_url,
              image_url
            )
          `
      )
      .eq('season_id', seasonId)
      .order('division_name', { ascending: true })
      .order('playoff_rank', { ascending: true, nullsFirst: false });

    if (error) {
      handleDatabaseError(error, 'Failed to fetch season stats');
    }

    // Transform the data structure
    const transformedData = ((data || []) as SeasonStatsAccordionRow[]).map((item) => ({
      team_id: item.team_id,
      season_id: item.season_id,
      match_wins: item.match_wins,
      match_losses: item.match_losses,
      game_wins: item.game_wins,
      game_losses: item.game_losses,
      sos: item.sos,
      power_score: item.power_score,
      champion: item.champion,
      runner_up: item.runner_up,
      division_name: item.division_name,
      playoff_rank: item.playoff_rank,
      team_name: item.teams?.name || 'Unknown Team',
      team_logo_url: item.teams?.logo_url,
      team_image_url: item.teams?.image_url,
    }));

    return transformedData;
  },
};
