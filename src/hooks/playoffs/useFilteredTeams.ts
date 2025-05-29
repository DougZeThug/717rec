
import { useMemo } from "react";
import type { Team } from "@/types";

export const useFilteredTeams = (
  allTeams: Team[],
  divisionName: string | null,
) =>
  useMemo(
    () =>
      divisionName
        ? allTeams.filter((t) => t.divisionName === divisionName)
        : allTeams,
    [allTeams, divisionName],
  );
