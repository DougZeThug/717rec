import { CareerMatchStatsResult, MatchData, PlayoffMatchData, SeasonStats } from './types';

interface CareerMatchStatsInput {
  seasonStats: SeasonStats[] | null;
  currentMatches: MatchData[] | null;
  teamId: string;
  currentSeasonId?: string | null;
  playoffMatches?: PlayoffMatchData[] | null;
  bracketSeasonMap?: Record<string, string>;
}

type SeasonStatKey = 'match_wins' | 'match_losses' | 'game_wins' | 'game_losses';

/** Sums one field across season rows. Missing rows and null values count as 0. */
const sumSeasonStat = (stats: SeasonStats[] | null | undefined, key: SeasonStatKey): number =>
  stats?.reduce((sum, stat) => sum + (stat[key] || 0), 0) || 0;

/**
 * Adds one match to the running totals. It counts only when the team is the
 * winner or the loser. Regular matches pass game wins; playoff matches pass scores.
 */
const addMatchResult = (
  totals: CareerMatchStatsResult,
  teamId: string,
  match: { winner_id: string | null; loser_id: string | null; team1_id: string | null },
  team1Games: number | null,
  team2Games: number | null
): void => {
  if (match.winner_id === teamId) totals.career_match_wins++;
  else if (match.loser_id === teamId) totals.career_match_losses++;
  else return;

  const isTeam1 = match.team1_id === teamId;
  totals.career_game_wins += (isTeam1 ? team1Games : team2Games) || 0;
  totals.career_game_losses += (isTeam1 ? team2Games : team1Games) || 0;
};

/** Playoff matches count only when they finished in the current season. */
const isCurrentSeasonPlayoffMatch = (
  match: PlayoffMatchData,
  currentSeasonId: string,
  bracketSeasonMap: Record<string, string>
): boolean => {
  const bracketSeasonId = match.bracket_id ? bracketSeasonMap[match.bracket_id] : null;
  return bracketSeasonId === currentSeasonId && !!match.winner_id;
};

/**
 * Calculates career match and game statistics for a team.
 * Aggregates historical season stats + current season matches.
 *
 * IMPORTANT: To avoid double-counting, we exclude the current active season
 * from seasonStats (since currentMatches already contains those matches).
 */
export const calculateCareerMatchStats = ({
  seasonStats,
  currentMatches,
  teamId,
  currentSeasonId,
  playoffMatches,
  bracketSeasonMap,
}: CareerMatchStatsInput): CareerMatchStatsResult => {
  // Filter out current season from historical stats to avoid double-counting
  // (current season matches are counted separately from the matches table)
  const historicalStats = currentSeasonId
    ? seasonStats?.filter((stat) => stat.season_id !== currentSeasonId)
    : seasonStats;

  // Start with historical season stats (excluding current season)
  const totals: CareerMatchStatsResult = {
    career_match_wins: sumSeasonStat(historicalStats, 'match_wins'),
    career_match_losses: sumSeasonStat(historicalStats, 'match_losses'),
    career_game_wins: sumSeasonStat(historicalStats, 'game_wins'),
    career_game_losses: sumSeasonStat(historicalStats, 'game_losses'),
  };

  // Add current season matches
  for (const match of currentMatches ?? []) {
    addMatchResult(totals, teamId, match, match.team1_game_wins, match.team2_game_wins);
  }

  // Add current-season playoff matches (historical ones are already in seasonStats)
  if (playoffMatches && currentSeasonId && bracketSeasonMap) {
    for (const match of playoffMatches) {
      if (!isCurrentSeasonPlayoffMatch(match, currentSeasonId, bracketSeasonMap)) continue;
      addMatchResult(totals, teamId, match, match.team1_score, match.team2_score);
    }
  }

  return totals;
};
