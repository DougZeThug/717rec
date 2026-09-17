import { supabase } from '@/integrations/supabase/client';
import { fetchPowerScoreTrendsForWeek } from '@/services/rankings/weeklyTrendsForWeek';
import { WeeklyRecapService } from '@/services/weeklyRecap/WeeklyRecapService';
import { getWeekWindow } from '@/services/weeklyRecap/weekWindow';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import { toTeamSlug } from '@/utils/teamSlug';

import type { SnapshotStandingsInput } from './buildRecapFacts';
import { buildRecapFacts } from './buildRecapFacts';

/**
 * Reads everything a recap edition needs for one explicit week and freezes it.
 *
 * Standings come from power_score_snapshots rather than v_team_details. That is
 * the only source that records what a team's record and power score WERE in a
 * given week; the view only ever knows today. Using the view would mean a week 3
 * edition showed week 8 standings.
 *
 * Throws on any failure. An admin about to publish must see the error rather
 * than an empty edition that looks like a quiet week.
 */

/** A season slug is derived from the name the same way team slugs are. */
const toSeasonSlug = (seasonName: string): string => toTeamSlug(seasonName);

const fetchWeekStandings = async (
  seasonId: string,
  weekNumber: number
): Promise<SnapshotStandingsInput[]> => {
  const { data: snapshots, error } = await supabase
    .from('power_score_snapshots')
    .select('team_id, division_id, power_score, match_wins, match_losses, game_wins, game_losses')
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber);

  if (error) handleDatabaseError(error, 'Failed to fetch the standings for that week');
  if (!snapshots || snapshots.length === 0) return [];

  const [teamDetailsResult, divisionsResult] = await Promise.all([
    supabase
      .from('v_team_details')
      .select('team_id, name, logo_url, image_url')
      .in(
        'team_id',
        snapshots.map((s) => s.team_id)
      ),
    supabase.from('divisions').select('id, name, display_division'),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(teamDetailsResult.error, 'Failed to fetch teams for the standings');
  }
  if (divisionsResult.error) {
    handleDatabaseError(divisionsResult.error, 'Failed to fetch divisions for the standings');
  }

  const teamsById = new Map((teamDetailsResult.data ?? []).map((t) => [t.team_id, t]));
  // Hidden is the repo-wide "not part of the league any more" marker, so those
  // teams are left out of a published graphic entirely.
  const visibleDivisions = new Map(
    (divisionsResult.data ?? [])
      .filter((d) => d.display_division !== 'Hidden')
      .map((d) => [d.id, d.display_division ?? d.name])
  );

  return snapshots
    .filter((s) => s.division_id !== null && visibleDivisions.has(s.division_id))
    .map((s) => {
      const team = teamsById.get(s.team_id);
      return {
        teamId: s.team_id,
        teamName: team?.name ?? 'Unknown',
        logoUrl: team?.image_url ?? team?.logo_url ?? null,
        divisionId: s.division_id,
        divisionName: s.division_id ? (visibleDivisions.get(s.division_id) ?? null) : null,
        wins: s.match_wins,
        losses: s.match_losses,
        gameWins: s.game_wins,
        gameLosses: s.game_losses,
        powerScore: s.power_score,
      };
    });
};

/**
 * How many matches in the week still have no result. Shown before publishing so
 * a half-scored night is not announced as a finished one.
 */
const countUnresolvedMatches = async (
  seasonId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> => {
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('season_id', seasonId)
    .is('bracket_id', null)
    .not('iscompleted', 'is', true)
    .gte('date', weekStart.toISOString())
    .lt('date', weekEnd.toISOString());

  if (error) handleDatabaseError(error, 'Failed to check for unplayed matches');
  return count ?? 0;
};

export const fetchRecapFacts = async (
  seasonId: string,
  weekNumber: number
): Promise<RecapFactsV1> => {
  const { data: season, error } = await supabase
    .from('seasons')
    .select('id, name, start_date')
    .eq('id', seasonId)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to fetch the season');
  const found = ensureFound(season, 'Season', seasonId);

  const { weekStart, weekEnd } = getWeekWindow(found.start_date, weekNumber);

  const [recap, trends, standings, unresolvedMatchCount] = await Promise.all([
    WeeklyRecapService.fetchRecapForWeek({
      seasonId,
      weekNumber,
      seasonStartDate: found.start_date,
    }),
    fetchPowerScoreTrendsForWeek(seasonId, weekNumber),
    fetchWeekStandings(seasonId, weekNumber),
    countUnresolvedMatches(seasonId, weekStart, weekEnd),
  ]);

  return buildRecapFacts({
    seasonId,
    seasonName: found.name,
    seasonSlug: toSeasonSlug(found.name),
    weekNumber,
    weekStart,
    weekEnd,
    recap,
    trends,
    standings,
    unresolvedMatchCount,
  });
};
