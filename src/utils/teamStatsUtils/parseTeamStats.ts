export const parseTeamStats = (team: any) => {
  return {
    wins: parseInt(String(team.wins ?? 0)),
    losses: parseInt(String(team.losses ?? 0)),
    gameWins: parseInt(String(team.game_wins ?? 0)),
    gameLosses: parseInt(String(team.game_losses ?? 0)),
  };
};
