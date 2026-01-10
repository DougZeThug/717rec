/**
 * Utility functions for handling mixed seed assignment (manual + automatic)
 */

interface TeamWithSeed {
  id: string;
  name: string;
  seed?: number | null;
  power_score?: number | null;
  win_percentage?: number | null;
  finalSeed: number;
  [key: string]: any;
}

/**
 * Assigns seeds to teams handling both manual overrides and automatic assignment
 * @param teams - Array of teams with potential manual seeds
 * @returns Array of teams with finalSeed assigned
 */
export const assignMixedSeeds = (teams: any[]): TeamWithSeed[] => {
  if (!teams || teams.length === 0) return [];

  // Separate teams with manual seeds from those without
  const teamsWithManualSeeds: TeamWithSeed[] = [];
  const teamsWithoutSeeds: TeamWithSeed[] = [];

  teams.forEach((team) => {
    const teamWithSeed: TeamWithSeed = {
      ...team,
      finalSeed: 0, // Will be set below
    };

    if (team.seed && typeof team.seed === 'number' && team.seed > 0) {
      // Team has manual seed
      teamWithSeed.finalSeed = team.seed;
      teamsWithManualSeeds.push(teamWithSeed);
    } else {
      // Team needs automatic seed
      teamsWithoutSeeds.push(teamWithSeed);
    }
  });

  // Sort teams without seeds by ranking (already sorted by caller)
  teamsWithoutSeeds.sort((a, b) => {
    const aPowerScore = a.power_score;
    const bPowerScore = b.power_score;

    // Handle NULL power scores - put them at the end
    if (aPowerScore === null && bPowerScore === null) {
      const aWinPct = a.win_percentage || 0;
      const bWinPct = b.win_percentage || 0;
      if (bWinPct !== aWinPct) return bWinPct - aWinPct;
      return (a.name || '').localeCompare(b.name || '');
    }
    if (aPowerScore === null) return 1;
    if (bPowerScore === null) return -1;

    // Both have power scores, sort normally (descending)
    if (bPowerScore !== aPowerScore) return bPowerScore - aPowerScore;

    const aWinPct = a.win_percentage || 0;
    const bWinPct = b.win_percentage || 0;
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;

    return (a.name || '').localeCompare(b.name || '');
  });

  // Find available seed slots (not used by manual seeds)
  const usedSeeds = new Set(teamsWithManualSeeds.map((team) => team.finalSeed));
  const availableSeeds: number[] = [];

  for (let i = 1; i <= teams.length; i++) {
    if (!usedSeeds.has(i)) {
      availableSeeds.push(i);
    }
  }

  // Assign available seeds to teams without manual seeds
  teamsWithoutSeeds.forEach((team, index) => {
    if (index < availableSeeds.length) {
      team.finalSeed = availableSeeds[index];
    } else {
      // Fallback: assign next available number
      team.finalSeed = teams.length + index + 1;
    }
  });

  // Combine all teams and sort by final seed
  const allTeams = [...teamsWithManualSeeds, ...teamsWithoutSeeds];
  return allTeams.sort((a, b) => a.finalSeed - b.finalSeed);
};
