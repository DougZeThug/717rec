import { supabase } from '@/integrations/supabase/client';
import type { SeasonPlayoffMatch } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { handleDatabaseError } from '@/utils/errorHandler';
import { isUpset, predictMatch } from '@/utils/predictions';

import type { WeeklyUpset } from './types';
import {
  fetchUpsetPredictionInputs,
  h2hKey,
  type PredictionTeamRow,
  toHeadToHeadStats,
} from './upsetPrediction';

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

  // Fetch team info (name/logo/division plus the model's inputs) and visible
  // divisions in parallel
  const [teamDetailsResult, visibleDivisionsResult] = await Promise.all([
    supabase
      .from('v_team_details')
      .select(
        'team_id, name, logo_url, image_url, division_id, power_score, sos, career_power_score, wins, losses'
      )
      .in('team_id', teamIds),
    // Hidden divisions are excluded from the frontend, same rule fetchHotStreaks applies
    supabase.from('divisions').select('id').neq('display_division', 'Hidden'),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(
      teamDetailsResult.error,
      'Failed to fetch team details for upset detection'
    );
  }
  // Must surface: an empty visible-division set silently filters out every upset
  if (visibleDivisionsResult.error) {
    handleDatabaseError(
      visibleDivisionsResult.error,
      'Failed to fetch visible divisions for upset detection'
    );
  }

  if (!teamDetailsResult.data) return [];

  const teamInfoMap = new Map(teamDetailsResult.data.map((t) => [t.team_id, t]));
  const visibleDivisionIds = new Set(visibleDivisionsResult.data?.map((d) => d.id) ?? []);
  const isVisible = (divisionId: string | null | undefined): boolean =>
    divisionId != null && visibleDivisionIds.has(divisionId);

  // Everything predictMatch needs, fetched once for the whole week rather than
  // per match. Same sources useMatchPrediction reads on the schedule page.
  const pairs = candidates
    .filter((m): m is UpsetCandidate & { team1Id: string; team2Id: string } =>
      Boolean(m.team1Id && m.team2Id)
    )
    .map((m) => ({ team1: m.team1Id, team2: m.team2Id }));

  const { teamStats, divisionWeights, headToHead } = await fetchUpsetPredictionInputs(
    teamDetailsResult.data as PredictionTeamRow[],
    pairs
  );

  // Build a single upset record for a match, or null if it doesn't qualify.
  // Extracted so the surrounding fetch/aggregation stays low-complexity.
  const buildUpset = (match: UpsetCandidate): WeeklyUpset | null => {
    if (!match.winnerId || !match.loserId || !match.team1Id || !match.team2Id) return null;
    const winnerInfo = teamInfoMap.get(match.winnerId);
    const loserInfo = teamInfoMap.get(match.loserId);
    if (!winnerInfo || !loserInfo) return null;
    // Skip matches involving a team an admin has moved to a hidden division
    if (!isVisible(winnerInfo.division_id) || !isVisible(loserInfo.division_id)) return null;

    const team1Stats = teamStats.get(match.team1Id);
    const team2Stats = teamStats.get(match.team2Id);
    if (!team1Stats || !team2Stats) return null;

    const prediction = predictMatch(
      team1Stats,
      team2Stats,
      divisionWeights,
      teamInfoMap.get(match.team1Id)?.name ?? '',
      teamInfoMap.get(match.team2Id)?.name ?? '',
      toHeadToHeadStats(headToHead.get(h2hKey(match.team1Id, match.team2Id)))
    );

    const winnerProbability =
      match.winnerId === match.team1Id ? prediction.probA : prediction.probB;

    // The same threshold and the same model the schedule's UpsetTag applies.
    if (!isUpset(winnerProbability)) return null;

    const winnerScore = winnerInfo.power_score ?? 0;
    const loserScore = loserInfo.power_score ?? 0;

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
      powerScoreGap: loserScore - winnerScore,
      winnerProbability,
      matchResult,
      weekNumber,
    };
  };

  const upsets = candidates.map(buildUpset).filter((u): u is WeeklyUpset => u !== null);

  // Longest odds first, and keep the top three.
  return upsets.sort((a, b) => a.winnerProbability - b.winnerProbability).slice(0, 3);
}
