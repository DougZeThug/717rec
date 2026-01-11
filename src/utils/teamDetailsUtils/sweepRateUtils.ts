import { Match } from '@/types';

export const calculateSweepRate = (teamId: string, matches: Match[] | undefined) => {
  if (!matches || matches.length === 0) {
    return {
      sweeps: 0,
      totalMatches: 0,
      sweepRate: 0,
    };
  }

  // Filter for completed matches involving this team
  const completedMatches = matches.filter(
    (match) => match.iscompleted && (match.team1Id === teamId || match.team2Id === teamId)
  );

  const totalMatches = completedMatches.length;

  if (totalMatches === 0) {
    return {
      sweeps: 0,
      totalMatches: 0,
      sweepRate: 0,
    };
  }

  // Filter for matches where this team won
  const wins = completedMatches.filter((match) => match.winnerId === teamId);

  // Count sweeps (2-0 wins where opponent got 0 game wins)
  const sweeps = wins.filter((match) => {
    // Skip if game wins data is missing
    if (match.team1_game_wins === undefined || match.team2_game_wins === undefined) {
      return false;
    }

    // Check if this was a 2-0 sweep from the team's perspective
    if (match.team1Id === teamId) {
      // Team won as team1, check if team2 got 0 game wins
      return match.team2_game_wins === 0 && match.team1_game_wins === 2;
    } else if (match.team2Id === teamId) {
      // Team won as team2, check if team1 got 0 game wins
      return match.team1_game_wins === 0 && match.team2_game_wins === 2;
    }

    return false;
  }).length;

  const sweepRate = (sweeps / totalMatches) * 100;

  return {
    sweeps,
    totalMatches,
    sweepRate,
  };
};
