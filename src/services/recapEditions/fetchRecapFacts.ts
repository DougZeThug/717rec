import { supabase } from '@/integrations/supabase/client';
import { fetchPowerScoreTrendsForWeek } from '@/services/rankings/weeklyTrendsForWeek';
import { WeeklyRecapService } from '@/services/weeklyRecap/WeeklyRecapService';
import { getWeekWindow } from '@/services/weeklyRecap/weekWindow';
import type { Match } from '@/types';
import type { RecapFactsV1 } from '@/types/recapEdition';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import type { LeagueTeamMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';
import { calculateLeagueMatchStats } from '@/utils/teamDetailsUtils/leagueMatchStats';
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
    .select(
      'team_id, division_id, power_score, sos, match_wins, match_losses, game_wins, game_losses'
    )
    .eq('season_id', seasonId)
    .eq('week_number', weekNumber);

  if (error) handleDatabaseError(error, 'Failed to fetch the standings for that week');
  if (!snapshots || snapshots.length === 0) return [];

  const [teamDetailsResult, divisionsResult] = await Promise.all([
    supabase
      .from('v_team_details')
      .select('team_id, name, logo_url, image_url, division_id')
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
    .filter((s) => {
      // Gate on the team's division TODAY, exactly as weeklyTrendsForWeek does.
      // Reading it off the snapshot instead let a team moved to Hidden after
      // the week ended keep its rank and grade here while the movers half of
      // the same recap dropped it -- one frozen edition disagreeing with
      // itself about who is in the league.
      const current = teamsById.get(s.team_id)?.division_id;
      return current != null && visibleDivisions.has(current);
    })
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
        sos: s.sos,
      };
    });
};

/**
 * Sweep rate and clutch record for every team, from every completed match up to
 * the END of the week being graded.
 *
 * The upper bound is the whole point. Without it a week 3 edition would be
 * graded on week 8 form — the same trap `fetchHotStreaks` already takes an
 * `asOf` to avoid.
 */
const fetchWeekMatchStats = async (
  seasonId: string,
  weekEnd: Date
): Promise<Map<string, LeagueTeamMatchStats>> => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, winner_id, loser_id, team1_game_wins, team2_game_wins, iscompleted'
    )
    .eq('season_id', seasonId)
    .eq('iscompleted', true)
    .is('bracket_id', null)
    .lt('date', weekEnd.toISOString());

  if (error) handleDatabaseError(error, 'Failed to fetch matches for the weekly grades');

  const matches = (data ?? []).map(
    (m) =>
      ({
        id: m.id,
        team1Id: m.team1_id,
        team2Id: m.team2_id,
        winnerId: m.winner_id,
        loserId: m.loser_id,
        team1_game_wins: m.team1_game_wins,
        team2_game_wins: m.team2_game_wins,
        iscompleted: m.iscompleted,
      }) as Match
  );

  return calculateLeagueMatchStats(matches);
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

  const [recap, trends, standings, unresolvedMatchCount, matchStats] = await Promise.all([
    WeeklyRecapService.fetchRecapForWeek({
      seasonId,
      weekNumber,
      seasonStartDate: found.start_date,
    }),
    fetchPowerScoreTrendsForWeek(seasonId, weekNumber),
    fetchWeekStandings(seasonId, weekNumber),
    countUnresolvedMatches(seasonId, weekStart, weekEnd),
    fetchWeekMatchStats(seasonId, weekEnd),
  ]);

  // Rank movement needs the week the power scores were actually compared
  // against, which is not always weekNumber - 1: a week with no snapshot makes
  // that `basis: 'gap'` and `previousWeek` names the week really used. Null
  // means there is nothing earlier to compare with, and no arrows are shown.
  const previousStandings =
    trends.previousWeek === null ? null : await fetchWeekStandings(seasonId, trends.previousWeek);

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
    previousStandings,
    matchStats,
    unresolvedMatchCount,
  });
};
