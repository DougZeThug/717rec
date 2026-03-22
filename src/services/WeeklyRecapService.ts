import { supabase } from '@/integrations/supabase/client';
import { calculateStreak } from '@/utils/rankingUtils/calculateStreak';
import { handleDatabaseError } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

export interface WeeklyUpset {
  winnerId: string;
  winnerName: string;
  winnerLogoUrl?: string;
  winnerPowerScore: number;
  loserId: string;
  loserName: string;
  loserLogoUrl?: string;
  loserPowerScore: number;
  /** loserPowerScore - winnerPowerScore on 0–100 scale */
  powerScoreGap: number;
  /** e.g. "21–15" */
  matchResult: string;
  weekNumber: number;
}

export interface TeamStreakInfo {
  teamId: string;
  teamName: string;
  logoUrl?: string;
  division: string;
  streak: string;
  streakCount: number;
}

export interface WeeklyRecapData {
  weekNumber: number | null;
  upsets: WeeklyUpset[];
  hotStreaks: TeamStreakInfo[];
  hasData: boolean;
}

/** Number of upsets to return */

/** Minimum consecutive wins to appear in Hot Streaks section */
const MIN_STREAK_COUNT = 3;

/**
 * Fetches auto-generated weekly recap data: upsets and hot streaks.
 * Swallows errors and returns empty state on failure to avoid breaking the homepage.
 */
export const WeeklyRecapService = {
  fetchWeeklyRecap: async (): Promise<WeeklyRecapData> => {
    try {
      // 1. Get active season with start_date
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id, start_date')
        .eq('is_active', true)
        .single();

      if (!activeSeason) {
        return { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };
      }

      const seasonId = activeSeason.id;
      const seasonStart = new Date(activeSeason.start_date);

      // 2. Find the most recent match date from completed regular-season matches
      const { data: latestMatchRow } = await supabase
        .from('matches')
        .select('date')
        .eq('season_id', seasonId)
        .eq('iscompleted', true)
        .is('bracket_id', null)
        .not('winner_id', 'is', null)
        .not('date', 'is', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!latestMatchRow?.date) {
        // No completed matches with dates — still fetch hot streaks
        const hotStreaks = await _fetchHotStreaks(seasonId);
        return { weekNumber: null, upsets: [], hotStreaks, hasData: hotStreaks.length > 0 };
      }

      // 3. Calculate week number from season start_date (same logic as useSeasonWeek)
      const latestMatchDate = new Date(latestMatchRow.date);
      const diffMs = latestMatchDate.getTime() - seasonStart.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);

      // 4. Compute the date window for this week
      const weekStartMs = seasonStart.getTime() + (weekNumber - 1) * 7 * 24 * 60 * 60 * 1000;
      const weekStart = new Date(weekStartMs);
      const weekEnd = new Date(weekStartMs + 7 * 24 * 60 * 60 * 1000);

      // 5. Fetch upsets and hot streaks in parallel
      const [upsetsResult, matchHistoryResult] = await Promise.all([
        _fetchUpsets(seasonId, weekStart, weekEnd, weekNumber),
        _fetchHotStreaks(seasonId),
      ]);

      const hasData = upsetsResult.length > 0 || matchHistoryResult.length > 0;

      return {
        weekNumber,
        upsets: upsetsResult,
        hotStreaks: matchHistoryResult,
        hasData,
      };
    } catch (err) {
      warnLog('WeeklyRecapService: failed to fetch weekly recap', err);
      return { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };
    }
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function _fetchUpsets(seasonId: string, weekNumber: number): Promise<WeeklyUpset[]> {
  // Get completed regular-season matches for the current week
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, winner_id, loser_id, team1_score, team2_score, round_number'
    )
    .eq('season_id', seasonId)
    .eq('round_number', weekNumber)
    .eq('iscompleted', true)
    .is('bracket_id', null)
    .not('winner_id', 'is', null);

  if (matchError) {
    handleDatabaseError(matchError, 'Failed to fetch matches for upset detection');
  }

  if (!matches || matches.length === 0) return [];

  // Collect all team IDs involved
  const teamIds = [...new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]))];

  // Fetch team info (name/logo) and career stats in parallel
  const [teamDetailsResult, careerStatsResult] = await Promise.all([
    supabase
      .from('v_team_details')
      .select('team_id, name, logo_url, image_url')
      .in('team_id', teamIds),
    supabase
      .from('team_season_stats')
      .select('team_id, power_score')
      .in('team_id', teamIds)
      .not('power_score', 'is', null),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(teamDetailsResult.error, 'Failed to fetch team details for upset detection');
  }
  if (careerStatsResult.error) {
    handleDatabaseError(careerStatsResult.error, 'Failed to fetch career stats for upset detection');
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
    [...careerScoreAccum.entries()].map(([teamId, { sum, count }]) => [
      teamId,
      (sum / count) * 100,
    ])
  );

  const teamInfoMap = new Map(teamDetailsResult.data.map((t) => [t.team_id, t]));

  const upsets: WeeklyUpset[] = [];

  for (const match of matches) {
    const winnerInfo = teamInfoMap.get(match.winner_id);
    const loserInfo = teamInfoMap.get(match.loser_id);

    if (!winnerInfo || !loserInfo) continue;

    const winnerScore = careerScoreMap.get(match.winner_id) ?? 0;
    const loserScore = careerScoreMap.get(match.loser_id) ?? 0;

    // Skip if either team has no career history to compare
    if (winnerScore === 0 || loserScore === 0) continue;

    const gap = loserScore - winnerScore;

    // Only count as upset if winner had lower career power score
    if (gap <= 0) continue;

    // Build score string like "21–15"
    const isWinnerTeam1 = match.winner_id === match.team1_id;
    const winnerRaw = isWinnerTeam1 ? match.team1_score : match.team2_score;
    const loserRaw = isWinnerTeam1 ? match.team2_score : match.team1_score;
    const matchResult =
      winnerRaw != null && loserRaw != null ? `${winnerRaw}–${loserRaw}` : '';

    upsets.push({
      winnerId: match.winner_id,
      winnerName: winnerInfo.name,
      winnerLogoUrl: winnerInfo.image_url ?? winnerInfo.logo_url ?? undefined,
      winnerPowerScore: winnerScore,
      loserId: match.loser_id,
      loserName: loserInfo.name,
      loserLogoUrl: loserInfo.image_url ?? loserInfo.logo_url ?? undefined,
      loserPowerScore: loserScore,
      powerScoreGap: gap,
      matchResult,
      weekNumber,
    });
  }

  // Sort by biggest gap first, return top 2
  return upsets.sort((a, b) => b.powerScoreGap - a.powerScoreGap).slice(0, 3);
}

async function _fetchHotStreaks(seasonId: string): Promise<TeamStreakInfo[]> {
  // Get all completed regular-season matches for the season
  const { data: allMatches, error: matchError } = await supabase
    .from('matches')
    .select('id, team1_id, team2_id, winner_id, loser_id, date, iscompleted, round_number')
    .eq('season_id', seasonId)
    .eq('iscompleted', true)
    .is('bracket_id', null)
    .order('date', { ascending: true });

  if (matchError) {
    handleDatabaseError(matchError, 'Failed to fetch matches for streak calculation');
  }

  if (!allMatches || allMatches.length === 0) return [];

  // Map to the shape calculateStreak() expects
  const matchesForStreak = allMatches.map((m) => ({
    id: m.id,
    team1Id: m.team1_id,
    team2Id: m.team2_id,
    winnerId: m.winner_id,
    loserId: m.loser_id,
    date: m.date,
    iscompleted: m.iscompleted,
    roundNumber: m.round_number,
  }));

  // Find unique team IDs
  const teamIds = [
    ...new Set(allMatches.flatMap((m) => [m.team1_id, m.team2_id])),
  ];

  // Get team details for all participating teams
  const { data: teamDetails, error: teamError } = await supabase
    .from('v_team_details')
    .select('team_id, name, logo_url, image_url, divisionname, division_id')
    .in('team_id', teamIds);

  if (teamError) {
    handleDatabaseError(teamError, 'Failed to fetch team details for streak display');
  }

  if (!teamDetails) return [];

  // Get visible divisions to exclude hidden ones
  const { data: visibleDivisions } = await supabase
    .from('divisions')
    .select('id')
    .neq('display_division', 'Hidden');

  const visibleDivisionIds = new Set(visibleDivisions?.map((d) => d.id) ?? []);

  const teamMap = new Map(teamDetails.map((t) => [t.team_id, t]));

  const streaks: TeamStreakInfo[] = [];

  for (const teamId of teamIds) {
    const team = teamMap.get(teamId);
    if (!team || !visibleDivisionIds.has(team.division_id)) continue;

    const streak = calculateStreak(teamId, matchesForStreak as Parameters<typeof calculateStreak>[1]);
    if (!streak) continue;

    // Only show win streaks (W prefix) meeting minimum threshold
    if (!streak.startsWith('W')) continue;

    const streakCount = parseInt(streak.slice(1), 10);
    if (isNaN(streakCount) || streakCount < MIN_STREAK_COUNT) continue;

    streaks.push({
      teamId,
      teamName: team.name,
      logoUrl: team.image_url ?? team.logo_url ?? undefined,
      division: team.divisionname ?? 'Unknown',
      streak,
      streakCount,
    });
  }

  // Sort by streak length descending, return top 5
  return streaks.sort((a, b) => b.streakCount - a.streakCount).slice(0, 5);
}
