
import { Team } from '@/types';
import { getDisplayDivision } from '@/styles/design-system/divisions';

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
 * This groups "Competitive" and "Competitive High" together under "Competitive"
 */
export function groupTeamsByDisplayDivision(teams: Team[], divisions: any[]): Record<string, Team[]> {
  return teams.reduce<Record<string, Team[]>>((acc, team) => {
    // Find the division details to get display_division
    const division = divisions.find(d => d.id === team.division_id);
    const displayDivision = division?.display_division || getDisplayDivision(team.divisionName || '');
    
    if (!acc[displayDivision]) {
      acc[displayDivision] = [];
    }
    
    acc[displayDivision].push(team);
    return acc;
  }, {});
}
