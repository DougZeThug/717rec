import { DivisionSeasonRecord, SeasonBreakdown } from '@/types/teamAdvancedStats';

import type { MatchRecord, PlayoffMatchRecord } from './types';

type DivisionTier = 'competitive' | 'intermediate' | 'recreational';
type DivisionRecords = Record<DivisionTier, DivisionSeasonRecord>;
type MatchOutcome = 'win' | 'loss' | 'other';

interface ScoreContext {
  teamScore: number;
  opponentScore: number;
  outcome: MatchOutcome;
}

interface MatchCounters {
  sweeps: number;
  closeWins: number;
  closeLosses: number;
  playoffWins: number;
  playoffLosses: number;
}

/** Maps a division display name to the tier buckets used in season breakdown stats. */
export const categorizeDivision = (divisionName: string | null): DivisionTier | null => {
  if (!divisionName) return null;
  const name = divisionName.toLowerCase();
  if (name.includes('competitive') || name.includes('hidden')) return 'competitive';
  if (name.includes('intermediate') || name === 'cuspers') return 'intermediate';
  if (name.includes('recreational')) return 'recreational';
  return null;
};

/** Creates a zeroed record for one division tier. */
export const createEmptyDivisionRecord = (): DivisionSeasonRecord => ({
  wins: 0,
  losses: 0,
  gameWins: 0,
  gameLosses: 0,
});

/** Returns a match win rate, or -1 when no matches were played. */
const getWinRate = (record: { wins: number; losses: number }) => {
  const total = record.wins + record.losses;
  return total > 0 ? record.wins / total : -1;
};

/** Builds zeroed division records for all supported season breakdown tiers. */
const createEmptyDivisionRecords = (): DivisionRecords => ({
  competitive: createEmptyDivisionRecord(),
  intermediate: createEmptyDivisionRecord(),
  recreational: createEmptyDivisionRecord(),
});

/** Determines whether the target team won, lost, or did not have a completed result. */
const getMatchOutcome = (
  winnerId: string | null,
  loserId: string | null,
  teamId: string
): MatchOutcome => {
  if (winnerId === teamId) return 'win';
  if (loserId === teamId) return 'loss';
  return 'other';
};

/** Updates sweep and close-match counters from a completed match score. */
const addCloseMatchCounters = (counters: MatchCounters, score: ScoreContext) => {
  if (score.outcome === 'win') {
    if (score.teamScore === 2 && score.opponentScore === 0) counters.sweeps++;
    else if (score.teamScore === 2 && score.opponentScore === 1) counters.closeWins++;
  } else if (score.outcome === 'loss' && score.opponentScore === 2 && score.teamScore === 1) {
    counters.closeLosses++;
  }
};

/** Adds one completed match result into the appropriate division tier record. */
const addDivisionRecord = (
  divisionRecords: DivisionRecords,
  tier: DivisionTier | null,
  score: ScoreContext
) => {
  if (!tier || score.outcome === 'other') return;

  const record = divisionRecords[tier];
  if (score.outcome === 'win') record.wins++;
  else record.losses++;

  record.gameWins += score.teamScore;
  record.gameLosses += score.opponentScore;
};

/** Resolves the target team's game score from a regular season match row. */
const getRegularScoreContext = (match: MatchRecord, teamId: string): ScoreContext => {
  const isTeam1 = match.team1_id === teamId;
  return {
    teamScore: isTeam1 ? match.team1_game_wins || 0 : match.team2_game_wins || 0,
    opponentScore: isTeam1 ? match.team2_game_wins || 0 : match.team1_game_wins || 0,
    outcome: getMatchOutcome(match.winner_id, match.loser_id, teamId),
  };
};

/** Resolves the target team's game score from a playoff match row. */
const getPlayoffScoreContext = (match: PlayoffMatchRecord, teamId: string): ScoreContext => {
  const isTeam1 = match.team1_id === teamId;
  return {
    teamScore: isTeam1 ? match.team1_score || 0 : match.team2_score || 0,
    opponentScore: isTeam1 ? match.team2_score || 0 : match.team1_score || 0,
    outcome: getMatchOutcome(match.winner_id, match.loser_id, teamId),
  };
};

/** Finds the opposing team id for the target team in a regular season match. */
const getRegularOpponentId = (match: MatchRecord, teamId: string) =>
  match.team1_id === teamId ? match.team2_id : match.team1_id;

/** Maps playoff bracket division weight to the corresponding division tier bucket. */
const getPlayoffDivisionTier = (match: PlayoffMatchRecord): DivisionTier => {
  const bracketWeight = match.bracketInfo?.division_weight || 0.85;
  if (bracketWeight >= 0.89) return 'competitive';
  if (bracketWeight >= 0.4) return 'intermediate';
  return 'recreational';
};

/** Processes regular season matches into counters and division records. */
const processRegularSeasonMatches = (
  teamId: string,
  seasonId: string,
  seasonMatches: MatchRecord[],
  teamDivisionMap: Map<string, string>,
  counters: MatchCounters,
  divisionRecords: DivisionRecords
) => {
  for (const match of seasonMatches) {
    const score = getRegularScoreContext(match, teamId);
    addCloseMatchCounters(counters, score);

    const opponentId = getRegularOpponentId(match, teamId);
    const opponentDivision = opponentId ? teamDivisionMap.get(`${opponentId}_${seasonId}`) : null;
    addDivisionRecord(divisionRecords, categorizeDivision(opponentDivision || null), score);
  }
};

/** Processes playoff matches into counters and division records. */
const processPlayoffMatches = (
  teamId: string,
  seasonPlayoffMatches: PlayoffMatchRecord[],
  counters: MatchCounters,
  divisionRecords: DivisionRecords
) => {
  for (const match of seasonPlayoffMatches) {
    const score = getPlayoffScoreContext(match, teamId);
    if (score.outcome === 'win') counters.playoffWins++;
    else if (score.outcome === 'loss') counters.playoffLosses++;

    addCloseMatchCounters(counters, score);
    addDivisionRecord(divisionRecords, getPlayoffDivisionTier(match), score);
  }
};

/** Calculates whether recent power scores are improving, declining, or stable. */
export const calculatePowerScoreTrend = (
  seasonsWithPowerScore: SeasonBreakdown[]
): 'improving' | 'declining' | 'stable' => {
  let powerScoreTrend: 'improving' | 'declining' | 'stable' = 'stable';
  if (seasonsWithPowerScore.length >= 2) {
    const midpoint = Math.floor(seasonsWithPowerScore.length / 2);
    const recentAvg =
      seasonsWithPowerScore.slice(0, midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      midpoint;
    const olderAvg =
      seasonsWithPowerScore.slice(midpoint).reduce((sum, s) => sum + (s.powerScore || 0), 0) /
      (seasonsWithPowerScore.length - midpoint);
    const diff = recentAvg - olderAvg;
    if (diff > 3) powerScoreTrend = 'improving';
    else if (diff < -3) powerScoreTrend = 'declining';
  }
  return powerScoreTrend;
};

/** Finds the team's best and worst division tiers by aggregate match win rate. */
export const calculateBestWorstDivisionTiers = (
  seasons: SeasonBreakdown[]
): {
  bestDivisionTier: DivisionTier | null;
  worstDivisionTier: DivisionTier | null;
} => {
  const divisionTotals = {
    competitive: { wins: 0, losses: 0 },
    intermediate: { wins: 0, losses: 0 },
    recreational: { wins: 0, losses: 0 },
  };

  for (const season of seasons) {
    for (const tier of ['competitive', 'intermediate', 'recreational'] as const) {
      divisionTotals[tier].wins += season.divisionRecords[tier].wins;
      divisionTotals[tier].losses += season.divisionRecords[tier].losses;
    }
  }

  const tiers: DivisionTier[] = ['competitive', 'intermediate', 'recreational'];
  const tiersWithGames = tiers.filter(
    (tier) => divisionTotals[tier].wins + divisionTotals[tier].losses > 0
  );

  let bestDivisionTier: DivisionTier | null = null;
  let worstDivisionTier: DivisionTier | null = null;

  if (tiersWithGames.length > 0) {
    bestDivisionTier = tiersWithGames.reduce((best, tier) =>
      getWinRate(divisionTotals[tier]) > getWinRate(divisionTotals[best]) ? tier : best
    );
    worstDivisionTier = tiersWithGames.reduce((worst, tier) =>
      getWinRate(divisionTotals[tier]) < getWinRate(divisionTotals[worst]) ? tier : worst
    );
  }

  return { bestDivisionTier, worstDivisionTier };
};

export interface MatchProcessingResult {
  sweeps: number;
  closeWins: number;
  closeLosses: number;
  divisionRecords: DivisionRecords;
  playoffWins: number;
  playoffLosses: number;
}

/** Processes regular season and playoff match rows into per-season breakdown metrics. */
export const processSeasonMatches = (
  teamId: string,
  seasonId: string,
  seasonMatches: MatchRecord[],
  seasonPlayoffMatches: PlayoffMatchRecord[],
  teamDivisionMap: Map<string, string>
): MatchProcessingResult => {
  const counters = {
    sweeps: 0,
    closeWins: 0,
    closeLosses: 0,
    playoffWins: 0,
    playoffLosses: 0,
  };
  const divisionRecords = createEmptyDivisionRecords();

  processRegularSeasonMatches(
    teamId,
    seasonId,
    seasonMatches,
    teamDivisionMap,
    counters,
    divisionRecords
  );
  processPlayoffMatches(teamId, seasonPlayoffMatches, counters, divisionRecords);

  return {
    ...counters,
    divisionRecords,
  };
};
