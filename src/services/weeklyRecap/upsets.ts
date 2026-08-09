import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

import type { WeeklyUpset } from './types';

export async function fetchUpsets(
  seasonId: string,
  weekStart: Date,
  weekEnd: Date,
  weekNumber: number
): Promise<WeeklyUpset[]> {
  // Get completed regular-season matches within the week's date window
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, winner_id, loser_id, team1_score, team2_score, team1_game_wins, team2_game_wins'
    )
    .eq('season_id', seasonId)
    .eq('iscompleted', true)
    .is('bracket_id', null)
    .not('winner_id', 'is', null)
    .gte('date', weekStart.toISOString())
    .lt('date', weekEnd.toISOString());

  if (matchError) {
    handleDatabaseError(matchError, 'Failed to fetch matches for upset detection');
  }

  if (!matches || matches.length === 0) return [];

  // Collect all team IDs involved
  const teamIds = [...new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]))].filter(
    (id): id is string => id !== null
  );

  // Fetch team info (name/logo/division), career stats, and visible divisions in parallel
  const [teamDetailsResult, careerStatsResult, visibleDivisionsResult] = await Promise.all([
    supabase
      .from('v_team_details')
      .select('team_id, name, logo_url, image_url, division_id')
      .in('team_id', teamIds),
    supabase
      .from('team_season_stats')
      .select('team_id, power_score')
      .in('team_id', teamIds)
      .not('power_score', 'is', null),
    // Hidden divisions are excluded from the frontend, same rule fetchHotStreaks applies
    supabase.from('divisions').select('id').neq('display_division', 'Hidden'),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(
      teamDetailsResult.error,
      'Failed to fetch team details for upset detection'
    );
  }
  if (careerStatsResult.error) {
    handleDatabaseError(
      careerStatsResult.error,
      'Failed to fetch career stats for upset detection'
    );
  }
  // Must surface: an empty visible-division set silently filters out every upset
  if (visibleDivisionsResult.error) {
    handleDatabaseError(
      visibleDivisionsResult.error,
      'Failed to fetch visible divisions for upset detection'
    );
  }

  if (!teamDetailsResult.data || !careerStatsResult.data) return [];

  // Build career power score map: average all seasons per team (0-1 → 0-100)
  const careerScoreAccum = new Map<string, { sum: number; count: number }>();
  for (const row of careerStatsResult.data) {
    const entry = careerScoreAccum.get(row.team_id) ?? { sum: 0, count: 0 };
    entry.sum += row.power_score ?? 0;
    entry.count += 1;
    careerScoreAccum.set(row.team_id, entry);
  }
  const careerScoreMap = new Map(
    [...careerScoreAccum.entries()].map(([teamId, { sum, count }]) => [teamId, (sum / count) * 100])
  );

  const teamInfoMap = new Map(teamDetailsResult.data.map((t) => [t.team_id, t]));
  const visibleDivisionIds = new Set(visibleDivisionsResult.data?.map((d) => d.id) ?? []);
  const isVisible = (divisionId: string | null | undefined): boolean =>
    !!divisionId && visibleDivisionIds.has(divisionId);

  // Build a single upset record for a match, or null if it doesn't qualify.
  // Extracted so the surrounding fetch/aggregation stays low-complexity.
  const buildUpset = (match: (typeof matches)[number]): WeeklyUpset | null => {
    if (!match.winner_id || !match.loser_id) return null;
    const winnerInfo = teamInfoMap.get(match.winner_id);
    const loserInfo = teamInfoMap.get(match.loser_id);
    if (!winnerInfo || !loserInfo) return null;
    // Skip matches involving a team an admin has moved to a hidden division
    if (!isVisible(winnerInfo.division_id) || !isVisible(loserInfo.division_id)) return null;

    const winnerScore = careerScoreMap.get(match.winner_id) ?? 0;
    const loserScore = careerScoreMap.get(match.loser_id) ?? 0;
    // Skip if either team has no career history to compare
    if (winnerScore === 0 || loserScore === 0) return null;

    const gap = loserScore - winnerScore;
    // Only count as upset if winner had lower career power score
    if (gap <= 0) return null;

    // Build score string like "21–15"
    const isWinnerTeam1 = match.winner_id === match.team1_id;
    const winnerGameWins = isWinnerTeam1 ? match.team1_game_wins : match.team2_game_wins;
    const loserGameWins = isWinnerTeam1 ? match.team2_game_wins : match.team1_game_wins;
    const matchResult =
      winnerGameWins != null && loserGameWins != null ? `${winnerGameWins}–${loserGameWins}` : '';

    return {
      winnerId: match.winner_id,
      winnerName: winnerInfo.name ?? '',
      winnerLogoUrl: winnerInfo.image_url ?? winnerInfo.logo_url ?? undefined,
      winnerPowerScore: winnerScore,
      loserId: match.loser_id,
      loserName: loserInfo.name ?? '',
      loserLogoUrl: loserInfo.image_url ?? loserInfo.logo_url ?? undefined,
      loserPowerScore: loserScore,
      powerScoreGap: gap,
      matchResult,
      weekNumber,
    };
  };

  const upsets = matches.map(buildUpset).filter((u): u is WeeklyUpset => u !== null);

  // Sort by biggest gap first, return top 2
  return upsets.sort((a, b) => b.powerScoreGap - a.powerScoreGap).slice(0, 3);
}
