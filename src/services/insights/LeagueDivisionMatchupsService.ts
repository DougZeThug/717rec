import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

export interface CompletedMatchRow {
  winner_id: string;
  loser_id: string;
  season_id: string | null;
}

export interface CompletedPlayoffMatchRow {
  winner_id: string;
  loser_id: string;
  bracket_id: string | null;
}

export interface TeamSeasonDivisionRow {
  team_id: string;
  season_id: string;
  division_name: string | null;
}

export interface BracketDivisionRow {
  id: string;
  display_division: string | null;
}

export interface LeagueDivisionMatchupsData {
  matches: CompletedMatchRow[];
  archivedMatches: CompletedMatchRow[];
  playoffMatches: CompletedPlayoffMatchRow[];
  teamSeasonDivisions: TeamSeasonDivisionRow[];
  brackets: BracketDivisionRow[];
}

const PAGE_SIZE = 1000;

// Range pagination requires an explicit, stable ORDER BY on every query below.
// Without one, PostgREST/Postgres may return rows in a different order per page,
// which can skip or duplicate rows across page boundaries.
async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  context: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  // Loop until we get a short page.
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) handleDatabaseError(error as never, context);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export const fetchLeagueDivisionMatchups = async (): Promise<LeagueDivisionMatchupsData> => {
  const [matches, archivedMatches, playoffMatches, teamSeasonDivisions, bracketRows] =
    await Promise.all([
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
      fetchAllPages<CompletedPlayoffMatchRow>(
        (from, to) =>
          supabase
            .from('playoff_matches')
            .select('winner_id, loser_id, bracket_id')
            .not('winner_id', 'is', null)
            .not('loser_id', 'is', null)
            .order('id', { ascending: true })
            .range(from, to),
        'Failed to fetch playoff matches for league division matchups'
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
      (async () => {
        const { data, error } = await supabase
          .from('brackets')
          .select('id, divisions(display_division)');
        if (error)
          handleDatabaseError(error, 'Failed to fetch brackets for league division matchups');
        return (data ?? []).map((row) => ({
          id: row.id as string,
          display_division:
            (row as { divisions: { display_division: string | null } | null }).divisions
              ?.display_division ?? null,
        })) as BracketDivisionRow[];
      })(),
    ]);

  return {
    matches,
    archivedMatches,
    playoffMatches,
    teamSeasonDivisions,
    brackets: bracketRows,
  };
};
