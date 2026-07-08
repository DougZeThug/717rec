export const liveScoringKeys = {
  liveMatch: (matchId: string) => ['live-match', matchId] as const,
  teamPlayers: (teamId: string) => ['team-players', teamId] as const,
  playerMatchStats: (matchId: string) => ['player-match-stats', matchId] as const,
  teamPlayerSeasonStats: (teamId: string, seasonId: string) =>
    ['player-season-stats', teamId, seasonId] as const,
};
