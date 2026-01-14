import { useCallback, useMemo, useState } from 'react';
import { getHistoryDivisionOrder } from '@/utils/historyDivisionUtils';

export interface EditableTeam {
  team_id: string;
  season_id: string;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
  division_name: string;
  playoff_rank: number | null;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
}

interface UseHistoryEditingProps {
  initialTeams: EditableTeam[];
  seasonId: string;
}

interface UseHistoryEditingReturn {
  teams: EditableTeam[];
  divisions: string[];
  moveTeam: (teamId: string, toDivision: string, newIndex: number) => void;
  reorderTeamInDivision: (divisionName: string, oldIndex: number, newIndex: number) => void;
  addDivision: (name: string) => void;
  renameDivision: (oldName: string, newName: string) => void;
  removeDivision: (name: string) => boolean;
  getTeamsByDivision: (divisionName: string) => EditableTeam[];
  hasChanges: boolean;
  getChanges: () => EditableTeam[];
  resetChanges: () => void;
}

export const useHistoryEditing = ({
  initialTeams,
  seasonId: _seasonId,
}: UseHistoryEditingProps): UseHistoryEditingReturn => {
  // Local state for teams being edited
  const [teams, setTeams] = useState<EditableTeam[]>(() =>
    initialTeams.map((t) => ({
      ...t,
      division_name: t.division_name || 'Uncategorized',
    }))
  );

  // Track original state to detect changes
  const [originalTeams] = useState<EditableTeam[]>(() =>
    initialTeams.map((t) => ({
      ...t,
      division_name: t.division_name || 'Uncategorized',
    }))
  );

  // Track custom divisions (ones that don't have any teams yet)
  const [customDivisions, setCustomDivisions] = useState<string[]>([]);

  // Get all unique division names
  const divisions = useMemo(() => {
    const teamDivisions = new Set(teams.map((t) => t.division_name));
    customDivisions.forEach((d) => teamDivisions.add(d));
    // Sort by proper division order: Competitive → Intermediate → Recreational
    return Array.from(teamDivisions).sort((a, b) => {
      return getHistoryDivisionOrder(a) - getHistoryDivisionOrder(b);
    });
  }, [teams, customDivisions]);

  // Get teams for a specific division, sorted by playoff_rank
  const getTeamsByDivision = useCallback(
    (divisionName: string): EditableTeam[] => {
      return teams
        .filter((t) => t.division_name === divisionName)
        .sort((a, b) => {
          if (a.playoff_rank !== null && b.playoff_rank !== null) {
            return a.playoff_rank - b.playoff_rank;
          }
          if (a.playoff_rank !== null) return -1;
          if (b.playoff_rank !== null) return 1;
          return b.match_wins - a.match_wins;
        });
    },
    [teams]
  );

  // Move a team to a different division at a specific position
  const moveTeam = useCallback((teamId: string, toDivision: string, newIndex: number) => {
    setTeams((prev) => {
      const updated = prev.map((t) => {
        if (t.team_id === teamId) {
          return { ...t, division_name: toDivision };
        }
        return t;
      });

      // Recalculate playoff_rank for the target division
      const divisionTeams = updated
        .filter((t) => t.division_name === toDivision)
        .sort((a, b) => {
          if (a.team_id === teamId) return 0; // Will be repositioned
          if (a.playoff_rank !== null && b.playoff_rank !== null) {
            return a.playoff_rank - b.playoff_rank;
          }
          if (a.playoff_rank !== null) return -1;
          if (b.playoff_rank !== null) return 1;
          return b.match_wins - a.match_wins;
        });

      // Find and move the team to the correct position
      const teamIndex = divisionTeams.findIndex((t) => t.team_id === teamId);
      if (teamIndex !== -1 && teamIndex !== newIndex) {
        const [movedTeam] = divisionTeams.splice(teamIndex, 1);
        divisionTeams.splice(newIndex, 0, movedTeam);
      }

      // Assign new playoff_rank based on position
      const teamIdToRank = new Map<string, number>();
      divisionTeams.forEach((t, idx) => {
        teamIdToRank.set(t.team_id, idx + 1);
      });

      return updated.map((t) => {
        if (t.division_name === toDivision) {
          const newRank = teamIdToRank.get(t.team_id);
          return { ...t, playoff_rank: newRank ?? t.playoff_rank };
        }
        return t;
      });
    });
  }, []);

  // Reorder teams within the same division
  const reorderTeamInDivision = useCallback(
    (divisionName: string, oldIndex: number, newIndex: number) => {
      setTeams((prev) => {
        // Get current division teams in order
        const divisionTeams = prev
          .filter((t) => t.division_name === divisionName)
          .sort((a, b) => {
            if (a.playoff_rank !== null && b.playoff_rank !== null) {
              return a.playoff_rank - b.playoff_rank;
            }
            if (a.playoff_rank !== null) return -1;
            if (b.playoff_rank !== null) return 1;
            return b.match_wins - a.match_wins;
          });

        // Reorder
        const [movedTeam] = divisionTeams.splice(oldIndex, 1);
        divisionTeams.splice(newIndex, 0, movedTeam);

        // Create a map of team_id to new rank
        const teamIdToRank = new Map<string, number>();
        divisionTeams.forEach((t, idx) => {
          teamIdToRank.set(t.team_id, idx + 1);
        });

        // Update all teams in this division with new ranks
        return prev.map((t) => {
          if (t.division_name === divisionName) {
            const newRank = teamIdToRank.get(t.team_id);
            return { ...t, playoff_rank: newRank ?? t.playoff_rank };
          }
          return t;
        });
      });
    },
    []
  );

  // Add a new empty division
  const addDivision = useCallback((name: string) => {
    setCustomDivisions((prev) => {
      if (prev.includes(name)) return prev;
      return [...prev, name];
    });
  }, []);

  // Rename a division (updates all teams in that division)
  const renameDivision = useCallback((oldName: string, newName: string) => {
    if (oldName === newName) return;

    setTeams((prev) =>
      prev.map((t) => {
        if (t.division_name === oldName) {
          return { ...t, division_name: newName };
        }
        return t;
      })
    );

    // Also update custom divisions if applicable
    setCustomDivisions((prev) =>
      prev.map((d) => (d === oldName ? newName : d)).filter((d, i, arr) => arr.indexOf(d) === i)
    );
  }, []);

  // Remove an empty division
  const removeDivision = useCallback(
    (name: string): boolean => {
      const teamsInDivision = teams.filter((t) => t.division_name === name);
      if (teamsInDivision.length > 0) {
        return false; // Can't remove division with teams
      }

      setCustomDivisions((prev) => prev.filter((d) => d !== name));
      return true;
    },
    [teams]
  );

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    if (teams.length !== originalTeams.length) return true;

    for (const team of teams) {
      const original = originalTeams.find((t) => t.team_id === team.team_id);
      if (!original) return true;
      if (team.division_name !== original.division_name) return true;
      if (team.playoff_rank !== original.playoff_rank) return true;
    }

    return customDivisions.length > 0;
  }, [teams, originalTeams, customDivisions]);

  // Get all teams that have changed
  const getChanges = useCallback((): EditableTeam[] => {
    return teams.filter((team) => {
      const original = originalTeams.find((t) => t.team_id === team.team_id);
      if (!original) return true;
      return (
        team.division_name !== original.division_name || team.playoff_rank !== original.playoff_rank
      );
    });
  }, [teams, originalTeams]);

  // Reset all changes
  const resetChanges = useCallback(() => {
    setTeams(
      originalTeams.map((t) => ({
        ...t,
        division_name: t.division_name || 'Uncategorized',
      }))
    );
    setCustomDivisions([]);
  }, [originalTeams]);

  return {
    teams,
    divisions,
    moveTeam,
    reorderTeamInDivision,
    addDivision,
    renameDivision,
    removeDivision,
    getTeamsByDivision,
    hasChanges,
    getChanges,
    resetChanges,
  };
};
