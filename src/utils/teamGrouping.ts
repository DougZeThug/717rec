
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
