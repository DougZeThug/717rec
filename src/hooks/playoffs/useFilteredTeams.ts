
import { useMemo } from "react";
import type { Team } from "@/types";

export const useFilteredTeams = (
  allTeams: Team[],
  divisionFilter: string | null,
) => {
  return useMemo(() => {
    // Handle empty or null division filter
    if (!divisionFilter || !allTeams || !Array.isArray(allTeams)) {
      return allTeams || [];
    }

    try {
      // Filter by division ID first (preferred method)
      const filteredByDivisionId = allTeams.filter((team) => {
        if (!team) return false;
        return team.division_id === divisionFilter;
      });

      // If we found teams by division ID, return them
      if (filteredByDivisionId.length > 0) {
        return filteredByDivisionId;
      }

      // Fallback: filter by division name for backward compatibility
      const filteredByDivisionName = allTeams.filter((team) => {
        if (!team) return false;
        return team.divisionName === divisionFilter;
      });

      return filteredByDivisionName;
    } catch (error) {
      console.error("Error filtering teams by division:", error);
      return allTeams || [];
    }
  }, [allTeams, divisionFilter]);
};
