
import { useMemo } from "react";
import type { Team } from "@/types";

export const useFilteredTeams = (
  allTeams: Team[],
  displayDivisionFilter: string | null,
) => {
  return useMemo(() => {
    // Handle empty or null display division filter
    if (!displayDivisionFilter || !allTeams || !Array.isArray(allTeams)) {
      return allTeams || [];
    }

    try {
      // Filter by display division (team.divisionName contains the display_division)
      const filteredByDisplayDivision = allTeams.filter((team) => {
        if (!team || !team.divisionName) return false;
        return team.divisionName === displayDivisionFilter;
      });

      return filteredByDisplayDivision;
    } catch (error) {
      console.error("Error filtering teams by display division:", error);
      return allTeams || [];
    }
  }, [allTeams, displayDivisionFilter]);
};
