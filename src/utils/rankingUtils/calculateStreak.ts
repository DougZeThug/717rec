import { Match } from '@/types';

/**
 * Calculate the current streak for a team
 */
export const calculateStreak = (teamId: string, allMatches: Match[] | undefined) => {
  if (!teamId || !allMatches || allMatches.length === 0) return undefined;

  // Filter to completed matches for this team, excluding ties (winnerId is null)
  const teamMatches = allMatches
    .filter(
      (match) =>
        match &&
        match.iscompleted &&
        match.winnerId !== null &&
        (match.team1Id === teamId || match.team2Id === teamId)
    )
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

  if (teamMatches.length === 0) return undefined;

  let streakCount = 1;
  const isWin = teamMatches[0].winnerId === teamId;

  for (let i = 1; i < teamMatches.length; i++) {
    const match = teamMatches[i];
    if (!match) continue;

    const currentIsWin = match.winnerId === teamId;

    if (currentIsWin === isWin) {
      streakCount++;
    } else {
      break;
    }
  }

  return isWin ? `W${streakCount}` : `L${streakCount}`;
};
