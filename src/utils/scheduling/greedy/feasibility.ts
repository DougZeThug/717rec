import { Team } from '@/types';
import { canPlay } from './constraints';
import { RelaxationLevel } from './types';

/**
 * Analyze if a valid pairing is feasible with current constraints
 * Returns the recommended relaxation level needed
 */
export function analyzeGreedyFeasibility(
  teams: Team[],
  playedSet: Set<string>,
  tonightPairs: Set<string>,
  maxTierGap: number
): { isFeasible: boolean; recommendedLevel: RelaxationLevel; atRiskTeams: string[] } {
  const targetMatchesPerTeam = 2;
  const atRiskTeams: string[] = [];

  // For each team, count how many valid opponents they have
  for (const team of teams) {
    let validOpponents = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 0)) {
        validOpponents++;
      }
    }
    // Each team needs at least 2 valid opponents for 2 matches
    // (since opponents get "used up" by other teams, we need some buffer)
    if (validOpponents < targetMatchesPerTeam) {
      atRiskTeams.push(team.id);
    }
  }

  if (atRiskTeams.length === 0) {
    return { isFeasible: true, recommendedLevel: 0, atRiskTeams: [] };
  }

  // Check if relaxing tier constraints would help (level 1 — relax first)
  let wouldHelpWithTier = false;
  for (const teamId of atRiskTeams) {
    const team = teams.find((t) => t.id === teamId)!;
    let validWithTier = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 1)) {
        validWithTier++;
      }
    }
    if (validWithTier >= targetMatchesPerTeam) {
      wouldHelpWithTier = true;
      break;
    }
  }

  if (wouldHelpWithTier) {
    return { isFeasible: false, recommendedLevel: 1, atRiskTeams };
  }

  // Check if relaxing season rematches would help (level 2 — relax last)
  let wouldHelpWithRematch = false;
  for (const teamId of atRiskTeams) {
    const team = teams.find((t) => t.id === teamId)!;
    let validWithRematch = 0;
    for (const other of teams) {
      if (other.id !== team.id && canPlay(team, other, playedSet, tonightPairs, maxTierGap, 2)) {
        validWithRematch++;
      }
    }
    if (validWithRematch >= targetMatchesPerTeam) {
      wouldHelpWithRematch = true;
      break;
    }
  }

  if (wouldHelpWithRematch) {
    return { isFeasible: false, recommendedLevel: 2, atRiskTeams };
  }

  // Full relaxation needed
  return { isFeasible: false, recommendedLevel: 3, atRiskTeams };
}
