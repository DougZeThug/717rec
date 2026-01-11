import { getDisplayDivision } from '@/styles/design-system/divisions';
import { Team } from '@/types';

export function groupTeamsByDivision(teams: Team[]): Record<string, Team[]> {
  return teams.reduce<Record<string, Team[]>>((acc, team) => {
    // Use division_id first, fallback to division, then 'unassigned'
    const divisionId = team.division_id ?? team.division ?? 'unassigned';

    if (!acc[divisionId]) {
      acc[divisionId] = [];
    }

    acc[divisionId].push(team);
    return acc;
  }, {});
}

/**
 * Group teams by their display division for visual consistency
 * This groups teams with the same display_division together (e.g., "Competitive" and "Competitive High" both show under "Competitive")
 * Now uses the divisionName field which contains the display_division from the database
 */
export function groupTeamsByDisplayDivision(
  teams: Team[],
  divisions: any[]
): Record<string, Team[]> {
  return teams.reduce<Record<string, Team[]>>((acc, team) => {
    // Use divisionName from team which now contains display_division from v_team_details
    // Fall back to division lookup if needed, then to a computed display division
    let displayDivision = team.divisionName;

    if (!displayDivision) {
      // Fallback: find the division details to get display_division
      const division = divisions.find((d) => d.id === team.division_id);
      displayDivision = division?.display_division || getDisplayDivision(team.divisionName || '');
    }

    // Skip teams in the "Hidden" division - they should not appear in the frontend
    if (displayDivision === 'Hidden') {
      return acc;
    }

    if (!acc[displayDivision]) {
      acc[displayDivision] = [];
    }

    acc[displayDivision].push(team);
    return acc;
  }, {});
}
