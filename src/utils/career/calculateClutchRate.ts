import { ArchivedMatchData, MatchData, PlayoffMatchData } from './types';

interface ClutchRateInput {
  regularMatches: (MatchData | ArchivedMatchData)[];
  playoffMatches: PlayoffMatchData[] | null;
  teamId: string;
}

export interface CareerClutchResult {
  career_clutch_wins: number;
  career_clutch_game3s: number;
  career_clutch_win_pct: number;
}

/**
 * Calculates career clutch win rate (win percentage in matches that went to game 3).
 * A game-3 match = match where total games played = 3 (i.e., 2-1 result).
 */
export const calculateCareerClutchRate = ({
  regularMatches,
  playoffMatches,
  teamId,
}: ClutchRateInput): CareerClutchResult => {
  let clutchWins = 0;
  let game3s = 0;

  // Count from regular matches
  for (const match of regularMatches) {
    if (
      match.team1_game_wins === null ||
      match.team1_game_wins === undefined ||
      match.team2_game_wins === null ||
      match.team2_game_wins === undefined
    )
      continue;

    const total = match.team1_game_wins + match.team2_game_wins;
    if (total !== 3) continue;
    if (match.team1_id !== teamId && match.team2_id !== teamId) continue;

    game3s++;
    if (match.winner_id === teamId) clutchWins++;
  }

  // Count from playoff matches
  if (playoffMatches) {
    for (const match of playoffMatches) {
      if (
        match.team1_score === null ||
        match.team1_score === undefined ||
        match.team2_score === null ||
        match.team2_score === undefined
      )
        continue;

      const total = match.team1_score + match.team2_score;
      if (total !== 3) continue;
      if (match.team1_id !== teamId && match.team2_id !== teamId) continue;

      game3s++;
      if (match.winner_id === teamId) clutchWins++;
    }
  }

  return {
    career_clutch_wins: clutchWins,
    career_clutch_game3s: game3s,
    career_clutch_win_pct: game3s > 0 ? (clutchWins / game3s) * 100 : 0,
  };
};
