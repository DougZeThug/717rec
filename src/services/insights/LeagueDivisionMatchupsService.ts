import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/services/shared/pagination';

interface CompletedMatchRow {
  winner_id: string;
  loser_id: string;
  season_id: string | null;
}

interface TeamSeasonDivisionRow {
  team_id: string;
  season_id: string;
  division_name: string | null;
}

export interface LeagueDivisionMatchupsData {
  matches: CompletedMatchRow[];
  archivedMatches: CompletedMatchRow[];
  teamSeasonDivisions: TeamSeasonDivisionRow[];
}

// Every paginated query below MUST apply a stable, total ORDER BY before
// .range() (see fetchAllPages) — range pagination over an unstable order can
// skip or duplicate rows across page boundaries.
export const fetchLeagueDivisionMatchups = async (): Promise<LeagueDivisionMatchupsData> => {
  const [matches, archivedMatches, teamSeasonDivisions] = await Promise.all([
    fetchAllPages<CompletedMatchRow>(
      (from, to) =>
        supabase
          .from('matches')
          .select('winner_id, loser_id, season_id')
          .not('winner_id', 'is', null)
          .not('loser_id', 'is', null)
          .order('id', { ascending: true })
          .range(from, to),
      'Failed to fetch matches for league division matchups'
    ),
    fetchAllPages<CompletedMatchRow>(
      (from, to) =>
        supabase
          .from('matches_archive')
          .select('winner_id, loser_id, season_id')
          .not('winner_id', 'is', null)
          .not('loser_id', 'is', null)
          .order('id', { ascending: true })
          .range(from, to),
      'Failed to fetch archived matches for league division matchups'
    ),
    fetchAllPages<TeamSeasonDivisionRow>(
      (from, to) =>
        supabase
          .from('team_season_stats')
          .select('team_id, season_id, division_name')
          .order('season_id', { ascending: true })
          .order('team_id', { ascending: true })
          .range(from, to),
      'Failed to fetch team season divisions for league division matchups'
    ),
  ]);

  return { matches, archivedMatches, teamSeasonDivisions };
};
