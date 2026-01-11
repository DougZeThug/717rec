import { ArchivedMatchData, MatchData, PlayoffMatchData, SweepRateResult } from './types';

interface SweepRateInput {
  regularMatches: (MatchData | ArchivedMatchData)[];
  playoffMatches: PlayoffMatchData[] | null;
  teamId: string;
  totalMatches: number;
}

/**
 * Calculates career sweep rate (percentage of matches won 2-0).
 * Counts sweeps from regular matches and playoff matches.
 */
export const calculateSweepRate = ({
  regularMatches,
  playoffMatches,
  teamId,
  totalMatches,
}: SweepRateInput): SweepRateResult => {
  let career_sweeps = 0;

  // Count sweeps from regular matches (2-0 wins)
  for (const match of regularMatches) {
    if (match.winner_id !== teamId) continue;

    // Skip if game wins data is missing
    if (
      match.team1_game_wins === undefined ||
      match.team1_game_wins === null ||
      match.team2_game_wins === undefined ||
      match.team2_game_wins === null
    ) {
      continue;
    }

    const team1GameWins = match.team1_game_wins;
    const team2GameWins = match.team2_game_wins;

    // Check if this was a 2-0 sweep
    if (match.team1_id === teamId && team1GameWins === 2 && team2GameWins === 0) {
      career_sweeps++;
    } else if (match.team2_id === teamId && team2GameWins === 2 && team1GameWins === 0) {
      career_sweeps++;
    }
  }

  // Count sweeps from playoff matches (using team1_score/team2_score)
  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (match.winner_id !== teamId) continue;

      // Skip if score data is missing
      if (
        match.team1_score === undefined ||
        match.team1_score === null ||
        match.team2_score === undefined ||
        match.team2_score === null
      ) {
        continue;
      }

      const team1Score = match.team1_score;
      const team2Score = match.team2_score;

      // Check if this was a 2-0 sweep
      if (match.team1_id === teamId && team1Score === 2 && team2Score === 0) {
        career_sweeps++;
      } else if (match.team2_id === teamId && team2Score === 2 && team1Score === 0) {
        career_sweeps++;
      }
    }
  }

  const career_sweep_rate = totalMatches > 0 ? (career_sweeps / totalMatches) * 100 : 0;

  return {
    career_sweeps,
    career_sweep_rate,
  };
};
