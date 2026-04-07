import { Team } from '@/types';
import { canPlay } from './constraints';
import { RelaxationLevel } from './types';

/**
 * Pick a bye team for odd-team nights
 */
export function pickBye(
  teams: Team[],
  strategy: 'last' | 'fewestPartners',
  playedSet: Set<string>,
  maxTierGap: number,
  excludeIds: Set<string> = new Set(),
  relaxationLevel: RelaxationLevel = 0
): Team {
  const availableTeams = teams.filter((t) => !excludeIds.has(t.id));

  if (strategy === 'last') {
    return availableTeams[availableTeams.length - 1];
  }

  // 'fewestPartners' strategy: pick team with fewest valid opponents
  let minPartners = Infinity;
  let byeTeam = availableTeams[0];

  for (const team of availableTeams) {
    const validPartners = availableTeams.filter(
      (other) =>
        other.id !== team.id &&
        !excludeIds.has(other.id) &&
        canPlay(team, other, playedSet, new Set(), maxTierGap, relaxationLevel)
    ).length;

    if (validPartners < minPartners) {
      minPartners = validPartners;
      byeTeam = team;
    }
  }

  return byeTeam;
}
