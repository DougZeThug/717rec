import { supabase } from '@/integrations/supabase/client';
import type { SeasonPlayoffMatch } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { handleDatabaseError } from '@/utils/errorHandler';

import type { WeeklyUpset } from './types';

/**
 * The minimum a match needs for upset detection, so regular-season rows and
 * playoff rows can share one code path.
 */
interface UpsetCandidate {
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  team1GameWins: number | null;
  team2GameWins: number | null;
}

/**
 * Where the week's upsets come from. During the regular season that is a date
 * window; once the bracket is running it is the season's playoff matches, which
 * have no dates to window on.
 */
export type UpsetSource =
  | { mode: 'regular'; weekStart: Date; weekEnd: Date; weekNumber: number }
  | { mode: 'playoffs'; matches: SeasonPlayoffMatch[] };

const toPlayoffCandidates = (matches: SeasonPlayoffMatch[]): UpsetCandidate[] =>
  matches.map((m) => ({
    team1Id: m.team1Id,
    team2Id: m.team2Id,
    winnerId: m.winnerId,
    loserId: m.loserId,
    team1GameWins: m.team1GameWins,
    team2GameWins: m.team2GameWins,
  }));

export async function fetchUpsets(seasonId: string, source: UpsetSource): Promise<WeeklyUpset[]> {
  const weekNumber = source.mode === 'regular' ? source.weekNumber : null;
  let candidates: UpsetCandidate[];

  if (source.mode === 'playoffs') {
    candidates = toPlayoffCandidates(source.matches);
  } else {
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
      .gte('date', source.weekStart.toISOString())
      .lt('date', source.weekEnd.toISOString());

    if (matchError) {
      handleDatabaseError(matchError, 'Failed to fetch matches for upset detection');
    }

    candidates = (matches ?? []).map((m) => ({
      team1Id: m.team1_id,
      team2Id: m.team2_id,
      winnerId: m.winner_id,
      loserId: m.loser_id,
      team1GameWins: m.team1_game_wins,
      team2GameWins: m.team2_game_wins,
    }));
  }

  if (candidates.length === 0) return [];

  // Collect all team IDs involved
  const teamIds = [...new Set(candidates.flatMap((m) => [m.team1Id, m.team2Id]))].filter(
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
  const buildUpset = (match: UpsetCandidate): WeeklyUpset | null => {
    if (!match.winnerId || !match.loserId) return null;
    const winnerInfo = teamInfoMap.get(match.winnerId);
    const loserInfo = teamInfoMap.get(match.loserId);
    if (!winnerInfo || !loserInfo) return null;
    // Skip matches involving a team an admin has moved to a hidden division
    if (!isVisible(winnerInfo.division_id) || !isVisible(loserInfo.division_id)) return null;

    const winnerScore = careerScoreMap.get(match.winnerId) ?? 0;
    const loserScore = careerScoreMap.get(match.loserId) ?? 0;
    // Skip if either team has no career history to compare
    if (winnerScore === 0 || loserScore === 0) return null;

    const gap = loserScore - winnerScore;
    // Only count as upset if winner had lower career power score
    if (gap <= 0) return null;

    // Build score string like "21–15"
    const isWinnerTeam1 = match.winnerId === match.team1Id;
    const winnerGameWins = isWinnerTeam1 ? match.team1GameWins : match.team2GameWins;
    const loserGameWins = isWinnerTeam1 ? match.team2GameWins : match.team1GameWins;
    const matchResult =
      winnerGameWins != null && loserGameWins != null ? `${winnerGameWins}–${loserGameWins}` : '';

    return {
      winnerId: match.winnerId,
      winnerName: winnerInfo.name ?? '',
      winnerLogoUrl: winnerInfo.image_url ?? winnerInfo.logo_url ?? undefined,
      winnerPowerScore: winnerScore,
      loserId: match.loserId,
      loserName: loserInfo.name ?? '',
      loserLogoUrl: loserInfo.image_url ?? loserInfo.logo_url ?? undefined,
      loserPowerScore: loserScore,
      powerScoreGap: gap,
      matchResult,
      weekNumber,
    };
  };

  const upsets = candidates.map(buildUpset).filter((u): u is WeeklyUpset => u !== null);

  // Sort by biggest gap first, return top 2
  return upsets.sort((a, b) => b.powerScoreGap - a.powerScoreGap).slice(0, 3);
}
