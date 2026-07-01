import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { createEveningAwareDateRange } from '@/utils/timezone';

/**
 * Service layer for schedule and admin match operations
 */

// PostgREST caps a single response at 1,000 rows. The admin mass-score screen
// loads matches through this function, so it pages through results instead of
// relying on one query (which would silently drop everything past row 1,000).
const ADMIN_MATCH_PAGE_SIZE = 1000;

/**
 * Fetch matches for admin with evening-aware date range filtering.
 *
 * Results are paginated so the admin mass-score screen never silently stops at
 * PostgREST's 1,000-row response cap. Rows are ordered by date then id — date
 * alone is not a total order (many matches share a date), and range pagination
 * requires a stable, unique sort or it can skip or repeat rows across pages.
 *
 * @throws {DatabaseError} When database operations fail
 */
export const fetchMatchesForAdmin = async (filters: { date?: Date; bracketId?: string }) => {
  const buildPage = (from: number, to: number) => {
    let query = supabase
      .from('matches')
      .select(
        `
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
      `
      )
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (filters.date) {
      const { startDate, endDate } = createEveningAwareDateRange(filters.date);
      query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
    }

    if (filters.bracketId) {
      query = query.eq('bracket_id', filters.bracketId);
    }

    return query.range(from, to);
  };

  const rows: NonNullable<Awaited<ReturnType<typeof buildPage>>['data']> = [];
  let from = 0;

  // Keep fetching pages until we get a short (non-full) page — that is the last one.
  while (true) {
    const to = from + ADMIN_MATCH_PAGE_SIZE - 1;
    const { data, error } = await buildPage(from, to);
    if (error) handleDatabaseError(error, 'Failed to fetch matches for admin');

    const page = data ?? [];
    rows.push(...page);

    if (page.length < ADMIN_MATCH_PAGE_SIZE) break;
    from += ADMIN_MATCH_PAGE_SIZE;
  }

  return rows;
};

/**
 * Fetch schedule matches for the active season with v_team_details join.
 * Used by useScheduleData hook.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchScheduleMatches = async () => {
  // First get the active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) return [];

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      team1:v_team_details!team1_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      ),
      team2:v_team_details!team2_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      )
    `
    )
    .eq('season_id', activeSeason.id)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch schedule matches');
  return data ?? [];
};
