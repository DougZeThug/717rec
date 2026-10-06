import { ArchivedMatchData, MatchData, PlayoffMatchData, SweepRateResult } from './types';

interface SweepRateInput {
  regularMatches: (MatchData | ArchivedMatchData)[];
  playoffMatches: PlayoffMatchData[] | null;
  teamId: string;
  totalMatches: number;
}

interface SweepCandidate {
  winner_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
}

/**
 * True when `teamId` won this match 2-0. Matches with missing game counts are
 * skipped. Regular matches pass game wins; playoff matches pass scores.
 */
const isSweepWin = (
  match: SweepCandidate,
  teamId: string,
  team1Games: number | null | undefined,
  team2Games: number | null | undefined
): boolean => {
  if (match.winner_id !== teamId) return false;
  if (typeof team1Games !== 'number' || typeof team2Games !== 'number') return false;

  return (
    (match.team1_id === teamId && team1Games === 2 && team2Games === 0) ||
    (match.team2_id === teamId && team2Games === 2 && team1Games === 0)
  );
};

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
  // Regular matches use game wins; playoff matches use team1_score/team2_score.
  const regularSweeps = regularMatches.filter((match) =>
    isSweepWin(match, teamId, match.team1_game_wins, match.team2_game_wins)
  ).length;
  const playoffSweeps = (playoffMatches ?? []).filter((match) =>
    isSweepWin(match, teamId, match.team1_score, match.team2_score)
  ).length;

  const career_sweeps = regularSweeps + playoffSweeps;
  const career_sweep_rate = totalMatches > 0 ? (career_sweeps / totalMatches) * 100 : 0;

  return {
    career_sweeps,
    career_sweep_rate,
  };
};
