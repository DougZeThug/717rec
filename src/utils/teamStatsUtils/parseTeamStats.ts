interface TeamStatsInput {
  wins?: number | string | null;
  losses?: number | string | null;
  game_wins?: number | string | null;
  game_losses?: number | string | null;
}

export const parseTeamStats = (team: TeamStatsInput) => {
  return {
    wins: parseInt(String(team.wins ?? 0)),
    losses: parseInt(String(team.losses ?? 0)),
    gameWins: parseInt(String(team.game_wins ?? 0)),
    gameLosses: parseInt(String(team.game_losses ?? 0)),
  };
};
