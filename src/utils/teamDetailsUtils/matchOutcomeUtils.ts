import { Match } from '@/types';

export interface ClutchRecord {
  clutchWins: number;
  clutchLosses: number;
  game3Matches: number;
  clutchWinPct: number;
}

/**
 * Calculates clutch record: W-L in matches that went to a decisive game 3.
 * A game-3 match = completed match where team1_game_wins + team2_game_wins === 3.
 */
export const calculateClutchRecord = (
  teamId: string,
  matches: Match[] | undefined
): ClutchRecord => {
  if (!matches || matches.length === 0) {
    return { clutchWins: 0, clutchLosses: 0, game3Matches: 0, clutchWinPct: 0 };
  }

  let clutchWins = 0;
  let clutchLosses = 0;

  const teamMatches = matches.filter(
    (match) =>
      match.iscompleted &&
      (match.team1Id === teamId || match.team2Id === teamId) &&
      match.team1_game_wins !== undefined &&
      match.team2_game_wins !== undefined
  );

  teamMatches.forEach((match) => {
    const totalGames = (match.team1_game_wins || 0) + (match.team2_game_wins || 0);

    // Only count matches that went to game 3
    if (totalGames !== 3) return;

    if (match.winnerId === teamId) {
      clutchWins++;
    } else if (match.loserId === teamId) {
      clutchLosses++;
    }
  });

  const game3Matches = clutchWins + clutchLosses;
  return {
    clutchWins,
    clutchLosses,
    game3Matches,
    clutchWinPct: game3Matches > 0 ? (clutchWins / game3Matches) * 100 : 0,
  };
};
