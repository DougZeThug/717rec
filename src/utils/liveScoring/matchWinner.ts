/**
 * The winning team's name for a match, preferring the result the server has
 * recorded over the one the scoreboard has worked out.
 */
export const resolveWinnerName = (
  winnerSide: 1 | 2 | null,
  team1Name: string,
  team2Name: string
): string | null => {
  if (winnerSide === 1) return team1Name;
  if (winnerSide === 2) return team2Name;
  return null;
};

export const resolveOfficialWinnerName = (
  winnerId: string | null,
  team1Id: string | null,
  team2Id: string | null,
  team1Name: string,
  team2Name: string,
  fallback: string | null
): string | null => {
  if (winnerId && winnerId === team1Id) return team1Name;
  if (winnerId && winnerId === team2Id) return team2Name;
  return fallback;
};

interface CompletedGameLine {
  gameNumber: number;
  team1Total: number;
  team2Total: number;
  /** Null when the game records no winner. Never guess a side in its place. */
  winnerName: string | null;
}

interface DerivedGame {
  game: { game_number: number; status: string; winner_team_id: string | null };
  totals: { team1: number; team2: number };
}

/**
 * One line per finished game, for the "save the official result" summary.
 *
 * A finished game can carry no winner: the live-scoring migration marked legacy
 * game rows on completed matches as completed without filling winner_team_id,
 * and winner_team_id is ON DELETE SET NULL, so removing a team empties it on
 * games already played. Those games belong to neither side, which is how
 * finalize_live_match counts them, so the line says so rather than picking one.
 */
export const buildGameLines = (
  games: DerivedGame[],
  team1Id: string | null,
  team2Id: string | null,
  team1Name: string,
  team2Name: string
): CompletedGameLine[] =>
  games.reduce<CompletedGameLine[]>((lines, g) => {
    if (g.game.status === 'completed') {
      lines.push({
        gameNumber: g.game.game_number,
        team1Total: g.totals.team1,
        team2Total: g.totals.team2,
        winnerName: resolveOfficialWinnerName(
          g.game.winner_team_id,
          team1Id,
          team2Id,
          team1Name,
          team2Name,
          null
        ),
      });
    }
    return lines;
  }, []);
