export const liveScoringKeys = {
  liveMatch: (matchId: string) => ['live-match', matchId] as const,
  /**
   * Names the round save so it can be found in the mutation cache while it is
   * parked offline. Without a key there is no way to count what is waiting.
   */
  submitRound: (matchId: string) => ['live-round-save', matchId] as const,
  teamPlayers: (teamId: string) => ['team-players', teamId] as const,
  playerMatchStats: (matchId: string) => ['player-match-stats', matchId] as const,
  teamPlayerSeasonStats: (teamId: string, seasonId: string) =>
    ['player-season-stats', teamId, seasonId] as const,
};
