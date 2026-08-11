import { Match } from '@/types';

/**
 * Chronological rank of a match, newest last.
 *
 * Callers that mix in matches without a usable date (playoff matches have none)
 * set `orderKey` explicitly to pin the order; everything else sorts by date, with
 * a missing date sorting oldest.
 */
const orderOf = (match: Match): number =>
  match.orderKey ?? (match.date ? new Date(match.date).getTime() : 0);

/**
 * Calculate the current streak for a team
 */
export const calculateStreak = (teamId: string, allMatches: Match[] | undefined) => {
  if (!teamId || !allMatches || allMatches.length === 0) return undefined;

  // Filter to completed matches for this team, excluding ties (winnerId is null)
  const teamMatches = allMatches
    .filter(
      (match) =>
        match?.iscompleted &&
        match.winnerId != null &&
        (match.team1Id === teamId || match.team2Id === teamId)
    )
    .sort((a, b) => orderOf(b) - orderOf(a));

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
