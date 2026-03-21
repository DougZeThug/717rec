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

/** Minimum power-score gap (0–100 scale) for a result to count as an upset */
const UPSET_POWER_SCORE_THRESHOLD = 5;

/** Minimum consecutive wins to appear in Hot Streaks section */
const MIN_STREAK_COUNT = 3;

/**
 * Fetches auto-generated weekly recap data: upsets and hot streaks.
 * Swallows errors and returns empty state on failure to avoid breaking the homepage.
 */
export const WeeklyRecapService = {
  fetchWeeklyRecap: async (): Promise<WeeklyRecapData> => {
    try {
      // 1. Get active season
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!activeSeason) {
        return { weekNumber: null, upsets: [], hotStreaks: [], hasData: false };
      }

      const seasonId = activeSeason.id;

      // 2. Get the latest week number from power_score_snapshots
      const { data: latestWeekRow } = await supabase
        .from('power_score_snapshots')
        .select('week_number')
        .eq('season_id', seasonId)
        .order('week_number', { ascending: false })
        .limit(1)
        .single();

      const weekNumber = latestWeekRow?.week_number ?? null;

      // 3. Fetch upsets and match history in parallel
      const [upsetsResult, matchHistoryResult] = await Promise.all([
        weekNumber !== null
          ? _fetchUpsets(seasonId, weekNumber)
          : Promise.resolve<WeeklyUpset[]>([]),
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

  // Get power scores and info for those teams
  const { data: teamDetails, error: teamError } = await supabase
    .from('v_team_details')
    .select('team_id, name, logo_url, image_url, power_score')
    .in('team_id', teamIds);

  if (teamError) {
    handleDatabaseError(teamError, 'Failed to fetch team details for upset detection');
  }

  if (!teamDetails) return [];

  const teamMap = new Map(teamDetails.map((t) => [t.team_id, t]));

  const upsets: WeeklyUpset[] = [];

  for (const match of matches) {
    const winner = teamMap.get(match.winner_id);
    const loser = teamMap.get(match.loser_id);

    if (!winner || !loser) continue;

    const winnerScore = (winner.power_score ?? 0) * 100;
    const loserScore = (loser.power_score ?? 0) * 100;
    const gap = loserScore - winnerScore;

    if (gap < UPSET_POWER_SCORE_THRESHOLD) continue;

    // Build score string like "21–15"
    const isWinnerTeam1 = match.winner_id === match.team1_id;
    const winnerRaw = isWinnerTeam1 ? match.team1_score : match.team2_score;
    const loserRaw = isWinnerTeam1 ? match.team2_score : match.team1_score;
    const matchResult =
      winnerRaw != null && loserRaw != null ? `${winnerRaw}–${loserRaw}` : '';

    upsets.push({
      winnerId: match.winner_id,
      winnerName: winner.name,
      winnerLogoUrl: winner.image_url ?? winner.logo_url ?? undefined,
      winnerPowerScore: winnerScore,
      loserId: match.loser_id,
      loserName: loser.name,
      loserLogoUrl: loser.image_url ?? loser.logo_url ?? undefined,
      loserPowerScore: loserScore,
      powerScoreGap: gap,
      matchResult,
      weekNumber,
    });
  }

  // Sort by biggest gap first, return top 2
  return upsets.sort((a, b) => b.powerScoreGap - a.powerScoreGap).slice(0, 2);
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
